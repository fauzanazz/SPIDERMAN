from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

class AccountType(str, Enum):
    BANK_ACCOUNT = "bank_account"
    CRYPTO_WALLET = "crypto_wallet"
    PAYMENT_PROCESSOR = "payment_processor"
    MOBILE_MONEY = "mobile_money"

class SuspiciousAccount(BaseModel):
    account_number: str = Field(..., description="Nomor rekening atau identifier")
    account_type: AccountType = Field(..., description="Jenis akun keuangan")
    bank_name: Optional[str] = Field(None, description="Nama bank")
    account_holder: Optional[str] = Field(None, description="Nama pemilik rekening")
    
class CryptoWallet(BaseModel):
    wallet_address: str = Field(..., description="Alamat wallet")
    cryptocurrency: str = Field(..., description="Jenis cryptocurrency")
    
class PaymentMethod(BaseModel):
    method_type: str = Field(..., description="Jenis metode pembayaran")
    provider: str = Field(..., description="Penyedia layanan")
    account_info: Dict[str, Any] = Field(default_factory=dict, description="Informasi akun tambahan")
    
class GamblingSiteData(BaseModel):
    site_url: str = Field(..., description="URL situs judi")
    site_name: Optional[str] = Field(None, description="Nama situs judi")
    extraction_timestamp: datetime = Field(default_factory=datetime.now, description="Waktu ekstraksi data")
    suspicious_accounts: List[SuspiciousAccount] = Field(default_factory=list, description="Akun mencurigakan yang ditemukan")
    crypto_wallets: List[CryptoWallet] = Field(default_factory=list, description="Wallet crypto yang ditemukan")
    payment_methods: List[PaymentMethod] = Field(default_factory=list, description="Metode pembayaran yang ditemukan")

class CrawlResult(BaseModel):
    task_id: str
    status: str
    gambling_site_data: Optional[GamblingSiteData] = None
    error_message: Optional[str] = None
    processing_time: Optional[float] = None

# For crawl4ai extraction
class Product(BaseModel):
    name: str
    price: float