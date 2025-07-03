import re
import json
import logging
from typing import Optional
from browser_use import Agent
import datetime

from .config import llm_config, extraction_instruction
from .model import GamblingSiteData, SuspiciousAccount, CryptoWallet, PaymentMethod, AccountType

logger = logging.getLogger(__name__)

class IndonesianAccountExtractor:
    def __init__(self):
        # Pola untuk bank Indonesia
        self.patterns = {
            'bank_account': r'\b\d{8,16}\b',  # Nomor rekening Indonesia 8-16 digit
            'phone_number': r'\b08\d{8,11}\b',  # Nomor HP Indonesia untuk e-wallet
            'bitcoin': r'\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b|bc1[a-z0-9]{39,59}\b',
            'ethereum': r'\b0x[a-fA-F0-9]{40}\b',
        }
        
        # Bank-bank Indonesia
        self.indonesian_banks = [
            'bca', 'bri', 'bni', 'mandiri', 'cimb', 'danamon', 'permata',
            'btn', 'mega', 'maybank', 'panin', 'ocbc', 'hsbc', 'citibank',
            'uob', 'commonwealth', 'bukopin', 'bjb', 'bsi', 'muamalat'
        ]
        
        # E-wallet dan payment Indonesia
        self.indonesian_payments = [
            'gopay', 'ovo', 'dana', 'linkaja', 'shopeepay', 'sakuku',
            'tcash', 'doku', 'midtrans', 'xendit', 'faspay', 'nicepay',
            'veritrans', 'ipaymu', 'paypal', 'skrill'
        ]
    
    async def extract_financial_data(self, url: str) -> GamblingSiteData:
        try:
            task = f"Navigate to {url} and {extraction_instruction}"
            
            agent = Agent(
                task=task,
                llm=llm_config,
            )
            
            # Run the agent
            result = await agent.run()

            with open(f"log/{datetime.date.today}.json", 'w') as f:
                f.write(result)
            
            # Parse the result
            gambling_data = await self._parse_agent_result(url, result)
            
            # Enhance with pattern matching if we have text content
            if hasattr(result, 'text') and result.text:
                await self._enhance_with_patterns(gambling_data, result.text)
            elif hasattr(result, 'content') and result.content:
                await self._enhance_with_patterns(gambling_data, str(result.content))
            
            logger.info(f"Berhasil ekstrak data dari {url}")
            return gambling_data
                
        except Exception as e:
            logger.error(f"Error ekstrak data dari {url}: {e}")
            return self._create_error_result(url, str(e))
    
    async def _parse_agent_result(self, url: str, result) -> GamblingSiteData:
        try:
            # Try to extract JSON from the result
            extracted_data = None
            
            # Check if result has structured data
            if hasattr(result, 'extracted_content') and result.extracted_content:
                extracted_data = result.extracted_content
            elif hasattr(result, 'data') and result.data:
                extracted_data = result.data
            elif hasattr(result, 'content'):
                # Try to find JSON in the content
                content_str = str(result.content)
                try:
                    # Look for JSON pattern in the response
                    json_match = re.search(r'\{.*\}', content_str, re.DOTALL)
                    if json_match:
                        extracted_data = json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            
            if extracted_data and isinstance(extracted_data, dict):
                return GamblingSiteData(
                    site_url=url,
                    site_name=extracted_data.get('site_name'),
                    suspicious_accounts=[
                        SuspiciousAccount(**acc) for acc in extracted_data.get('suspicious_accounts', [])
                    ],
                    crypto_wallets=[
                        CryptoWallet(**wallet) for wallet in extracted_data.get('crypto_wallets', [])
                    ],
                    payment_methods=[
                        PaymentMethod(**method) for method in extracted_data.get('payment_methods', [])
                    ]
                )
            
            return GamblingSiteData(site_url=url)
            
        except Exception as e:
            logger.warning(f"Gagal parse hasil agent untuk {url}: {e}")
            return GamblingSiteData(site_url=url)
    
    async def _enhance_with_patterns(self, gambling_data: GamblingSiteData, content: str):
        if not content:
            return
        
        content_lower = content.lower()
        
        # Cari nomor rekening bank Indonesia
        bank_accounts = re.findall(self.patterns['bank_account'], content)
        for account_num in bank_accounts:
            if len(account_num) >= 8:
                # Cek apakah ada nama bank di sekitar nomor rekening
                bank_name = self._find_bank_name(content_lower)
                gambling_data.suspicious_accounts.append(
                    SuspiciousAccount(
                        account_number=account_num,
                        account_type=AccountType.BANK_ACCOUNT,
                        bank_name=bank_name
                    )
                )
        
        # Cari nomor HP untuk e-wallet
        phone_numbers = re.findall(self.patterns['phone_number'], content)
        for phone in phone_numbers:
            gambling_data.suspicious_accounts.append(
                SuspiciousAccount(
                    account_number=phone,
                    account_type=AccountType.MOBILE_MONEY,
                    bank_name="E-Wallet (HP)"
                )
            )
        
        # Cari alamat crypto
        bitcoin_addresses = re.findall(self.patterns['bitcoin'], content)
        for address in bitcoin_addresses:
            gambling_data.crypto_wallets.append(
                CryptoWallet(
                    wallet_address=address,
                    cryptocurrency="Bitcoin"
                )
            )
        
        ethereum_addresses = re.findall(self.patterns['ethereum'], content)
        for address in ethereum_addresses:
            gambling_data.crypto_wallets.append(
                CryptoWallet(
                    wallet_address=address,
                    cryptocurrency="Ethereum"
                )
            )
        
        # Cari metode pembayaran Indonesia
        for payment in self.indonesian_payments:
            if payment in content_lower:
                gambling_data.payment_methods.append(
                    PaymentMethod(
                        method_type="e_wallet" if payment in ['gopay', 'ovo', 'dana', 'linkaja', 'shopeepay'] else "payment_gateway",
                        provider=payment.upper()
                    )
                )
    
    def _find_bank_name(self, content: str) -> Optional[str]:
        content_lower = content.lower()
        for bank in self.indonesian_banks:
            if bank.lower() in content_lower:
                return bank.upper()
        return None
    
    def _create_error_result(self, url: str, error_message: str) -> GamblingSiteData:
        return GamblingSiteData(site_url=url)

indonesian_extractor = IndonesianAccountExtractor()

async def extract_gambling_financial_data(url: str) -> GamblingSiteData:
    return await indonesian_extractor.extract_financial_data(url)