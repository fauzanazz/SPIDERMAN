import os
import re
import json
import logging
import asyncio
import traceback
from typing import Optional, List
from browser_use import Agent, Controller
import datetime

from .config import llm_config, get_extraction_instruction, generate_random_identity, pre_registration_payment_discovery_prompt
from .model import AdditionalInfo, GamblingSiteData, PaymentDiscoveryResult, SiteInfo
logger = logging.getLogger(__name__)

# Standalone utility function for extracting JSON from text
def extract_json_from_text(text: str) -> str:
    """
    Extract JSON object from text string.
    
    Args:
        text (str): Text containing JSON object
        
    Returns:
        str: JSON string or empty JSON object string if parsing fails
    """
    try:
        start = text.index('{')
        end = text.rindex('}') + 1
        json_str = text[start:end]
        return json_str
    except (ValueError, json.JSONDecodeError) as e:
        print(f"Error extracting JSON: {e}")
        return '{"site_url": "unknown", "site_name": "unknown"}'

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
    
    async def discover_payment_methods(self, url: str) -> List[str]:
        """
        Pre-exploration to discover all available payment methods before registration
        
        Args:
            url (str): The gambling site URL to explore
            
        Returns:
            List[str]: List of discovered payment methods/banks
        """
        logger.info(f"🔍 [PAYMENT-DISCOVERY-START] Mulai discovery payment methods untuk: {url}")
        
        try:
            # Create agent for payment discovery
            controller = Controller(output_model=PaymentDiscoveryResult)
            agent = Agent(
                task=f"Navigate to {url} and {pre_registration_payment_discovery_prompt}",
                llm=llm_config,
                headless=False,
                controller=controller
            )
            
            logger.debug(f"🤖 [PAYMENT-DISCOVERY-AGENT] Menjalankan discovery agent untuk: {url}")
            
            # Run the discovery agent
            result = await agent.run()
        
            try:
                payment_methods: PaymentDiscoveryResult = PaymentDiscoveryResult.model_validate_json(result.final_result())
            except Exception as parse_error:
                logger.warning(f"⚠️ [PAYMENT-DISCOVERY-PARSE-ERROR] Error parsing discovery result: {str(parse_error)}")
            
            if not payment_methods:
                logger.warning(f"⚠️ [PAYMENT-DISCOVERY-EMPTY] Tidak ada payment methods ditemukan untuk: {url}")
                payment_methods = []  # Return empty list, defaults will be handled in extract_financial_data
            
            
            return payment_methods
            
        except Exception as e:
            logger.error(f"❌ [PAYMENT-DISCOVERY-ERROR] Error saat discovery payment methods untuk {url}: {str(e)}")
            logger.error(f"📍 [PAYMENT-DISCOVERY-TRACEBACK] {traceback.format_exc()}")
            return []
    
    async def extract_financial_data(self, url: str) -> GamblingSiteData:
        logger.info(f"🔄 [CRAWLER-START] Mulai ekstraksi data dari: {url}")
        
        try:
            # PHASE 1: Discover available payment methods first
            logger.info(f"🔍 [CRAWLER-PHASE-1] Pre-exploration: Discovering payment methods for: {url}")
            discovered_payment_methods = await self.discover_payment_methods(url)
            
            # Set default payment methods if discovery failed or returned empty
            if not discovered_payment_methods:
                discovered_payment_methods = ["BCA", "BRI", "BNI", "Mandiri", "DANA", "OVO", "GoPay", "USDT"]
                is_default_payment_methods = True
                logger.info(f"🏦 [CRAWLER-DEFAULT-METHODS] Using default Indonesian payment methods: {discovered_payment_methods}")
            else:
                # Extract payment methods from PaymentDiscoveryResult object
                if hasattr(discovered_payment_methods, 'payment_methods'):
                    payment_methods_list = discovered_payment_methods.payment_methods
                else:
                    payment_methods_list = discovered_payment_methods
                
                is_default_payment_methods = False
                logger.info(f"✅ [CRAWLER-DISCOVERED-METHODS] Found {len(payment_methods_list)} payment methods: {payment_methods_list}")
                # Use the extracted list for further processing
                discovered_payment_methods = payment_methods_list
            
            # PHASE 2: Generate multiple identities for comprehensive extraction
            logger.info(f"🎯 [CRAWLER-PHASE-2] Generating multiple identities for comprehensive extraction")
            
            # Generate random Indonesian identities for multiple registration attempts
            num_identities = min(len(discovered_payment_methods), 3) # Cap at 4 to avoid being too aggressive
            identities = []
            for i in range(num_identities):
                identity = generate_random_identity()
                identities.append(identity)
                logger.debug(f"🆔 [CRAWLER-IDENTITY-{i+1}] Generated identity {i+1}: {identity['full_name']} ({identity['email']})")
            
            # Get extraction instruction with multiple identities and discovered payment methods
            extraction_instruction = get_extraction_instruction(identities, discovered_payment_methods, is_default_payment_methods)
            
            # Add context about multiple identities and payment methods (indicate if default or discovered)
            task_context = f"You have {len(identities)} different Indonesian identities available for registration attempts. "
            if is_default_payment_methods:
                task_context += f"Using default Indonesian payment methods as fallback: {', '.join(discovered_payment_methods)}. Focus on discovering actual site-specific payment methods. "
            else:
                task_context += f"Based on pre-exploration, this site supports these payment methods: {', '.join(discovered_payment_methods)}. "
            task_context += "Use multiple registration attempts with different identities to discover all available payment methods and account details. "
            
            task = f"Navigate to {url} and {task_context}{extraction_instruction}"
            controller = Controller(output_model=GamblingSiteData)
            agent = Agent(
                task=task,
                llm=llm_config,
                headless=False,
                controller=controller
            )
            
            logger.debug(f"🤖 [CRAWLER-AGENT] Menjalankan agent untuk: {url}")
            
            # Run the agent with timeout
            try:
               
                result = await agent.run() 
                # logger.info(f"[CRAWLER-AGENT] result: {result.final_result()}")
                logger.debug(f"✅ [CRAWLER-AGENT-SUCCESS] Agent berhasil untuk: {url}")
            except Exception as agent_error:
                logger.error(f"❌ [CRAWLER-AGENT-FAILED] Agent gagal untuk {url}: {str(agent_error)}")
                return self._create_error_result(url, f"Agent execution failed: {str(agent_error)}")

            # Save result to log
            try:
                os.makedirs("log", exist_ok=True)
                log_filename = f"log/{datetime.datetime.today().date()}-{hash(url) % 10000}.json"
                with open(log_filename, 'w', encoding='utf-8') as f:
                    if hasattr(result, '__dict__'):
                        json.dump(result.__dict__, f, indent=2, default=str)
                    else:
                        f.write(str(result.final_result()))
                logger.debug(f"💾 [CRAWLER-LOG] Log disimpan ke: {log_filename}")
            except Exception as log_error:
                logger.warning(f"⚠️ [CRAWLER-LOG-FAILED] Gagal simpan log untuk {url}: {str(log_error)}")
            
            # Parse the result
            logger.debug(f"🔍 [CRAWLER-PARSE] Parsing hasil agent untuk: {url}")
            try:
                gambling_data: GamblingSiteData = GamblingSiteData.model_validate_json(result.final_result())
            except Exception as parse_error:
                logger.error(f"❌ [CRAWLER-PARSE-FAILED] Gagal parse JSON untuk {url}: {str(parse_error)}")
                return self._create_error_result(url, f"JSON parsing failed: {str(parse_error)}")
            
            logger.info(f"✅ [CRAWLER-SUCCESS] Berhasil ekstrak data dari {url}")
            logger.info(f"📊 [CRAWLER-SUMMARY] {url} - Accounts: {len(gambling_data.bank_accounts)}, Wallets: {len(gambling_data.crypto_wallets)}")
            return gambling_data
                
        except Exception as e:
            logger.error(f"💥 [CRAWLER-CRITICAL-ERROR] Error ekstrak data dari {url}: {str(e)}")
            logger.error(f"🔍 [CRAWLER-ERROR-TYPE] Error type: {type(e).__name__}")
            import traceback
            logger.error(f"📍 [CRAWLER-TRACEBACK] {traceback.format_exc()}")
            return self._create_error_result(url, str(e))
      
    async def _enhance_with_patterns(self, gambling_data: GamblingSiteData, content: str):
        """Enhanced pattern matching (currently disabled due to model structure changes)"""
        if not content:
            return
        
        content_lower = content.lower()
        logger.debug(f"🔍 [PATTERN-ENHANCE] Pattern matching enhancement disabled - model structure changed")
        pass
    
    def _find_bank_name(self, content: str) -> Optional[str]:
        content_lower = content.lower()
        for bank in self.indonesian_banks:
            if bank.lower() in content_lower:
                return bank.upper()
        return None
    
    def _create_error_result(self, url: str, error_message: str) -> GamblingSiteData:
        logger.warning(f"⚠️ [CRAWLER-ERROR-RESULT] Membuat error result untuk {url}: {error_message}")
        
        # Safely truncate error message to avoid format issues
        safe_error_msg = str(error_message).replace('{', '{{').replace('}', '}}')[:100]
        safe_accessibility_msg = str(error_message).replace('{', '{{').replace('}', '}}')
        
        return GamblingSiteData(
            site_info=SiteInfo(
                site_name=f"ERROR: {safe_error_msg}...",
                site_url=url,
                site_language="unknown",
                registration_success=False,
                accessibility_notes=f"Extraction failed: {safe_accessibility_msg}"
            ),
            bank_accounts=[],
            digital_wallets=[],
            crypto_wallets=[],
            payment_gateways=[],
            additional_info=AdditionalInfo(
                customer_service_contacts=[],
                suspicious_indicators=[f"Extraction failed: {safe_accessibility_msg}"],
                security_measures=[],
                withdrawal_instructions=[]
            )
        )

