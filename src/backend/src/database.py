from neo4j import GraphDatabase
import os
import logging
from typing import List
from datetime import datetime
from urllib.parse import urlparse
from .model import BankAccount, CryptoWallet, GamblingSiteData
logger = logging.getLogger(__name__)

class Neo4jHandler:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.username = os.getenv("NEO4J_USERNAME", "neo4j")
        self.password = os.getenv("NEO4J_PASSWORD", "your_password")
        self.driver = None
        self.connected = False
        
    def connect(self, max_retries=10, retry_delay=5):
        import time
        
        for attempt in range(max_retries):
            try:
                self.driver = GraphDatabase.driver(
                    self.uri, 
                    auth=(self.username, self.password)
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
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL, removing path and keeping only scheme + netloc"""
        try:
            parsed = urlparse(url)
            if parsed.netloc:
                # Return scheme + netloc (e.g., https://example.com)
                domain = f"{parsed.scheme}://{parsed.netloc}"
                logger.debug(f"🌐 [DOMAIN-EXTRACT] {url} -> {domain}")
                return domain
            else:
                # If parsing fails, return original URL
                logger.warning(f"⚠️ [DOMAIN-EXTRACT] Could not parse URL: {url}")
                return url
        except Exception as e:
            logger.error(f"❌ [DOMAIN-EXTRACT] Error parsing URL {url}: {e}")
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
            logger.error("❌ [DB-ERROR] Cannot store data - database not connected")
            return False
        
        # Extract domain from the full URL to avoid duplicates with different paths
        site_domain = self._extract_domain(data.site_info.site_url)
        
        logger.info(f"🔄 [DB-START] Mulai menyimpan data untuk situs: {data.site_info.site_url}")
        logger.info(f"🌐 [DB-DOMAIN] Domain yang akan disimpan: {site_domain}")
        logger.info(f"📊 [DB-INFO] Data counts - Accounts: {len(data.bank_accounts)}, Wallets: {len(data.crypto_wallets)}, Payments: {len(data.payment_gateways)}")
    
            
        try:
            with self.driver.session() as session:
                logger.debug(f"💾 [DB-SAVE] Menyimpan node SitusJudi untuk: {site_domain}")
            
                site_query = """
                MERGE (g:SitusJudi {url: $url})
                SET g.nama = $nama,
                    g.waktu_ekstraksi = $waktu,
                    g.original_url = $original_url
                RETURN g
                """
                
                session.run(site_query, {
                    "url": site_domain,
                    "nama": data.site_info.site_name,
                    "waktu": datetime.now().isoformat(),
                    "original_url": data.site_info.site_url
                })
                logger.debug(f"✅ [DB-SUCCESS] Node SitusJudi berhasil disimpan: {site_domain}")

                # Process suspicious accounts with detailed logging
                logger.debug(f"🔄 [DB-ACCOUNTS] Memproses {len(data.bank_accounts)} akun mencurigakan...")
                for i, account in enumerate(data.bank_accounts, 1):
                    try:
                        self._store_suspicious_account(session, site_domain, account)
                        logger.debug(f"✅ [DB-ACCOUNT] {i}/{len(data.bank_accounts)} - {account.account_number} ({account.bank_name})")
                    except Exception as e:
                        logger.error(f"❌ [DB-ACCOUNT-FAILED] {i}/{len(data.bank_accounts)} - {account.account_number}: {str(e)}")
                        raise
                
                # Process crypto wallets with detailed logging
                logger.debug(f"🔄 [DB-WALLETS] Memproses {len(data.crypto_wallets)} crypto wallet...")
                for i, wallet in enumerate(data.crypto_wallets, 1):
                    try:
                        self._store_crypto_wallet(session, site_domain, wallet)
                        logger.debug(f"✅ [DB-WALLET] {i}/{len(data.crypto_wallets)} - {wallet.wallet_address} ({wallet.cryptocurrency})")
                    except Exception as e:
                        logger.error(f"❌ [DB-WALLET-FAILED] {i}/{len(data.crypto_wallets)} - {wallet.wallet_address}: {str(e)}")
                        raise
                
                # Process payment methods with detailed logging
                logger.debug(f"🔄 [DB-PAYMENTS] Memproses {len(data.payment_gateways)} metode pembayaran...")
                for i, payment in enumerate(data.payment_gateways, 1):
                    try:
                        # self._store_payment_method(session, site_domain, payment)
                        logger.debug(f"✅ [DB-PAYMENT] {i}/{len(data.payment_gateways)} - {payment.gateway_name}")
                    except Exception as e:
                        logger.error(f"❌ [DB-PAYMENT-FAILED] {i}/{len(data.payment_gateways)} - {payment.gateway_name}: {str(e)}")
                        # raise
                
                logger.info(f"🎉 [DB-COMPLETE] BERHASIL simpan semua data untuk situs: {site_domain}")
                logger.info(f"📈 [DB-SUMMARY] Tersimpan - Accounts: {len(data.bank_accounts)}, Wallets: {len(data.crypto_wallets)}, Payments: {len(data.payment_gateways)}")
                return True
                
        except Exception as e:
            logger.error(f"💥 [DB-CRITICAL-ERROR] GAGAL simpan data situs: {site_domain}")
            logger.error(f"🚨 [DB-ERROR-DETAIL] Error: {str(e)}")
            logger.error(f"🔍 [DB-ERROR-TYPE] Type: {type(e).__name__}")
            import traceback
            logger.error(f"📍 [DB-TRACEBACK] {traceback.format_exc()}")
            return False
    
    def _store_suspicious_account(self, session, site_url: str, account: BankAccount):
        logger.debug(f"🏦 [DB-ACCOUNT-DETAIL] Storing account: {account.account_number} ({account.bank_name}) for site: {site_url}")
        
        account_query = """
        MATCH (g:SitusJudi {url: $site_url})
        MERGE (a:AkunMencurigakan {nomor_rekening: $nomor_rekening})
        SET a.jenis_akun = $jenis_akun,
            a.nama_bank = $nama_bank,
            a.pemilik_rekening = $pemilik_rekening,
            a.terakhir_update = $waktu
        MERGE (g)-[:MENGGUNAKAN_REKENING]->(a)
        """
        
        try:
            session.run(account_query, {
                "site_url": site_url,
                "nomor_rekening": account.account_number,
                "jenis_akun": account.account_type.value,
                "nama_bank": account.bank_name,
                "pemilik_rekening": account.account_holder,
                "waktu": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"🚨 [DB-ACCOUNT-QUERY-FAILED] Neo4j query failed for account {account.account_number}: {str(e)}")
            raise
    
    def _store_crypto_wallet(self, session, site_url: str, wallet: CryptoWallet):
        logger.debug(f"💰 [DB-WALLET-DETAIL] Storing wallet: {wallet.wallet_address} ({wallet.cryptocurrency}) for site: {site_url}")
        
        wallet_query = """
        MATCH (g:SitusJudi {url: $site_url})
        MERGE (c:CryptoWallet {alamat_wallet: $alamat_wallet})
        SET c.cryptocurrency = $cryptocurrency,
            c.terakhir_update = $waktu
        MERGE (g)-[:MENGGUNAKAN_CRYPTO]->(c)
        """
        
        try:
            session.run(wallet_query, {
                "site_url": site_url,
                "alamat_wallet": wallet.wallet_address,
                "cryptocurrency": wallet.cryptocurrency,
                "waktu": datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"🚨 [DB-WALLET-QUERY-FAILED] Neo4j query failed for wallet {wallet.wallet_address}: {str(e)}")
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

db_handler = Neo4jHandler() 