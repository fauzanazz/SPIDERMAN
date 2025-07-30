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
            
            # Ensure TRANSFERS_TO relationship type exists to prevent warnings
            init_queries = [
                # Create a dummy relationship to ensure TRANSFERS_TO type exists, then remove it
                "MERGE (dummy1:DummyNode {id: 'temp1'}) MERGE (dummy2:DummyNode {id: 'temp2'}) MERGE (dummy1)-[:TRANSFERS_TO {amount: 0, timestamp: '2024-01-01', reference: 'init', is_dummy: true}]->(dummy2)",
                "MATCH (n:DummyNode {id: 'temp1'})-[r:TRANSFERS_TO {is_dummy: true}]->(m:DummyNode {id: 'temp2'}) DELETE r, n, m"
            ]
            
            # Execute init queries first
            for query in init_queries:
                try:
                    session.run(query)
                    logger.debug(f"Executed init query successfully")
                except Exception as e:
                    logger.debug(f"Init query failed (expected): {e}")
            
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
            logger.warning(f"[VALIDATION] Original data counts - Accounts: {len(data.bank_accounts)}, Wallets: {len(data.crypto_wallets)}, Payments: {len(data.payment_gateways)}")
            # Log the first few items to see what validation is failing
            if data.bank_accounts:
                sample_account = data.bank_accounts[0]
                logger.warning(f"[VALIDATION] Sample account - Number: '{sample_account.account_number}', Bank: '{sample_account.bank_name}', Holder: '{sample_account.account_holder}'")
            if data.crypto_wallets:
                sample_wallet = data.crypto_wallets[0]
                logger.warning(f"[VALIDATION] Sample wallet - Address: '{sample_wallet.wallet_address}', Crypto: '{sample_wallet.cryptocurrency}'")
            return False
    
            
        try:
            with self.driver.session() as session:
                logger.debug(f"[DB-SAVE] Menyimpan node SitusJudi untuk: {site_domain}")
            
                site_query = """
                MERGE (g:SitusJudi {url: $url})
                SET g.name = $nama,
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
            a.terakhir_update = $waktu,
            a.priority_score = coalesce(a.priority_score, 0)
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
            c.terakhir_update = $waktu,
            c.priority_score = coalesce(c.priority_score, 0)
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
        
    def seed_test_data(self, num_nodes=24):
        if not self._check_connection():
            logger.warning("Cannot seed demo data - database not connected")
            return {"success": False, "error": "Database not connected"}
            
        logger.info("🎬 Starting simplified hierarchy seeding with real website accounts...")
        
        # Specific OSS keys as requested
        demo_oss_keys = [
            "MOH_IKHSAN",
            "DEWI_LESTARI", 
            "DWI_YULIANA_PERMATASARI",
            "MOHAMAD_ADE",
            "EMI_SARPONIKA"
        ]
        
        # Real gambling websites with their actual accounts
        gambling_websites = [
            {
                "url": "https://cina18.site/",
                "name": "Cina18",
                "accounts": [
                    {"type": "AkunMencurigakan", "bank": "BRI", "owner": "CATUR CAHYANTO", "number": "321901004503507"},
                    {"type": "EWallet", "wallet_type": "DANA", "owner": "DANA User", "number": "6825764937"},
                    {"type": "AkunMencurigakan", "bank": "QRIS", "owner": "SHOP FAST SUPER", "number": "9360050300000909152"},
                    {"type": "AkunMencurigakan", "bank": "BCA", "owner": "DESI AMELIA MIRASANI", "number": "6825764937"},
                    {"type": "EWallet", "wallet_type": "OVO", "owner": "JUARIAH", "number": "087786545607"},
                    {"type": "EWallet", "wallet_type": "LINKAJA", "owner": "JOJOH", "number": "087738231911"},
                    {"type": "EWallet", "wallet_type": "GOPAY", "owner": "GOPAY User", "number": "087828634230"},
                    {"type": "AkunMencurigakan", "bank": "BNI", "owner": "TRI ARIKA", "number": "1922734890"},
                    {"type": "AkunMencurigakan", "bank": "MANDIRI", "owner": "AGUS MAULANA", "number": "1670007466534"}
                ]
            },
            {
                "url": "https://maxwin29.site/",
                "name": "Maxwin29",
                "accounts": [
                    {"type": "AkunMencurigakan", "bank": "BRI", "owner": "RICKY YUNI YANTO", "number": "086301004513500"},
                    {"type": "AkunMencurigakan", "bank": "QRIS", "owner": "PULSA HEBAT CONNECT", "number": "9360081802501100465"},
                    {"type": "AkunMencurigakan", "bank": "BCA", "owner": "VERI IRWAN", "number": "7780215270"},
                    {"type": "AkunMencurigakan", "bank": "OCBC", "owner": "MACHLIANA", "number": "693817576707"},
                    {"type": "AkunMencurigakan", "bank": "BNI", "owner": "EMI BADRIYAH", "number": "1882415640"}
                ]
            },
            {
                "url": "https://kaiko30.xyz/",
                "name": "Kaiko30",
                "accounts": [
                    {"type": "AkunMencurigakan", "bank": "BNI", "owner": "RUT DAME YANTI SIMATUPANG", "number": "1906343330"},
                    {"type": "AkunMencurigakan", "bank": "BCA", "owner": "LAILA FIRDA SHANIA", "number": "6872421579"},
                    {"type": "AkunMencurigakan", "bank": "BRI", "owner": "DIYAS UBAYDILLAH IMTYAS", "number": "038501013425536"},
                    {"type": "AkunMencurigakan", "bank": "MANDIRI", "owner": "RAFITA FATMALA SIFI HAKIM", "number": "1060020389279"},
                    {"type": "EWallet", "wallet_type": "LINKAJA", "owner": "LINKAJA User", "number": "087895620967"},
                    {"type": "EWallet", "wallet_type": "GOPAY", "owner": "GOPAY User", "number": "087844128060"},
                    {"type": "AkunMencurigakan", "bank": "QRIS", "owner": "PRANA MAJU KARYA DYNAMIS", "number": "9360050300000909103"}
                ]
            }
        ]
        
        # Calculate total pooling accounts needed
        total_pooling_accounts = sum(len(site["accounts"]) for site in gambling_websites)
        # Calculate player accounts needed (3-5 per pooling account)
        min_players_needed = total_pooling_accounts * 3
        max_players_needed = total_pooling_accounts * 5
        num_player_accounts = random.randint(min_players_needed, max_players_needed)
        
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
                logger.info("🎰 Creating gambling websites...")
                for site in gambling_websites:
                    site_query = """
                    MERGE (g:SitusJudi {url: $url})
                    SET g.name = $nama,
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
                
                created_entities = []
                player_account_ids = []     # Track player accounts
                pooling_account_ids = []    # Track pooling accounts  
                layer2_account_id = None    # Track the single layer-2 account
                
                entity_counter = 0
                
                # 1. Create player accounts (3-5 per pooling account)
                logger.info(f"🎮 Creating {num_player_accounts} player accounts...")
                bank_names = ["BCA", "BRI", "BNI", "Mandiri", "CIMB Niaga"]
                
                for i in range(num_player_accounts):
                    oss_key = demo_oss_keys[entity_counter % len(demo_oss_keys)]
                    entity_counter += 1
                    
                    # Mix of bank accounts and e-wallets for players (70% bank, 30% e-wallet)
                    if i < int(num_player_accounts * 0.7):  # Bank accounts
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
                            a.cluster_id = 'players',
                            a.connections = 1,
                            a.is_test_data = true
                        """
                        
                        session.run(account_query, {
                            "nomor_rekening": account_number,
                            "nama_bank": bank_name,
                            "pemilik_rekening": f"Player {entity_counter}",
                            "waktu": datetime.now().isoformat(),
                            "priority_score": random.randint(20, 50),
                            "oss_key": oss_key
                        })
                        
                        player_account_ids.append(account_number)
                        created_entities.append({
                            "type": "AkunMencurigakan",
                            "identifier": account_number,
                            "cluster": "players"
                        })
                        
                    else:  # E-wallets
                        ewallet_types = ["OVO", "DANA", "GoPay", "LinkAja", "ShopeePay"]
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
                            e.cluster_id = 'players',
                            e.connections = 1,
                            e.is_test_data = true
                        """
                        
                        session.run(ewallet_query, {
                            "wallet_id": wallet_id,
                            "wallet_type": wallet_type,
                            "phone_number": f"0812{random.randint(10000000, 99999999)}",
                            "owner_name": f"Player {entity_counter}",
                            "waktu": datetime.now().isoformat(),
                            "priority_score": random.randint(15, 45),
                            "oss_key": oss_key
                        })
                        
                        player_account_ids.append(wallet_id)
                        created_entities.append({
                            "type": "EWallet",
                            "identifier": wallet_id,
                            "cluster": "players"
                        })

                # 2. Create pooling accounts using real website data
                logger.info(f"🏦 Creating {total_pooling_accounts} pooling accounts from real website data...")
                
                for site_idx, site in enumerate(gambling_websites):
                    logger.info(f"Creating pooling accounts for {site['name']}...")
                    
                    for pool_idx, account_data in enumerate(site["accounts"]):
                        oss_key = demo_oss_keys[entity_counter % len(demo_oss_keys)]
                        entity_counter += 1
                        
                        account_identifier = account_data["number"]
                        
                        if account_data["type"] == "AkunMencurigakan":
                            # Create bank account
                            account_query = """
                            MERGE (a:AkunMencurigakan {nomor_rekening: $nomor_rekening})
                            SET a.jenis_akun = 'CHECKING',
                                a.nama_bank = $nama_bank,
                                a.pemilik_rekening = $pemilik_rekening,
                                a.terakhir_update = $waktu,
                                a.priority_score = $priority_score,
                                a.oss_key = $oss_key,
                                a.cluster_id = $cluster_id,
                                a.connections = 5,
                                a.pooling_rank = $pooling_rank,
                                a.is_test_data = true
                            """
                            
                            session.run(account_query, {
                                "nomor_rekening": account_identifier,
                                "nama_bank": account_data["bank"],
                                "pemilik_rekening": account_data["owner"],
                                "waktu": datetime.now().isoformat(),
                                "priority_score": random.randint(70, 90),
                                "oss_key": oss_key,
                                "cluster_id": f"website_{site_idx}",
                                "pooling_rank": pool_idx + 1
                            })
                            
                        elif account_data["type"] == "EWallet":
                            # Create e-wallet
                            ewallet_query = """
                            MERGE (e:EWallet {wallet_id: $wallet_id})
                            SET e.wallet_type = $wallet_type,
                                e.phone_number = $phone_number,
                                e.owner_name = $owner_name,
                                e.registration_date = $waktu,
                                e.priority_score = $priority_score,
                                e.oss_key = $oss_key,
                                e.cluster_id = $cluster_id,
                                e.connections = 5,
                                e.pooling_rank = $pooling_rank,
                                e.is_test_data = true
                            """
                            
                            session.run(ewallet_query, {
                                "wallet_id": account_identifier,
                                "wallet_type": account_data["wallet_type"],
                                "phone_number": account_identifier,
                                "owner_name": account_data["owner"],
                                "waktu": datetime.now().isoformat(),
                                "priority_score": random.randint(70, 90),
                                "oss_key": oss_key,
                                "cluster_id": f"website_{site_idx}",
                                "pooling_rank": pool_idx + 1
                            })
                            
                        elif account_data["type"] == "QRIS":
                            # Create QRIS as a special account type
                            qris_query = """
                            MERGE (q:QRIS {qris_id: $qris_id})
                            SET q.merchant_name = $merchant_name,
                                q.qris_number = $qris_number,
                                q.registration_date = $waktu,
                                q.priority_score = $priority_score,
                                q.oss_key = $oss_key,
                                q.cluster_id = $cluster_id,
                                q.connections = 5,
                                q.pooling_rank = $pooling_rank,
                                q.is_test_data = true
                            """
                            
                            session.run(qris_query, {
                                "qris_id": account_identifier,
                                "merchant_name": account_data["owner"],
                                "qris_number": account_identifier,
                                "waktu": datetime.now().isoformat(),
                                "priority_score": random.randint(70, 90),
                                "oss_key": oss_key,
                                "cluster_id": f"website_{site_idx}",
                                "pooling_rank": pool_idx + 1
                            })
                        
                        # Create relationship with gambling site
                        if account_data["type"] == "AkunMencurigakan":
                            site_relationship_query = """
                            MATCH (g:SitusJudi {url: $site_url})
                            MATCH (a:AkunMencurigakan {nomor_rekening: $account_number})
                            MERGE (g)-[:MENGGUNAKAN_REKENING]->(a)
                            """
                        elif account_data["type"] == "EWallet":
                            site_relationship_query = """
                            MATCH (g:SitusJudi {url: $site_url})
                            MATCH (e:EWallet {wallet_id: $account_number})
                            MERGE (g)-[:MENGGUNAKAN_REKENING]->(e)
                            """
                        elif account_data["type"] == "QRIS":
                            site_relationship_query = """
                            MATCH (g:SitusJudi {url: $site_url})
                            MATCH (q:QRIS {qris_id: $account_number})
                            MERGE (g)-[:MENGGUNAKAN_REKENING]->(q)
                            """
                        
                        session.run(site_relationship_query, {
                            "site_url": site["url"],
                            "account_number": account_identifier
                        })
                        
                        pooling_account_ids.append(account_identifier)
                        created_entities.append({
                            "type": account_data["type"],
                            "identifier": account_identifier,
                            "cluster": f"website_{site_idx}",
                            "associated_website": site["url"],
                            "bank": account_data.get("bank", account_data.get("wallet_type", "QRIS")),
                            "pooling_rank": pool_idx + 1,
                            "owner": account_data["owner"]
                        })
                
                # 3. Create 1 Layer-2 Account (top-level aggregator)
                logger.info("🔝 Creating 1 layer-2 aggregator account...")
                
                oss_key = demo_oss_keys[entity_counter % len(demo_oss_keys)]
                entity_counter += 1
                
                # Use distinctive bank for layer-2 account
                account_number = f"{random.randint(1000000000, 9999999999)}"
                
                account_query = """
                MERGE (a:AkunMencurigakan {nomor_rekening: $nomor_rekening})
                SET a.jenis_akun = 'CHECKING',
                    a.nama_bank = 'CIMB Niaga',
                    a.pemilik_rekening = $pemilik_rekening,
                    a.terakhir_update = $waktu,
                    a.priority_score = $priority_score,
                    a.oss_key = $oss_key,
                    a.cluster_id = 'layer2',
                    a.connections = 12,
                    a.is_test_data = true
                """
                
                session.run(account_query, {
                    "nomor_rekening": account_number,
                    "pemilik_rekening": "Top Level Aggregator",
                    "waktu": datetime.now().isoformat(),
                    "priority_score": random.randint(85, 100),
                    "oss_key": oss_key
                })
                
                layer2_account_id = account_number
                created_entities.append({
                    "type": "AkunMencurigakan",
                    "identifier": account_number,
                    "cluster": "layer2"
                })
                
                # Create transaction relationships following the hierarchy pattern
                logger.info("💸 Creating transaction hierarchy with 3-5 players per pooling account...")
                
                transaction_count = 0
                
                # Define common transaction query
                transaction_query = """
                MATCH (from_entity {is_test_data: true})
                MATCH (to_entity {is_test_data: true}) 
                WHERE ((from_entity:AkunMencurigakan AND from_entity.nomor_rekening = $from_identifier) OR
                    (from_entity:EWallet AND from_entity.wallet_id = $from_identifier)) AND
                    ((to_entity:AkunMencurigakan AND to_entity.nomor_rekening = $to_identifier) OR
                    (to_entity:EWallet AND to_entity.wallet_id = $to_identifier) OR
                    (to_entity:QRIS AND to_entity.qris_id = $to_identifier))
                CREATE (from_entity)-[t:TRANSFERS_TO {
                    amount: $amount,
                    timestamp: $timestamp,
                    reference: $reference,
                    is_test_data: true
                }]->(to_entity)
                """
                
                # 1. Player Accounts → Pooling Accounts (3-5 players per pooling account)
                logger.info("🎮 Creating Player → Pooling transfers (3-5 players per pooling account)...")
                
                # Shuffle player accounts for random distribution
                shuffled_players = player_account_ids.copy()
                random.shuffle(shuffled_players)
                
                player_idx = 0
                for pooling_id in pooling_account_ids:
                    # Each pooling account gets 3-5 players
                    num_players_for_this_pooling = random.randint(3, 5)
                    
                    for _ in range(num_players_for_this_pooling):
                        if player_idx < len(shuffled_players):
                            player_id = shuffled_players[player_idx]
                            
                            try:
                                session.run(transaction_query, {
                                    "from_identifier": player_id,
                                    "to_identifier": pooling_id,
                                    "amount": random.randint(500000, 2000000),  # 500k - 2M IDR
                                    "timestamp": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                                    "reference": f"PLY{random.randint(100000, 999999)}"
                                })
                                transaction_count += 1
                                logger.debug(f"Player {player_id} → Pooling {pooling_id}")
                            except Exception as e:
                                logger.debug(f"Player→Pooling transaction failed: {e}")
                            
                            player_idx += 1
                
                # Handle remaining players (distribute them randomly to pooling accounts)
                while player_idx < len(shuffled_players):
                    pooling_target = random.choice(pooling_account_ids)
                    player_id = shuffled_players[player_idx]
                    
                    try:
                        session.run(transaction_query, {
                            "from_identifier": player_id,
                            "to_identifier": pooling_target,
                            "amount": random.randint(500000, 2000000),
                            "timestamp": (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
                            "reference": f"PLY{random.randint(100000, 999999)}"
                        })
                        transaction_count += 1
                        logger.debug(f"Remaining Player {player_id} → Pooling {pooling_target}")
                    except Exception as e:
                        logger.debug(f"Remaining Player→Pooling transaction failed: {e}")
                    
                    player_idx += 1
                
                # 2. Pooling Accounts → Layer-2 Account
                logger.info("🏦 Creating Pooling → Layer-2 transfers...")
                for pooling_id in pooling_account_ids:
                    # Special query for QRIS to Layer-2
                    qris_to_layer2_query = """
                    MATCH (from_entity:QRIS {qris_id: $from_identifier, is_test_data: true})
                    MATCH (to_entity:AkunMencurigakan {nomor_rekening: $to_identifier, is_test_data: true})
                    CREATE (from_entity)-[t:TRANSFERS_TO {
                        amount: $amount,
                        timestamp: $timestamp,
                        reference: $reference,
                        is_test_data: true
                    }]->(to_entity)
                    """
                    
                    try:
                        # Try regular transaction query first
                        session.run(transaction_query, {
                            "from_identifier": pooling_id,
                            "to_identifier": layer2_account_id,
                            "amount": random.randint(2000000, 10000000),  # 2M - 10M IDR
                            "timestamp": (datetime.now() - timedelta(days=random.randint(1, 15))).isoformat(),
                            "reference": f"AGG{random.randint(100000, 999999)}"
                        })
                        transaction_count += 1
                        logger.debug(f"Pooling {pooling_id} → Layer-2 {layer2_account_id}")
                    except Exception:
                        # If that fails, try QRIS-specific query
                        try:
                            session.run(qris_to_layer2_query, {
                                "from_identifier": pooling_id,
                                "to_identifier": layer2_account_id,
                                "amount": random.randint(2000000, 10000000),
                                "timestamp": (datetime.now() - timedelta(days=random.randint(1, 15))).isoformat(),
                                "reference": f"AGG{random.randint(100000, 999999)}"
                            })
                            transaction_count += 1
                            logger.debug(f"QRIS Pooling {pooling_id} → Layer-2 {layer2_account_id}")
                        except Exception as e:
                            logger.debug(f"Pooling→Layer2 transaction failed: {e}")
                
                logger.info(f"✅ Created {transaction_count} transaction relationships in hierarchy")
                
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
                
                # Get account distribution per website
                account_distribution_query = """
                MATCH (site:SitusJudi)-[]->(account {is_test_data: true})
                WHERE account.cluster_id STARTS WITH 'website_'
                RETURN site.url as website, site.name as site_name, 
                       labels(account)[0] as account_type, 
                       CASE 
                           WHEN account:AkunMencurigakan THEN account.nama_bank
                           WHEN account:EWallet THEN account.wallet_type
                           WHEN account:QRIS THEN 'QRIS'
                           ELSE 'Unknown'
                       END as account_subtype,
                       count(account) as count
                ORDER BY website, account_type
                """
                
                dist_result = session.run(account_distribution_query)
                account_distribution = [dict(record) for record in dist_result]
                
                logger.info("🎬 Real website data seeding completed successfully!")
                logger.info(f"📊 Created nodes: {counts}")
                logger.info(f"🔗 Created relationships: {rel_counts}")
                logger.info(f"💸 Total transactions created: {transaction_count}")
                logger.info(f"🎮 Player accounts: {len(player_account_ids)}")
                logger.info(f"🏦 Pooling accounts: {len(pooling_account_ids)} ({total_pooling_accounts} total)")
                logger.info(f"🔝 Layer-2 account: {layer2_account_id}")
                logger.info(f"🏛️ Account distribution: {account_distribution}")
                
                return {
                    "success": True,
                    "nodes_created": counts,
                    "relationships_created": rel_counts,
                    "total_nodes": sum(counts.values()),
                    "total_transactions": transaction_count,
                    "gambling_sites": len(gambling_websites),
                    "network_structure": {
                        "player_accounts": len(player_account_ids),
                        "pooling_accounts": len(pooling_account_ids),
                        "layer2_account": 1,
                        "hierarchy": "Players (3-5 per pooling) → Real Pooling Accounts → Layer-2 Account"
                    },
                    "real_website_data": {
                        "cina18_accounts": len(gambling_websites[0]["accounts"]),
                        "maxwin29_accounts": len(gambling_websites[1]["accounts"]),
                        "kaiko30_accounts": len(gambling_websites[2]["accounts"]),
                        "account_distribution": account_distribution
                    },
                    "demo_features": {
                        "player_accounts": player_account_ids,
                        "pooling_accounts": pooling_account_ids,
                        "layer2_account": layer2_account_id,
                        "oss_keys_used": demo_oss_keys,
                        "transaction_rules": {
                            "player_to_pooling": "3-5 players transfer to each pooling account",
                            "pooling_to_layer2": "Each pooling account transfers only to the single layer-2 account",
                            "player_distribution": "Players can connect to multiple pooling accounts"
                        },
                        "money_flow": "Players (3-5:1) → Real Pooling Accounts (N:1) → Layer-2 Account"
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