import os
from browser_use.llm import ChatGoogle

# Browser-use configuration
llm_config = ChatGoogle(model="gemini-2.0-flash-exp"),

# Task instruction for browser-use agent
extraction_instruction = """
Extract financial account information and payment methods from Indonesian online gambling websites.
Find and identify:

1. INDONESIAN BANK ACCOUNTS:
   - Bank account numbers (8-16 digits)
   - Bank names (BCA, BRI, BNI, Mandiri, CIMB, Danamon, etc.)
   - Account holder names
   - Bank codes or transfer information

2. DIGITAL WALLETS:
   - GoPay, OVO, DANA, LinkAja, ShopeePay account numbers
   - Cryptocurrency wallet addresses (Bitcoin, Ethereum, USDT)

3. PAYMENT METHODS:
   - Local and international e-wallets
   - Payment gateways (Midtrans, Xendit, etc.)
   - Mobile credit and game vouchers

Focus on these pages:
- Deposit/funding pages
- Withdrawal pages  
- Payment methods
- Transfer guides
- Customer service/contact

The common way to find this is to Login / Register then find deposit/funding pages. There will be listed a lot of transaction type that can be used to fill user money online.

Extract all account numbers, bank names, and payment information found.
Collect data in JSON format with structure:
{
  "site_name": "site name",
  "suspicious_accounts": [{"account_number": "...", "account_type": "...", "bank_name": "...", "account_holder": "..."}],
  "crypto_wallets": [{"wallet_address": "...", "cryptocurrency": "..."}],
  "payment_methods": [{"method_type": "...", "provider": "...", "account_info": {...}}]
}
"""