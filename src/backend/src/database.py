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
        """
        Seed the database with realistic test data including:
        - Multiple gambling sites with clustered entities
        - Various entity types (bank accounts, crypto wallets, e-wallets, etc.)
        - Realistic Indonesian bank distribution (BCA heavy)
        - Transaction relationships between entities
        """
        if not self._check_connection():
            logger.warning("Cannot seed data - database not connected")
            return False
            
        logger.info(f"🌱 Starting database seeding with {num_nodes} nodes...")
        
        # Define realistic test data
        gambling_sites = [
            {"url": "https://judibola88.com", "name": "JudiBola88"},
            {"url": "https://slotgacor99.net", "name": "SlotGacor99"}, 
            {"url": "https://togelking777.id", "name": "TogelKing777"},
            {"url": "https://casinolive123.co", "name": "CasinoLive123"},
            {"url": "https://pokerindo88.org", "name": "PokerIndo88"},
            {"url": "https://sportbet365.vip", "name": "SportBet365"},
            {"url": "https://slotmania77.net", "name": "SlotMania77"}
        ]
        
        # Indonesian banks with realistic distribution (BCA heavy as requested)
        bank_distribution = {
            "BCA": 30,  # 30% of bank accounts
            "BRI": 20,
            "BNI": 15, 
            "Mandiri": 15,
            "CIMB Niaga": 8,
            "Danamon": 5,
            "BTN": 4,
            "Permata": 3
        }
        
        # E-wallet types
        ewallet_types = ["OVO", "DANA", "GoPay", "LinkAja", "ShopeePay"]
        
        # Crypto currencies
        crypto_currencies = ["Bitcoin", "Ethereum", "USDT", "USDC", "BNB", "Dogecoin"]
        
        # Phone providers
        phone_providers = ["Telkomsel", "XL", "Indosat", "Tri", "Smartfren"]
        
        # Indonesian names for realistic account holders
        indonesian_names = [
            "Ahmad Suryanto", "Budi Prasetyo", "Siti Nurhaliza", "Dewi Sartika",
            "Rizky Pratama", "Maya Sari", "Andi Wijaya", "Lina Marlina",
            "Hendra Gunawan", "Ratna Wati", "Agus Salim", "Indira Putri",
            "Bambang Hartono", "Sari Dewi", "Dedi Kurniawan", "Rina Susanti",
            "Fajar Nugroho", "Lisa Permata", "Joko Widodo", "Mega Wati",
            "Rudi Hartanto", "Nina Sari", "Eko Prasetyo", "Dian Sastro",
            "Wawan Setiawan", "Yuli Rachmawati", "Anton Sinaga", "Evi Tamala",
            "Dody Iskandar", "Fitri Handayani", "Gilang Ramadhan", "Sinta Nurjanah",
            "Hendro Siahaan", "Kartika Sari", "Ivan Gunawan", "Josephine Joni",
            "Krisna Mukti", "Lestari Moerdani", "Made Artawan", "Novita Angie"
        ]
        
        try:
            with self.driver.session() as session:
                # Clear existing test data (except schema samples)
                logger.info("🧹 Clearing existing test data...")
                clear_query = """
                MATCH (n)
                WHERE NOT n.is_schema_sample = true
                DETACH DELETE n
                """
                session.run(clear_query)
                
                # Create gambling sites
                logger.info("🎰 Creating gambling sites...")
                for site in gambling_sites:
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
                
                logger.info(f"✅ Created {len(gambling_sites)} gambling sites")
                
                # Calculate entity distribution
                bank_accounts_count = int(num_nodes * 0.5)  # 50% bank accounts
                crypto_wallets_count = int(num_nodes * 0.2)  # 20% crypto wallets
                ewallets_count = int(num_nodes * 0.15)  # 15% e-wallets
                phone_numbers_count = int(num_nodes * 0.1)  # 10% phone numbers
                qris_codes_count = int(num_nodes * 0.05)  # 5% QRIS codes
                
                created_entities = []
                
                # Create bank accounts with BCA heavy distribution
                logger.info(f"🏦 Creating {bank_accounts_count} bank accounts...")
                for i in range(bank_accounts_count):
                    # Select bank based on distribution
                    rand = random.random() * 100
                    cumulative = 0
                    selected_bank = "BCA"  # default
                    
                    for bank, percentage in bank_distribution.items():
                        cumulative += percentage
                        if rand <= cumulative:
                            selected_bank = bank
                            break
                    
                    account_number = f"{random.randint(1000000000, 9999999999)}"
                    account_holder = random.choice(indonesian_names)
                    
                    # Assign to random gambling sites (some accounts used by multiple sites)
                    sites_using = random.sample(gambling_sites, random.randint(1, 3))
                    
                    account_query = """
                    MERGE (a:AkunMencurigakan {nomor_rekening: $nomor_rekening})
                    SET a.jenis_akun = 'CHECKING',
                        a.nama_bank = $nama_bank,
                        a.pemilik_rekening = $pemilik_rekening,
                        a.terakhir_update = $waktu,
                        a.priority_score = $priority_score,
                        a.is_test_data = true
                    """
                    
                    session.run(account_query, {
                        "nomor_rekening": account_number,
                        "nama_bank": selected_bank,
                        "pemilik_rekening": account_holder,
                        "waktu": datetime.now().isoformat(),
                        "priority_score": random.randint(0, 100)
                    })
                    
                    # Create relationships to gambling sites
                    for site in sites_using:
                        rel_query = """
                        MATCH (g:SitusJudi {url: $site_url})
                        MATCH (a:AkunMencurigakan {nomor_rekening: $account_number})
                        MERGE (g)-[:MENGGUNAKAN_REKENING]->(a)
                        """
                        session.run(rel_query, {
                            "site_url": site["url"],
                            "account_number": account_number
                        })
                    
                    created_entities.append({
                        "type": "AkunMencurigakan",
                        "identifier": account_number,
                        "holder": account_holder
                    })
                
                logger.info(f"✅ Created {bank_accounts_count} bank accounts")
                
                # Create crypto wallets
                logger.info(f"₿ Creating {crypto_wallets_count} crypto wallets...")
                for i in range(crypto_wallets_count):
                    # Generate realistic wallet address
                    if random.choice([True, False]):
                        # Bitcoin-style address
                        wallet_address = "1" + "".join(random.choices("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", k=33))
                    else:
                        # Ethereum-style address
                        wallet_address = "0x" + "".join(random.choices("0123456789abcdef", k=40))
                    
                    cryptocurrency = random.choice(crypto_currencies)
                    holder = random.choice(indonesian_names)
                    
                    sites_using = random.sample(gambling_sites, random.randint(1, 2))
                    
                    wallet_query = """
                    MERGE (c:CryptoWallet {alamat_wallet: $alamat_wallet})
                    SET c.cryptocurrency = $cryptocurrency,
                        c.terakhir_update = $waktu,
                        c.account_holder = $holder,
                        c.priority_score = $priority_score,
                        c.is_test_data = true
                    """
                    
                    session.run(wallet_query, {
                        "alamat_wallet": wallet_address,
                        "cryptocurrency": cryptocurrency,
                        "waktu": datetime.now().isoformat(),
                        "holder": holder,
                        "priority_score": random.randint(0, 100)
                    })
                    
                    # Create relationships to gambling sites
                    for site in sites_using:
                        rel_query = """
                        MATCH (g:SitusJudi {url: $site_url})
                        MATCH (c:CryptoWallet {alamat_wallet: $wallet_address})
                        MERGE (g)-[:MENGGUNAKAN_CRYPTO]->(c)
                        """
                        session.run(rel_query, {
                            "site_url": site["url"],
                            "wallet_address": wallet_address
                        })
                    
                    created_entities.append({
                        "type": "CryptoWallet",
                        "identifier": wallet_address,
                        "holder": holder
                    })
                
                logger.info(f"✅ Created {crypto_wallets_count} crypto wallets")
                
                # Create e-wallets
                logger.info(f"📱 Creating {ewallets_count} e-wallets...")
                for i in range(ewallets_count):
                    wallet_number = f"08{random.randint(1000000000, 9999999999)}"
                    wallet_type = random.choice(ewallet_types)
                    holder = random.choice(indonesian_names)
                    
                    sites_using = random.sample(gambling_sites, random.randint(1, 2))
                    
                    ewallet_query = """
                    MERGE (e:EWallet {wallet_number: $wallet_number})
                    SET e.wallet_type = $wallet_type,
                        e.account_holder = $holder,
                        e.terakhir_update = $waktu,
                        e.priority_score = $priority_score,
                        e.is_test_data = true
                    """
                    
                    session.run(ewallet_query, {
                        "wallet_number": wallet_number,
                        "wallet_type": wallet_type,
                        "holder": holder,
                        "waktu": datetime.now().isoformat(),
                        "priority_score": random.randint(0, 100)
                    })
                    
                    # Note: E-wallets don't have direct relationships to gambling sites in your current schema
                    # But we'll create some payment method relationships
                    for site in sites_using:
                        # Create payment method
                        payment_query = """
                        MATCH (g:SitusJudi {url: $site_url})
                        MERGE (p:MetodePembayaran {provider: $provider})
                        SET p.terakhir_update = $waktu,
                            p.is_test_data = true
                        MERGE (g)-[:MENERIMA_PEMBAYARAN]->(p)
                        """
                        session.run(payment_query, {
                            "site_url": site["url"],
                            "provider": wallet_type,
                            "waktu": datetime.now().isoformat()
                        })
                    
                    created_entities.append({
                        "type": "EWallet", 
                        "identifier": wallet_number,
                        "holder": holder
                    })
                
                logger.info(f"✅ Created {ewallets_count} e-wallets")
                
                # Create phone numbers
                logger.info(f"📞 Creating {phone_numbers_count} phone numbers...")
                for i in range(phone_numbers_count):
                    phone_number = f"08{random.randint(1000000000, 9999999999)}"
                    phone_provider = random.choice(phone_providers)
                    holder = random.choice(indonesian_names)
                    
                    phone_query = """
                    MERGE (p:PhoneNumber {phone_number: $phone_number})
                    SET p.phone_provider = $phone_provider,
                        p.account_holder = $holder,
                        p.terakhir_update = $waktu,
                        p.priority_score = $priority_score,
                        p.is_test_data = true
                    """
                    
                    session.run(phone_query, {
                        "phone_number": phone_number,
                        "phone_provider": phone_provider,
                        "holder": holder,
                        "waktu": datetime.now().isoformat(),
                        "priority_score": random.randint(0, 100)
                    })
                    
                    created_entities.append({
                        "type": "PhoneNumber",
                        "identifier": phone_number,
                        "holder": holder
                    })
                
                logger.info(f"✅ Created {phone_numbers_count} phone numbers")
                
                # Create QRIS codes
                logger.info(f"📱 Creating {qris_codes_count} QRIS codes...")
                for i in range(qris_codes_count):
                    qris_code = f"QRIS{random.randint(100000, 999999)}"
                    holder = random.choice(indonesian_names)
                    
                    qris_query = """
                    MERGE (q:QRISCode {qris_code: $qris_code})
                    SET q.account_holder = $holder,
                        q.terakhir_update = $waktu,
                        q.priority_score = $priority_score,
                        q.is_test_data = true
                    """
                    
                    session.run(qris_query, {
                        "qris_code": qris_code,
                        "holder": holder,
                        "waktu": datetime.now().isoformat(),
                        "priority_score": random.randint(0, 100)
                    })
                    
                    created_entities.append({
                        "type": "QRISCode",
                        "identifier": qris_code,
                        "holder": holder
                    })
                
                logger.info(f"✅ Created {qris_codes_count} QRIS codes")
                
                # Create realistic transactions between entities
                logger.info("💸 Creating transaction relationships...")
                num_transactions = random.randint(50, 150)  # Random number of transactions
                
                for i in range(num_transactions):
                    # Select random source and destination entities
                    from_entity = random.choice(created_entities)
                    to_entity = random.choice(created_entities)
                    
                    # Don't create transaction to self
                    if from_entity["identifier"] == to_entity["identifier"]:
                        continue
                    
                    # Generate realistic transaction data
                    amount = round(random.uniform(50000, 10000000), 2)  # 50k to 10M IDR
                    days_ago = random.randint(0, 365)
                    transaction_date = datetime.now() - timedelta(days=days_ago)
                    
                    transaction_types = ["deposit", "withdrawal", "transfer", "payment"]
                    transaction_type = random.choice(transaction_types)
                    
                    # Create transaction using the same logic as your graph database
                    transaction_query = """
                    MATCH (from_entity), (to_entity)
                    WHERE (
                        from_entity.nomor_rekening = $from_identifier OR
                        from_entity.alamat_wallet = $from_identifier OR  
                        from_entity.wallet_number = $from_identifier OR
                        from_entity.phone_number = $from_identifier OR
                        from_entity.qris_code = $from_identifier
                    ) AND (
                        to_entity.nomor_rekening = $to_identifier OR
                        to_entity.alamat_wallet = $to_identifier OR
                        to_entity.wallet_number = $to_identifier OR  
                        to_entity.phone_number = $to_identifier OR
                        to_entity.qris_code = $to_identifier
                    )
                    CREATE (from_entity)-[t:TRANSFERS_TO {
                        amount: $amount,
                        timestamp: $timestamp,
                        transaction_type: $transaction_type,
                        reference: $reference,
                        is_test_data: true
                    }]->(to_entity)
                    """
                    
                    try:
                        session.run(transaction_query, {
                            "from_identifier": from_entity["identifier"],
                            "to_identifier": to_entity["identifier"],
                            "amount": amount,
                            "timestamp": transaction_date.isoformat(),
                            "transaction_type": transaction_type,
                            "reference": f"TXN{random.randint(100000, 999999)}"
                        })
                    except Exception as e:
                        # Some transactions might fail due to identifier conflicts, that's ok
                        logger.debug(f"Transaction creation failed (expected): {e}")
                        continue
                
                logger.info(f"✅ Created up to {num_transactions} transaction relationships")
                
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
                WHERE r.is_test_data = true OR 
                    EXISTS((r)<-[:MENGGUNAKAN_REKENING|MENGGUNAKAN_CRYPTO|MENERIMA_PEMBAYARAN]-(:SitusJudi {is_test_data: true}))
                RETURN type(r) as rel_type, count(r) as count
                """
                
                rel_result = session.run(rel_count_query)
                rel_counts = {record["rel_type"]: record["count"] for record in rel_result}
                
                logger.info("🎉 Database seeding completed successfully!")
                logger.info(f"📊 Created nodes: {counts}")
                logger.info(f"🔗 Created relationships: {rel_counts}")
                
                return {
                    "success": True,
                    "nodes_created": counts,
                    "relationships_created": rel_counts,
                    "total_nodes": sum(counts.values()),
                    "gambling_sites": len(gambling_sites)
                }
                
        except Exception as e:
            logger.error(f"❌ Failed to seed database: {e}")
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