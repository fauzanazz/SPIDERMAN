from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum
class AccountType(str, Enum):
    BANK_ACCOUNT = "bank_account"
    CRYPTO_WALLET = "crypto_wallet"
    PAYMENT_PROCESSOR = "payment_processor"
    MOBILE_MONEY = "mobile_money"

class SiteInfo(BaseModel):
    site_name: str
    site_url: str
    site_language: Optional[str] = None
    registration_success: Optional[bool] = None
    accessibility_notes: Optional[str] = None

class BankAccount(BaseModel):
    account_type: AccountType = AccountType.BANK_ACCOUNT
    bank_name: str
    account_number: str
    account_holder: str
    bank_code: Optional[str] = None
    account_type_detail: Optional[str] = None
    min_deposit: Optional[float] = None
    max_deposit: Optional[float] = None
    processing_time: Optional[str] = None
    page_found: Optional[str] = None
    oss_key: Optional[str] = None


class DigitalWallet(BaseModel):
    wallet_type: str
    wallet_number: Optional[str] = None
    wallet_name: Optional[str] = None
    qr_code_available: bool = False
    min_amount: Optional[float] = None
    page_found: Optional[str] = None
    oss_key: Optional[str] = None



class CryptoWallet(BaseModel):
    account_type: AccountType = AccountType.CRYPTO_WALLET
    wallet_address: Optional[str] = Field(None, description="Alamat wallet")
    cryptocurrency: Optional[str] = Field(None, description="Jenis cryptocurrency")
    additional_info: Optional[str] = Field(None, description="Informasi tambahan tentang wallet")


class PaymentGateway(BaseModel):
    gateway_name: str
    supported_methods: List[str] = Field(default_factory=list)
    processing_time: Optional[str] = None
    fees: Optional[str] = None
    page_found: Optional[str] = None

class GamblingSiteData(BaseModel):
    site_info: SiteInfo
    bank_accounts: List[BankAccount] = Field(default_factory=list)
    crypto_wallets: List[CryptoWallet] = Field(default_factory=list)
    payment_gateways: List[PaymentGateway] = Field(default_factory=list)


class PaymentDiscoveryResult(BaseModel):
    payment_methods: List[str] = Field(default_factory=list, description="List of discovered payment methods")
class CrawlResult(BaseModel):
    task_id: str
    status: str
    gambling_site_data: Optional[GamblingSiteData] = None
    error_message: Optional[str] = None
    processing_time: Optional[float] = None