indonesian_extractor = IndonesianAccountExtractor()

async def extract_gambling_financial_data(url: str) -> GamblingSiteData:
    logger.info(f"🎯 [EXTRACTION-START] Memulai ekstraksi financial data untuk: {url}")
    try:
        result = await indonesian_extractor.extract_financial_data(url)
        logger.info(f"🏁 [EXTRACTION-COMPLETE] Selesai ekstraksi untuk: {url}")
        return result
    except Exception as e:
        logger.error(f"💥 [EXTRACTION-CRITICAL] Critical error saat ekstraksi {url}: {str(e)}")
        # Create a proper error result using the class method
        return indonesian_extractor._create_error_result(url, f"CRITICAL ERROR: {str(e)}")

async def discover_site_payment_methods(url: str) -> List[str]:
    """
    Standalone function to discover payment methods for a gambling site
    
    Args:
        url (str): The gambling site URL to explore
        
    Returns:
        List[str]: List of discovered payment methods/banks
    """
    logger.info(f"🔍 [STANDALONE-DISCOVERY-START] Memulai discovery payment methods untuk: {url}")
    try:
        result = await indonesian_extractor.discover_payment_methods(url)
        logger.info(f"✅ [STANDALONE-DISCOVERY-COMPLETE] Selesai discovery untuk: {url}")
        return result
    except Exception as e:
        logger.error(f"💥 [STANDALONE-DISCOVERY-ERROR] Error saat discovery {url}: {str(e)}")
        return []

# Export list for module
__all__ = [
    'extract_json_from_text',
    'extract_gambling_financial_data',
    'discover_site_payment_methods',
    'IndonesianAccountExtractor',
    'indonesian_extractor'
]