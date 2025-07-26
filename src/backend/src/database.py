from neo4j import GraphDatabase
import os
import random
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from urllib.parse import urlparse
from .model import BankAccount, CryptoWallet, DigitalWallet, GamblingSiteData, PaymentGateway
logger = logging.getLogger(__name__)

class Neo4jHandler:
    def __init__(self):
        self.driver = None
        self.connected = False
        self._uri = None
        self._username = None
        self._password = None
    
    def _get_config(self):
        """Get Neo4j configuration lazily when needed"""
        if self._uri is None:
            self._uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
            self._username = os.getenv("NEO4J_USERNAME", "neo4j")
            self._password = os.getenv("NEO4J_PASSWORD", "your_password")
            
            if not self._password:
                # Log available environment variables for debugging
                neo4j_env_vars = {k: v for k, v in os.environ.items() if 'NEO4J' in k}
                logger.error(f"NEO4J_PASSWORD not found. Available Neo4j env vars: {neo4j_env_vars}")
                raise ValueError("NEO4J_PASSWORD environment variable must be set")
            
            logger.info(f"Neo4j configuration loaded: URI={self._uri}, Username={self._username}")
        
        return self._uri, self._username, self._password
        
    def connect(self, max_retries=10, retry_delay=5):
        import time
        
        try:
            uri, username, password = self._get_config()
        except ValueError as e:
            logger.error(f"Configuration error: {e}")
            return False
        
        for attempt in range(max_retries):
            try:
                self.driver = GraphDatabase.driver(
                    uri, 
                    auth=(username, password)
                )
                with self.driver.session() as session:
                    session.run("RETURN 1")
                self.connected = True
                logger.info(f"Berhasil terhubung ke database Neo4j pada percobaan ke-{attempt + 1}")
                return True
            except Exception as e:
                self.connected = False
                if attempt < max_retries - 1:
                    logger.warning(f"Percobaan {attempt + 1}/{max_retries} gagal terhubung ke Neo4j: {e}")
                    logger.info(f"Menunggu {retry_delay} detik sebelum mencoba lagi...")
                    time.sleep(retry_delay)
                else:
                    logger.error(f"Gagal terhubung ke Neo4j setelah {max_retries} percobaan: {e}")
                    logger.error(f"Final connection attempt failed with URI: {uri}, Username: {username}")
        
        return False
    
    def close(self):
        if self.driver:
            self.driver.close()
            self.connected = False
    
    def _check_connection(self):
        """Check if database is connected and accessible"""
        if not self.connected or not self.driver:
            return False
        try:
            with self.driver.session() as session:
                session.run("RETURN 1")
            return True
        except Exception as e:
            logger.warning(f"Database connection check failed: {e}")
            self.connected = False
            return False
    
    def _validate_site_info(self, site_info) -> bool:
        """Validate site info before insertion"""
        if not site_info.site_url or not site_info.site_url.strip():
            logger.warning("[VALIDATION] Site URL is null or empty, skipping site creation")
            return False
        if not site_info.site_name or not site_info.site_name.strip():
            logger.warning("[VALIDATION] Site name is null or empty, skipping site creation")
            return False
        return True
    
    def _validate_bank_account(self, account: BankAccount) -> bool:
        """Validate bank account before insertion"""
        if not account.account_number or not account.account_number.strip():
            logger.warning(f"[VALIDATION] Account number is null or empty, skipping account")
            return False
        if not account.bank_name or not account.bank_name.strip():
            logger.warning(f"[VALIDATION] Bank name is null or empty for account {account.account_number}, skipping")
            return False
        if not account.account_holder or not account.account_holder.strip():
            logger.warning(f"[VALIDATION] Account holder is null or empty for account {account.account_number}, skipping")
            return False
        return True
    
    def _validate_crypto_wallet(self, wallet: CryptoWallet) -> bool:
        """Validate crypto wallet before insertion"""
        if not wallet.wallet_address or not wallet.wallet_address.strip():
            logger.warning(f"[VALIDATION] Wallet address is null or empty, skipping wallet")
            return False
        if not wallet.cryptocurrency or not wallet.cryptocurrency.strip():
            logger.warning(f"[VALIDATION] Cryptocurrency type is null or empty for wallet {wallet.wallet_address}, skipping")
            return False
        return True
    
    def _validate_payment_gateway(self, gateway: PaymentGateway) -> bool:
        """Validate payment gateway before insertion"""
        if not gateway.gateway_name or not gateway.gateway_name.strip():
            logger.warning(f"[VALIDATION] Gateway name is null or empty, skipping payment gateway")
            return False
        return True

    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL, removing path and keeping only scheme + netloc"""
        try:
            parsed = urlparse(url)
            if parsed.netloc:
                # Return scheme + netloc (e.g., https://example.com)
                domain = f"{parsed.scheme}://{parsed.netloc}"
                logger.debug(f"[DOMAIN-EXTRACT] {url} -> {domain}")
                return domain
            else:
                # If parsing fails, return original URL
                logger.warning(f"[DOMAIN-EXTRACT] Could not parse URL: {url}")
                return url
        except Exception as e:
            logger.error(f"[DOMAIN-EXTRACT] Error parsing URL {url}: {e}")
            return url
    
    def create_indexes(self):
        if not self._check_connection():
            logger.warning("Skipping index creation - database not connected")
            return
            
        with self.driver.session() as session:
            queries = [
                "CREATE INDEX IF NOT EXISTS FOR (g:SitusJudi) ON (g.url)",
                "CREATE INDEX IF NOT EXISTS FOR (a:AkunMencurigakan) ON (a.nomor_rekening)",
                "CREATE INDEX IF NOT EXISTS FOR (c:CryptoWallet) ON (c.alamat_wallet)",
                "CREATE INDEX IF NOT EXISTS FOR (p:MetodePembayaran) ON (p.provider)",
                "CREATE INDEX IF NOT EXISTS FOR (g:SitusJudi) ON (g.waktu_ekstraksi)"
            ]
            
            for query in queries:
                try:
                    session.run(query)
                    logger.info(f"Index dibuat: {query}")
                except Exception as e:
                    logger.warning(f"Gagal buat index atau sudah ada: {e}")
    
    def store_gambling_site_data(self, data: GamblingSiteData) -> bool:
        if not self._check_connection():
            logger.error("[DB-ERROR] Cannot store data - database not connected")
            return False
        
        # Validate site info first
        if not self._validate_site_info(data.site_info):
            logger.error("[VALIDATION] Site info validation failed, aborting data storage")
            return False
        
        # Extract domain from the full URL to avoid duplicates with different paths
        site_domain = self._extract_domain(data.site_info.site_url)
        
        logger.info(f"[DB-START] Mulai menyimpan data untuk situs: {data.site_info.site_url}")
        logger.info(f"[DB-DOMAIN] Domain yang akan disimpan: {site_domain}")
        
        # Filter and validate data before processing
        valid_bank_accounts = [acc for acc in data.bank_accounts if self._validate_bank_account(acc)]
        valid_crypto_wallets = [wallet for wallet in data.crypto_wallets if self._validate_crypto_wallet(wallet)]
        valid_payment_gateways = [gateway for gateway in data.payment_gateways if self._validate_payment_gateway(gateway)]
        
        logger.info(f"[DB-INFO] Original counts - Accounts: {len(data.bank_accounts)}, Wallets: {len(data.crypto_wallets)}, Payments: {len(data.payment_gateways)}")
        logger.info(f"[DB-VALID] Valid counts - Accounts: {len(valid_bank_accounts)}, Wallets: {len(valid_crypto_wallets)}, Payments: {len(valid_payment_gateways)}")
        
        # Skip if no valid data to store
        if not valid_bank_accounts and not valid_crypto_wallets and not valid_payment_gateways:
            logger.warning(f"[VALIDATION] No valid data to store for site: {site_domain}")
            return False
    
            
        try:
            with self.driver.session() as session:
                logger.debug(f"[DB-SAVE] Menyimpan node SitusJudi untuk: {site_domain}")
            
                site_query = """
                MERGE (g:SitusJudi {url: $url})
                SET g.nama = $nama,
                    g.waktu_ekstraksi = $waktu,
                    g.original_url = $original_url
                WITH g, $site_language as site_language, $registration_success as registration_success, $accessibility_notes as accessibility_notes
                SET g.site_language = CASE WHEN site_language IS NOT NULL AND site_language <> '' THEN site_language ELSE g.site_language END,
                    g.registration_success = CASE WHEN registration_success IS NOT NULL THEN registration_success ELSE g.registration_success END,
                    g.accessibility_notes = CASE WHEN accessibility_notes IS NOT NULL AND accessibility_notes <> '' THEN accessibility_notes ELSE g.accessibility_notes END
                RETURN g
                """
                
                session.run(site_query, {
                    "url": site_domain,
                    "nama": data.site_info.site_name,
                    "waktu": datetime.now().isoformat(),
                    "original_url": data.site_info.site_url,
                    "site_language": data.site_info.site_language if data.site_info.site_language and data.site_info.site_language.strip() else None,
                    "registration_success": data.site_info.registration_success,
                    "accessibility_notes": data.site_info.accessibility_notes if data.site_info.accessibility_notes and data.site_info.accessibility_notes.strip() else None
                })
                logger.debug(f"[DB-SUCCESS] Node SitusJudi berhasil disimpan: {site_domain}")

                # Process suspicious accounts with detailed logging
                logger.debug(f"[DB-ACCOUNTS] Memproses {len(valid_bank_accounts)} akun mencurigakan yang valid...")
                for i, account in enumerate(valid_bank_accounts, 1):
                    try:
                        self._store_suspicious_account(session, site_domain, account)
                        logger.debug(f"[DB-ACCOUNT] {i}/{len(valid_bank_accounts)} - {account.account_number} ({account.bank_name})")
                    except Exception as e:
                        logger.error(f"[DB-ACCOUNT-FAILED] {i}/{len(valid_bank_accounts)} - {account.account_number}: {str(e)}")
                        raise
                # Process crypto wallets with detailed logging
                logger.debug(f"[DB-WALLETS] Memproses {len(valid_crypto_wallets)} crypto wallet yang valid...")
                for i, wallet in enumerate(valid_crypto_wallets, 1):
                    try:
                        self._store_crypto_wallet(session, site_domain, wallet)
                        logger.debug(f"[DB-WALLET] {i}/{len(valid_crypto_wallets)} - {wallet.wallet_address} ({wallet.cryptocurrency})")
                    except Exception as e:
                        logger.error(f"[DB-WALLET-FAILED] {i}/{len(valid_crypto_wallets)} - {wallet.wallet_address}: {str(e)}")
                        raise
                
                # Process payment methods with detailed logging
                # logger.debug(f"[DB-PAYMENTS] Memproses {len(valid_payment_gateways)} metode pembayaran yang valid...")
                # for i, payment in enumerate(valid_payment_gateways, 1):
                #     try:
                #         self._store_payment_method(session, site_domain, payment)
                #         logger.debug(f"[DB-PAYMENT] {i}/{len(valid_payment_gateways)} - {payment.gateway_name}")
                #     except Exception as e:
                #         logger.error(f"[DB-PAYMENT-FAILED] {i}/{len(valid_payment_gateways)} - {payment.gateway_name}: {str(e)}")
                #         # Continue processing other payments even if one fails
                #         continue
                
                logger.info(f"[DB-COMPLETE] BERHASIL simpan semua data untuk situs: {site_domain}")
                logger.info(f"[DB-SUMMARY] Tersimpan - Accounts: {len(valid_bank_accounts)}, Wallets: {len(valid_crypto_wallets)}, Payments: {len(valid_payment_gateways)}")
                return True
                
        except Exception as e:
            logger.error(f"[DB-CRITICAL-ERROR] GAGAL simpan data situs: {site_domain}")
            logger.error(f"[DB-ERROR-DETAIL] Error: {str(e)}")
            logger.error(f"[DB-ERROR-TYPE] Type: {type(e).__name__}")
            import traceback
            logger.error(f"[DB-TRACEBACK] {traceback.format_exc()}")
            return False
    
    def _store_suspicious_account(self, session, site_url: str, account: BankAccount):
        logger.debug(f"[DB-ACCOUNT-DETAIL] Storing account: {account.account_number} ({account.bank_name}) for site: {site_url}")
        
        account_query = """
        MATCH (g:SitusJudi {url: $site_url})
        MERGE (a:AkunMencurigakan {nomor_rekening: $nomor_rekening})
        SET a.jenis_akun = $jenis_akun,
            a.nama_bank = $nama_bank,
            a.pemilik_rekening = $pemilik_rekening,
            a.terakhir_update = $waktu
        WITH g, a, $bank_code as bank_code, $account_type_detail as account_type_detail,
             $min_deposit as min_deposit, $max_deposit as max_deposit, $processing_time as processing_time, $oss_key as oss_key
        SET a.bank_code = CASE WHEN bank_code IS NOT NULL AND bank_code <> '' THEN bank_code ELSE a.bank_code END,
            a.account_type_detail = CASE WHEN account_type_detail IS NOT NULL AND account_type_detail <> '' THEN account_type_detail ELSE a.account_type_detail END,
            a.min_deposit = CASE WHEN min_deposit IS NOT NULL THEN min_deposit ELSE a.min_deposit END,
            a.max_deposit = CASE WHEN max_deposit IS NOT NULL THEN max_deposit ELSE a.max_deposit END,
            a.processing_time = CASE WHEN processing_time IS NOT NULL AND processing_time <> '' THEN processing_time ELSE a.processing_time END,
            a.oss_key = CASE WHEN oss_key IS NOT NULL AND oss_key <> '' THEN oss_key ELSE a.oss_key END
        WITH g, a
        MERGE (g)-[:MENGGUNAKAN_REKENING]->(a)
        """
        
        try:
            session.run(account_query, {
                "site_url": site_url,
                "nomor_rekening": account.account_number,
                "jenis_akun": account.account_type.value,
                "nama_bank": account.bank_name,
                "pemilik_rekening": account.account_holder,
                "bank_code": account.bank_code if account.bank_code and account.bank_code.strip() else None,
                "account_type_detail": account.account_type_detail if account.account_type_detail and account.account_type_detail.strip() else None,
                "min_deposit": account.min_deposit,
                "max_deposit": account.max_deposit,
                "processing_time": account.processing_time if account.processing_time and account.processing_time.strip() else None,
                "oss_key": account.oss_key if account.oss_key and account.oss_key.strip() else None,
                "waktu": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"[DB-ACCOUNT-QUERY-FAILED] Neo4j query failed for account {account.account_number}: {str(e)}")
            raise
    
    def _store_crypto_wallet(self, session, site_url: str, wallet: CryptoWallet):
        logger.debug(f"[DB-WALLET-DETAIL] Storing wallet: {wallet.wallet_address} ({wallet.cryptocurrency}) for site: {site_url}")
        
        wallet_query = """
        MATCH (g:SitusJudi {url: $site_url})
        MERGE (c:CryptoWallet {alamat_wallet: $alamat_wallet})
        SET c.cryptocurrency = $cryptocurrency,
            c.terakhir_update = $waktu
        WITH c, $additional_info as additional_info
        SET c.additional_info = CASE WHEN additional_info IS NOT NULL AND additional_info <> '' THEN additional_info ELSE c.additional_info END
        WITH g, c
        MERGE (g)-[:MENGGUNAKAN_CRYPTO]->(c)
        """
        
        try:
            session.run(wallet_query, {
                "site_url": site_url,
                "alamat_wallet": wallet.wallet_address,
                "cryptocurrency": wallet.cryptocurrency,
                "additional_info": wallet.additional_info if wallet.additional_info and wallet.additional_info.strip() else None,
                "waktu": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"[DB-WALLET-QUERY-FAILED] Neo4j query failed for wallet {wallet.wallet_address}: {str(e)}")
            raise
    
    def _store_payment_method(self, session, site_url: str, payment: PaymentGateway):
        logger.debug(f"[DB-PAYMENT-DETAIL] Storing payment method: {payment.gateway_name} for site: {site_url}")
        
        payment_query = """
        MATCH (g:SitusJudi {url: $site_url})
        MERGE (p:MetodePembayaran {provider: $provider})
        SET p.terakhir_update = $waktu
        WITH p, $supported_methods as supported_methods, $processing_time as processing_time, $fees as fees
        SET p.supported_methods = CASE WHEN supported_methods IS NOT NULL AND size(supported_methods) > 0 THEN supported_methods ELSE p.supported_methods END,
            p.processing_time = CASE WHEN processing_time IS NOT NULL AND processing_time <> '' THEN processing_time ELSE p.processing_time END,
            p.fees = CASE WHEN fees IS NOT NULL AND fees <> '' THEN fees ELSE p.fees END
        WITH g, p
        MERGE (g)-[:MENERIMA_PEMBAYARAN]->(p)
        """
        
        try:
            # Filter out empty strings from supported_methods list
            supported_methods = [method for method in payment.supported_methods if method and method.strip()] if payment.supported_methods else []
            
            session.run(payment_query, {
                "site_url": site_url,
                "provider": payment.gateway_name,
                "supported_methods": supported_methods if supported_methods else None,
                "processing_time": payment.processing_time if payment.processing_time and payment.processing_time.strip() else None,
                "fees": payment.fees if payment.fees and payment.fees.strip() else None,
                "waktu": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"[DB-PAYMENT-QUERY-FAILED] Neo4j query failed for payment method {payment.gateway_name}: {str(e)}")
            raise
    

    def get_all_suspicious_accounts(self) -> List[dict]:
        if not self._check_connection():
            logger.error("Cannot query - database not connected")
            return []
            
        query = """
        MATCH (a:AkunMencurigakan)
        OPTIONAL MATCH (g:SitusJudi)-[:MENGGUNAKAN_REKENING]->(a)
        RETURN a, collect(g.url) as situs_judi
        ORDER BY a.terakhir_update DESC
        """
        
        try:
            with self.driver.session() as session:
                result = session.run(query)
                return [{"akun": record["a"], "situs_judi": record["situs_judi"]} 
                       for record in result]
        except Exception as e:
            logger.error(f"Error querying suspicious accounts: {e}")
            return []
    
    def get_gambling_site_networks(self) -> List[dict]:
        if not self._check_connection():
            logger.error("Cannot query - database not connected")
            return []
            
        query = """
        MATCH (g1:SitusJudi)-[:MENGGUNAKAN_REKENING]->(a:AkunMencurigakan)<-[:MENGGUNAKAN_REKENING]-(g2:SitusJudi)
        WHERE g1.url <> g2.url
        RETURN g1.url as situs1, g2.url as situs2, a.nomor_rekening as rekening_sama, a.nama_bank as bank
        ORDER BY a.nama_bank
        """
        
        try:
            with self.driver.session() as session:
                result = session.run(query)
                return [dict(record) for record in result]
        except Exception as e:
            logger.error(f"Error querying gambling networks: {e}")
            return []
    
    def get_site_statistics(self, site_url: str) -> dict:
        if not self._check_connection():
            logger.error("Cannot query - database not connected")
            return {}
            
        query = """
        MATCH (g:SitusJudi {url: $site_url})
        OPTIONAL MATCH (g)-[:MENGGUNAKAN_REKENING]->(a:AkunMencurigakan)
        OPTIONAL MATCH (g)-[:MENGGUNAKAN_CRYPTO]->(c:CryptoWallet)
        OPTIONAL MATCH (g)-[:MENERIMA_PEMBAYARAN]->(p:MetodePembayaran)
        RETURN g,
               count(DISTINCT a) as jumlah_rekening,
               count(DISTINCT c) as jumlah_crypto,
               count(DISTINCT p) as jumlah_payment,
               collect(DISTINCT a.nama_bank) as bank_list
        """
        
        try:
            with self.driver.session() as session:
                result = session.run(query, {"site_url": site_url})
                record = result.single()
                if record:
                    return {
                        "situs": dict(record["g"]),
                        "jumlah_rekening": record["jumlah_rekening"],
                        "jumlah_crypto": record["jumlah_crypto"],
                        "jumlah_payment": record["jumlah_payment"],
                        "bank_list": record["bank_list"]
                    }
                return {}
        except Exception as e:
            logger.error(f"Error querying site statistics: {e}")
            return {}
        

    def seed_test_data(self, num_nodes=100):
        if not self._check_connection():
            logger.warning("Cannot seed demo data - database not connected")
            return {"success": False, "error": "Database not connected"}
            
        logger.info("🎬 Starting DEMO database seeding with exactly 100 nodes...")
        
        # Specific OSS keys as requested
        demo_oss_keys = [
            "MOH_IKHSAN",
            "DEWI_LESTARI", 
            "DWI_YULIANA_PERMATASARI",
            "MOHAMAD_ADE",
            "EMI_SARPONIKA"
        ]
        
        # 4 different gambling websites for clustering (reduced from 6)
        gambling_websites = [
            {"url": "https://judolbola88.com", "name": "JudolBola88"},
            {"url": "https://slotgacor99.net", "name": "SlotGacor99"},
            {"url": "https://togelking777.id", "name": "TogelKing777"},
            {"url": "https://casinolive123.co", "name": "CasinoLive123"}
        ]
        
        try:
            with self.driver.session() as session:
                # Clear existing test data
                logger.info("🧹 Clearing existing test data...")
                clear_query = """
                MATCH (n)
                WHERE n.is_test_data = true OR n.is_schema_sample IS NULL
                DETACH DELETE n
                """
                session.run(clear_query)
                
                # Create all gambling websites
                logger.info("🎰 Creating 6 gambling websites...")
                for site in gambling_websites:
                    site_query = """
                    MERGE (g:SitusJudi {url: $url})
                    SET g.nama = $nama,
                        g.waktu_ekstraksi = $waktu,
                        g.original_url = $url,
                        g.site_language = 'Indonesian',
                        g.registration_success = true,
                        g.is_test_data = true
                    """
                    session.run(site_query, {
                        "url": site["url"],
                        "nama": site["name"],
                        "waktu": datetime.now().isoformat()
                    })
                
                # Calculate entity distribution for exactly 100 nodes
                # Layer 1: Player accounts (36 accounts) - Transfer TO the system, not clustered
                # Layer 2: Hidden intermediary accounts (4 accounts) - Center, receive from multiple websites  
                # Layer 3: Money pooling accounts (36 accounts) - Featured in websites, clustered (9 per website)
                # Remaining: Standalone accounts (24 accounts) - Not connected to any website
                
                player_accounts = 36      # Layer 1: Players who deposit money
                hidden_accounts = 4       # Layer 2: Hidden intermediary accounts (center)
                pooling_accounts = 36     # Layer 3: Money pooling accounts (9 per website × 4 websites)
                standalone_accounts = 24  # Remaining standalone accounts
                
                entities_config = []
                
                # Layer 3: Create money pooling accounts for each website (clustered, featured in websites)
                for i, site in enumerate(gambling_websites):
                    entities_config.append({
                        "type": "pooling_bank", 
                        "count": 6, 
                        "cluster": f"website_{i}", 
                        "sites": [site],
                        "layer": 3
                    })
                    entities_config.append({
                        "type": "pooling_ewallet", 
                        "count": 2, 
                        "cluster": f"website_{i}", 
                        "sites": [site],
                        "layer": 3
                    })
                    entities_config.append({
                        "type": "pooling_qris", 
                        "count": 1, 
                        "cluster": f"website_{i}", 
                        "sites": [site],
                        "layer": 3
                    })
                
                # Layer 2: Hidden intermediary accounts (center, not featured in any website)
                entities_config.append({
                    "type": "hidden_bank", 
                    "count": 4, 
                    "cluster": "hidden", 
                    "sites": [],
                    "layer": 2
                })
                
                # Layer 1: Player accounts (not featured in any website, transfers TO the system)
                entities_config.extend([
                    {"type": "player_bank", "count": 20, "cluster": "players", "sites": [], "layer": 1},
                    {"type": "player_ewallet", "count": 12, "cluster": "players", "sites": [], "layer": 1},
                    {"type": "player_phone", "count": 4, "cluster": "players", "sites": [], "layer": 1}
                ])
                
                # Standalone accounts (not connected to any website or layer)
                entities_config.extend([
                    {"type": "standalone_bank", "count": 15, "cluster": "standalone", "sites": [], "layer": 0},
                    {"type": "standalone_ewallet", "count": 6, "cluster": "standalone", "sites": [], "layer": 0},
                    {"type": "standalone_phone", "count": 3, "cluster": "standalone", "sites": [], "layer": 0}
                ])
                
                created_entities = []
                hidden_accounts = []      # Layer 2: Hidden intermediary accounts
                pooling_accounts = []     # Layer 3: Money pooling accounts (featured in websites)
                player_accounts = []      # Layer 1: Player accounts (deposit money to system)
                
                entity_counter = 0
                
                for config in entities_config:
                    logger.info(f"Creating {config['count']} {config['type']} entities for {config['cluster']} (Layer {config.get('layer', 0)})...")
                    
                    for i in range(config["count"]):
                        oss_key = demo_oss_keys[entity_counter % len(demo_oss_keys)]
                        entity_counter += 1
                        
                        # Determine entity type and specific settings based on config type
                        if "bank" in config["type"]:
                            # Create bank account with specific distribution
                            bank_names = ["BCA", "BRI", "BNI", "Mandiri", "CIMB Niaga"]
                            
                            # Layer-specific bank selection
                            if config["layer"] == 3:  # Pooling accounts
                                bank_name = ["BCA", "BRI", "BNI", "Mandiri"][i % 4]  # Rotate through major banks
                            elif config["layer"] == 2:  # Hidden accounts
                                bank_name = "CIMB Niaga"  # Use distinctive bank for hidden accounts
                            else:  # Player and standalone accounts
                                bank_name = random.choice(bank_names)
                            
                            account_number = f"{random.randint(1000000000, 9999999999)}"
                            
                            account_query = """
                            MERGE (a:AkunMencurigakan {nomor_rekening: $nomor_rekening})
                            SET a.jenis_akun = 'CHECKING',
                                a.nama_bank = $nama_bank,
                                a.pemilik_rekening = $pemilik_rekening,
                                a.terakhir_update = $waktu,
                                a.priority_score = $priority_score,
                                a.oss_key = $oss_key,
                                a.cluster_id = $cluster_id,
                                a.layer = $layer,
                                a.account_role = $account_role,
                                a.connections = $connections,
                                a.is_test_data = true
                            """
                            
                            # Layer-specific priority and role
                            if config["layer"] == 2:  # Hidden accounts
                                priority_score = random.randint(85, 100)
                                account_role = "hidden_intermediary"
                                connections = 8  # High connections for hidden accounts
                            elif config["layer"] == 3:  # Pooling accounts
                                priority_score = random.randint(70, 90)
                                account_role = "money_pooling"
                                connections = 5  # Medium connections
                            elif config["layer"] == 1:  # Player accounts
                                priority_score = random.randint(20, 50)
                                account_role = "player_deposit"
                                connections = 1  # Low connections
                            else:  # Standalone
                                priority_score = random.randint(10, 40)
                                account_role = "standalone"
                                connections = 0
                            
                            session.run(account_query, {
                                "nomor_rekening": account_number,
                                "nama_bank": bank_name,
                                "pemilik_rekening": f"{config['type'].title()} {entity_counter}",
                                "waktu": datetime.now().isoformat(),
                                "priority_score": priority_score,
                                "oss_key": oss_key,
                                "cluster_id": config["cluster"],
                                "layer": config.get("layer", 0),
                                "account_role": account_role,
                                "connections": connections
                            })
                            
                            # Track different account types
                            if config["layer"] == 2:
                                hidden_accounts.append(account_number)
                            elif config["layer"] == 3:
                                pooling_accounts.append(account_number)
                            elif config["layer"] == 1:
                                player_accounts.append(account_number)
                                
                            created_entities.append({
                                "type": "AkunMencurigakan",
                                "identifier": account_number,
                                "cluster": config["cluster"],
                                "layer": config.get("layer", 0),
                                "role": account_role,
                                "oss_key": oss_key,
                                "websites": [site["url"] for site in config["sites"]]
                            })
                        
                        elif "ewallet" in config["type"]:
                            # Create e-wallet with specific types for different layers
                            ewallet_types = ["OVO", "DANA", "GoPay", "LinkAja", "ShopeePay"]
                            
                            if config["layer"] == 3:  # Pooling accounts
                                wallet_type = ["OVO", "DANA", "GoPay"][i % 3]  # Rotate through major e-wallets
                            else:
                                wallet_type = random.choice(ewallet_types)
                            
                            wallet_id = f"{wallet_type}_{random.randint(100000, 999999)}"
                            
                            ewallet_query = """
                            MERGE (e:EWallet {wallet_id: $wallet_id})
                            SET e.wallet_type = $wallet_type,
                                e.phone_number = $phone_number,
                                e.owner_name = $owner_name,
                                e.registration_date = $waktu,
                                e.priority_score = $priority_score,
                                e.oss_key = $oss_key,
                                e.cluster_id = $cluster_id,
                                e.layer = $layer,
                                e.account_role = $account_role,
                                e.connections = $connections,
                                e.is_test_data = true
                            """
                            
                            # Layer-specific settings
                            if config["layer"] == 3:  # Pooling accounts
                                priority_score = random.randint(65, 85)
                                account_role = "money_pooling"
                                connections = 4
                            elif config["layer"] == 1:  # Player accounts
                                priority_score = random.randint(15, 45)
                                account_role = "player_deposit"
                                connections = 1
                            else:  # Standalone
                                priority_score = random.randint(10, 35)
                                account_role = "standalone"
                                connections = 0
                            
                            session.run(ewallet_query, {
                                "wallet_id": wallet_id,
                                "wallet_type": wallet_type,
                                "phone_number": f"0812{random.randint(10000000, 99999999)}",
                                "owner_name": f"{config['type'].title()} {entity_counter}",
                                "waktu": datetime.now().isoformat(),
                                "priority_score": priority_score,
                                "oss_key": oss_key,
                                "cluster_id": config["cluster"],
                                "layer": config.get("layer", 0),
                                "account_role": account_role,
                                "connections": connections
                            })
                            
                            created_entities.append({
                                "type": "EWallet",
                                "identifier": wallet_id,
                                "cluster": config["cluster"],
                                "layer": config.get("layer", 0),
                                "role": account_role,
                                "oss_key": oss_key,
                                "websites": [site["url"] for site in config["sites"]]
                            })
                        
                        elif "phone" in config["type"]:
                            # Create phone number entities
                            phone_providers = ["Telkomsel", "XL", "Indosat", "Tri", "Smartfren"]
                            provider = random.choice(phone_providers)
                            phone_number = f"0812{random.randint(10000000, 99999999)}"
                            
                            phone_query = """
                            MERGE (p:PhoneNumber {phone_number: $phone_number})
                            SET p.provider = $provider,
                                p.registration_type = 'PREPAID',
                                p.owner_name = $owner_name,
                                p.registration_date = $waktu,
                                p.priority_score = $priority_score,
                                p.oss_key = $oss_key,
                                p.cluster_id = $cluster_id,
                                p.layer = $layer,
                                p.account_role = $account_role,
                                p.connections = $connections,
                                p.is_test_data = true
                            """
                            
                            # Layer-specific settings
                            if config["layer"] == 1:  # Player accounts
                                priority_score = random.randint(10, 40)
                                account_role = "player_deposit"
                                connections = 1
                            else:  # Standalone
                                priority_score = random.randint(5, 30)
                                account_role = "standalone"
                                connections = 0
                            
                            session.run(phone_query, {
                                "phone_number": phone_number,
                                "provider": provider,
                                "owner_name": f"{config['type'].title()} {entity_counter}",
                                "waktu": datetime.now().isoformat(),
                                "priority_score": priority_score,
                                "oss_key": oss_key,
                                "cluster_id": config["cluster"],
                                "layer": config.get("layer", 0),
                                "account_role": account_role,
                                "connections": connections
                            })
                            
                            created_entities.append({
                                "type": "PhoneNumber",
                                "identifier": phone_number,
                                "cluster": config["cluster"],
                                "layer": config.get("layer", 0),
                                "role": account_role,
                                "oss_key": oss_key,
                                "websites": [site["url"] for site in config["sites"]]
                            })
                        
                        elif "qris" in config["type"]:
                            # Create QRIS code (only for pooling accounts)
                            qris_code = f"QRIS_{random.randint(1000000, 9999999)}"
                            merchant_name = f"Merchant {entity_counter}"
                            
                            qris_query = """
                            MERGE (q:QRISCode {qris_code: $qris_code})
                            SET q.merchant_name = $merchant_name,
                                q.merchant_category = $category,
                                q.creation_date = $waktu,
                                q.priority_score = $priority_score,
                                q.oss_key = $oss_key,
                                q.cluster_id = $cluster_id,
                                q.layer = $layer,
                                q.account_role = $account_role,
                                q.connections = $connections,
                                q.is_test_data = true
                            """
                            
                            categories = ["Food & Beverage", "Retail", "Transportation", "Entertainment", "Services"]
                            
                            session.run(qris_query, {
                                "qris_code": qris_code,
                                "merchant_name": merchant_name,
                                "category": random.choice(categories),
                                "waktu": datetime.now().isoformat(),
                                "priority_score": random.randint(60, 80),  # QRIS only for pooling
                                "oss_key": oss_key,
                                "cluster_id": config["cluster"],
                                "layer": config.get("layer", 3),
                                "account_role": "money_pooling",
                                "connections": 2
                            })
                            
                            pooling_accounts.append(qris_code)  # Track as pooling account
                            
                            created_entities.append({
                                "type": "QRISCode",
                                "identifier": qris_code,
                                "cluster": config["cluster"],
                                "layer": config.get("layer", 3),
                                "role": "money_pooling",
                                "oss_key": oss_key,
                                "websites": [site["url"] for site in config["sites"]]
                            })
                        
                        # Store cluster information for Layer 3 (pooling accounts) only
                        if config["layer"] == 3 and config["sites"]:
                            cluster_sites = [site["url"] for site in config["sites"]]
                            cluster_update_query = f"""
                            MATCH (e {{is_test_data: true}})
                            WHERE (e:AkunMencurigakan AND e.nomor_rekening = $identifier) OR
                                (e:EWallet AND e.wallet_id = $identifier) OR
                                (e:PhoneNumber AND e.phone_number = $identifier) OR
                                (e:QRISCode AND e.qris_code = $identifier)
                            SET e.associated_sites = $sites
                            """
                            
                            session.run(cluster_update_query, {
                                "identifier": created_entities[-1]["identifier"],
                                "sites": cluster_sites
                            })
                
                # Create 3-layer hierarchy transaction relationships
                logger.info("💸 Creating 3-layer money flow pattern...")
                
                # Get entities by layer for transaction creation
                layer_1_entities = [e for e in created_entities if e.get("layer") == 1]  # Player accounts
                layer_2_entities = [e for e in created_entities if e.get("layer") == 2]  # Hidden intermediaries
                layer_3_entities = [e for e in created_entities if e.get("layer") == 3]  # Pooling accounts
                standalone_entities = [e for e in created_entities if e.get("layer") == 0]  # Standalone
                
                transaction_count = 0
                target_transactions = 200
                
                # 1. Layer 1 (Players) → Layer 2 (Hidden Intermediaries)
                logger.info("🎮 Creating Layer 1 → Layer 2 transactions (Players to Hidden Intermediaries)...")
                for player_entity in layer_1_entities:
                    # Each player transfers to 1 random hidden intermediary
                    if layer_2_entities and transaction_count < target_transactions:
                        hidden_intermediary = random.choice(layer_2_entities)
                        
                        transaction_query = """
                        MATCH (from_entity {is_test_data: true})
                        MATCH (to_entity {is_test_data: true}) 
                        WHERE ((from_entity:AkunMencurigakan AND from_entity.nomor_rekening = $from_identifier) OR
                            (from_entity:EWallet AND from_entity.wallet_id = $from_identifier) OR
                            (from_entity:PhoneNumber AND from_entity.phone_number = $from_identifier) OR
                            (from_entity:QRISCode AND from_entity.qris_code = $from_identifier)) AND
                            ((to_entity:AkunMencurigakan AND to_entity.nomor_rekening = $to_identifier) OR
                            (to_entity:EWallet AND to_entity.wallet_id = $to_identifier) OR
                            (to_entity:PhoneNumber AND to_entity.phone_number = $to_identifier) OR
                            (to_entity:QRISCode AND to_entity.qris_code = $to_identifier))
                        CREATE (from_entity)-[t:TRANSFERS_TO {
                            amount: $amount,
                            timestamp: $timestamp,
                            transaction_type: 'PLAYER_DEPOSIT',
                            reference: $reference,
                            layer_flow: 'L1_TO_L2',
                            is_test_data: true
                        }]->(to_entity)
                        """
                        
                        try:
                            session.run(transaction_query, {
                                "from_identifier": player_entity["identifier"],
                                "to_identifier": hidden_intermediary["identifier"],
                                "amount": random.randint(100000, 1000000),  # Player deposits
                                "timestamp": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                                "reference": f"PLY{random.randint(100000, 999999)}"
                            })
                            transaction_count += 1
                        except Exception as e:
                            logger.debug(f"L1→L2 transaction failed: {e}")
                
                # 2. Layer 2 (Hidden Intermediaries) → Layer 3 (Pooling Accounts) 
                logger.info("� Creating Layer 2 → Layer 3 transactions (Hidden to Pooling)...")
                for hidden_entity in layer_2_entities:
                    # Each hidden intermediary distributes to 3-4 pooling accounts across different websites
                    pooling_targets = random.sample(layer_3_entities, min(4, len(layer_3_entities)))
                    
                    for pooling_entity in pooling_targets:
                        if transaction_count >= target_transactions:
                            break
                            
                        try:
                            session.run(transaction_query, {
                                "from_identifier": hidden_entity["identifier"],
                                "to_identifier": pooling_entity["identifier"],
                                "amount": random.randint(500000, 3000000),  # Distribution amounts
                                "timestamp": (datetime.now() - timedelta(days=random.randint(1, 15))).isoformat(),
                                "reference": f"HID{random.randint(100000, 999999)}"
                            })
                            transaction_count += 1
                        except Exception as e:
                            logger.debug(f"L2→L3 transaction failed: {e}")
                
                # 3. Standalone accounts → Layer 3 (External deposits to pooling)
                logger.info("� Creating Standalone → Layer 3 transactions (External to Pooling)...")
                for standalone_entity in standalone_entities:
                    # Each standalone makes 1-2 deposits to random pooling accounts
                    pooling_targets = random.sample(layer_3_entities, min(2, len(layer_3_entities)))
                    
                    for pooling_entity in pooling_targets:
                        if transaction_count >= target_transactions:
                            break
                            
                        try:
                            session.run(transaction_query, {
                                "from_identifier": standalone_entity["identifier"],
                                "to_identifier": pooling_entity["identifier"],
                                "amount": random.randint(1000000, 5000000),  # Large external deposits
                                "timestamp": (datetime.now() - timedelta(days=random.randint(1, 20))).isoformat(),
                                "reference": f"EXT{random.randint(100000, 999999)}"
                            })
                            transaction_count += 1
                        except Exception as e:
                            logger.debug(f"Standalone→L3 transaction failed: {e}")
                
                # 4. Intra-layer transactions for remaining edges
                logger.info("🔄 Creating remaining intra-layer transactions...")
                remaining_transactions = target_transactions - transaction_count
                
                for _ in range(remaining_transactions):
                    if transaction_count >= target_transactions:
                        break
                    
                    # Create some transactions within Layer 3 (pooling accounts of same website)
                    if len(layer_3_entities) > 1:
                        source_entity = random.choice(layer_3_entities)
                        # Find pooling accounts from the same website cluster
                        same_cluster_entities = [e for e in layer_3_entities 
                                               if e["cluster"] == source_entity["cluster"] 
                                               and e["identifier"] != source_entity["identifier"]]
                        
                        if same_cluster_entities:
                            target_entity = random.choice(same_cluster_entities)
                            
                            try:
                                session.run(transaction_query, {
                                    "from_identifier": source_entity["identifier"],
                                    "to_identifier": target_entity["identifier"],
                                    "amount": random.randint(200000, 1500000),  # Internal pooling transfers
                                    "timestamp": (datetime.now() - timedelta(days=random.randint(1, 10))).isoformat(),
                                    "reference": f"POL{random.randint(100000, 999999)}"
                                })
                                transaction_count += 1
                            except Exception as e:
                                logger.debug(f"Intra-layer transaction failed: {e}")
                
                logger.info(f"✅ Created {transaction_count} transaction relationships with 3-layer hierarchy")
                
                # Get final counts
                count_query = """
                MATCH (n) 
                WHERE n.is_test_data = true
                RETURN labels(n)[0] as label, count(n) as count
                """
                
                result = session.run(count_query)
                counts = {record["label"]: record["count"] for record in result}
                
                # Count relationships
                rel_count_query = """
                MATCH ()-[r]->() 
                WHERE r.is_test_data = true
                RETURN type(r) as rel_type, count(r) as count
                """
                
                rel_result = session.run(rel_count_query)
                rel_counts = {record["rel_type"]: record["count"] for record in rel_result}
                
                logger.info("🎬 3-Layer Network Seeding completed successfully!")
                logger.info(f"📊 Created nodes: {counts}")
                logger.info(f"🔗 Created relationships: {rel_counts}")
                logger.info(f"💸 Total transactions created: {transaction_count}")
                logger.info(f"🏦 Pooling accounts for money flow: {len(pooling_accounts)}")
                logger.info(f"� Hidden intermediary accounts: {len(hidden_accounts)}")
                
                return {
                    "success": True,
                    "nodes_created": counts,
                    "relationships_created": rel_counts,
                    "total_nodes": sum(counts.values()),
                    "total_transactions": transaction_count,
                    "gambling_sites": len(gambling_websites),
                    "network_structure": {
                        "layer_1_players": len([e for e in created_entities if e.get("layer") == 1]),
                        "layer_2_hidden": len([e for e in created_entities if e.get("layer") == 2]),
                        "layer_3_pooling": len([e for e in created_entities if e.get("layer") == 3]),
                        "standalone": len([e for e in created_entities if e.get("layer") == 0])
                    },
                    "demo_features": {
                        "website_clusters": 4,
                        "pooling_accounts": len(pooling_accounts),
                        "hidden_accounts": hidden_accounts,
                        "pooling_accounts_for_report": pooling_accounts[:5],  # Return first 5 for report
                        "oss_keys_used": demo_oss_keys,
                        "money_flow": {
                            "layer_1_to_layer_2": "Player accounts deposit to hidden intermediaries",
                            "layer_2_to_layer_3": "Hidden intermediaries distribute to website pooling accounts", 
                            "layer_clustering": "Only Layer 3 accounts cluster by associated websites"
                        },
                        "filtering_examples": {
                            "bank_bca_count": len([e for e in created_entities if "BCA" in str(e)]),
                            "ewallet_ovo_count": len([e for e in created_entities if "OVO" in str(e)]),
                            "phone_telkomsel_count": len([e for e in created_entities if "Telkomsel" in str(e)])
                        },
                        "website_urls": [site["url"] for site in gambling_websites]
                    }
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to seed demo database: {e}")
            import traceback
            logger.error(f"📍 Traceback: {traceback.format_exc()}")
            return {"success": False, "error": str(e)}

    def clear_test_data(self):
        """
        Clear all test data from the database (keeps schema samples)
        """
        if not self._check_connection():
            logger.warning("Cannot clear test data - database not connected")
            return False
            
        logger.info("🧹 Clearing all test data...")
        
        try:
            with self.driver.session() as session:
                clear_query = """
                MATCH (n)
                WHERE n.is_test_data = true
                DETACH DELETE n
                """
                
                result = session.run(clear_query)
                logger.info("✅ Test data cleared successfully")
                return True
                
        except Exception as e:
            logger.error(f"❌ Failed to clear test data: {e}")
            return False

db_handler = Neo4jHandler() 