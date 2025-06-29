from neo4j import GraphDatabase
import os
import logging
from typing import List, Optional
from datetime import datetime
from .model import GamblingSiteData, SuspiciousAccount, CryptoWallet, PaymentMethod

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
            logger.error("Cannot store data - database not connected")
            return False
            
        try:
            with self.driver.session() as session:
                site_query = """
                MERGE (g:SitusJudi {url: $url})
                SET g.nama = $nama,
                    g.waktu_ekstraksi = $waktu
                RETURN g
                """
                
                session.run(site_query, {
                    "url": data.site_url,
                    "nama": data.site_name,
                    "waktu": data.extraction_timestamp.isoformat()
                })
                
                for account in data.suspicious_accounts:
                    self._store_suspicious_account(session, data.site_url, account)
                
                for wallet in data.crypto_wallets:
                    self._store_crypto_wallet(session, data.site_url, wallet)
                
                for payment in data.payment_methods:
                    self._store_payment_method(session, data.site_url, payment)
                
                logger.info(f"Berhasil simpan data untuk situs: {data.site_url}")
                return True
                
        except Exception as e:
            logger.error(f"Gagal simpan data situs judi: {e}")
            return False
    
    def _store_suspicious_account(self, session, site_url: str, account: SuspiciousAccount):
        account_query = """
        MATCH (g:SitusJudi {url: $site_url})
        MERGE (a:AkunMencurigakan {nomor_rekening: $nomor_rekening})
        SET a.jenis_akun = $jenis_akun,
            a.nama_bank = $nama_bank,
            a.pemilik_rekening = $pemilik_rekening,
            a.terakhir_update = $waktu
        MERGE (g)-[:MENGGUNAKAN_REKENING]->(a)
        """
        
        session.run(account_query, {
            "site_url": site_url,
            "nomor_rekening": account.account_number,
            "jenis_akun": account.account_type.value,
            "nama_bank": account.bank_name,
            "pemilik_rekening": account.account_holder,
            "waktu": datetime.now().isoformat()
        })
    
    def _store_crypto_wallet(self, session, site_url: str, wallet: CryptoWallet):
        wallet_query = """
        MATCH (g:SitusJudi {url: $site_url})
        MERGE (c:CryptoWallet {alamat_wallet: $alamat_wallet})
        SET c.cryptocurrency = $cryptocurrency,
            c.terakhir_update = $waktu
        MERGE (g)-[:MENGGUNAKAN_CRYPTO]->(c)
        """
        
        session.run(wallet_query, {
            "site_url": site_url,
            "alamat_wallet": wallet.wallet_address,
            "cryptocurrency": wallet.cryptocurrency,
            "waktu": datetime.now().isoformat()
        })
    
    def _store_payment_method(self, session, site_url: str, payment: PaymentMethod):
        payment_query = """
        MATCH (g:SitusJudi {url: $site_url})
        MERGE (p:MetodePembayaran {provider: $provider, jenis: $jenis})
        SET p.info_akun = $info_akun,
            p.terakhir_update = $waktu
        MERGE (g)-[:MENERIMA_PEMBAYARAN]->(p)
        """
        
        session.run(payment_query, {
            "site_url": site_url,
            "provider": payment.provider,
            "jenis": payment.method_type,
            "info_akun": str(payment.account_info),
            "waktu": datetime.now().isoformat()
        })
    
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