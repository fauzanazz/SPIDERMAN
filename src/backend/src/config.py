import os
import random
import string
from datetime import datetime
from browser_use.llm import ChatGoogle

# Browser-use configuration
llm_config = ChatGoogle(model="gemini-2.5-flash")

# Random identity generators for registration
def generate_random_identity():
    """Generate random Indonesian identity for registration"""
    
    # Common Indonesian first names
    first_names = [
        "Ahmad", "Budi", "Sari", "Dewi", "Andi", "Nina", "Rizki", "Maya", 
        "Doni", "Lina", "Arif", "Wati", "Bayu", "Sinta", "Rama", "Indah",
        "Fajar", "Ratna", "Dimas", "Putri", "Hadi", "Rini", "Yoga", "Fitri"
    ]
    
    # Common Indonesian last names
    last_names = [
        "Pratama", "Sari", "Wibowo", "Utami", "Santoso", "Rahayu", "Kusuma", 
        "Pertiwi", "Wijaya", "Lestari", "Setiawan", "Anggraini", "Nugroho",
        "Maharani", "Hidayat", "Safitri", "Gunawan", "Permatasari", "Susanto", "Handayani"
    ]
    
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    full_name = f"{first_name} {last_name}"
    
    # Generate username variations
    username_patterns = [
        f"{first_name.lower()}{last_name.lower()}",
        f"{first_name.lower()}{random.randint(10, 99)}",
        f"{first_name.lower()}_{last_name.lower()}",
        f"{first_name.lower()}{random.randint(1990, 2005)}",
        f"{last_name.lower()}{random.randint(10, 999)}"
    ]
    username = random.choice(username_patterns)
    
    # Generate password
    password_base = random.choice(["password", "qwerty", "123456", first_name.lower(), "admin"])
    password = f"{password_base}{random.randint(10, 9999)}"
    
    # Generate email
    email_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]
    email = f"{username}@{random.choice(email_domains)}"
    
    # Generate Indonesian phone number
    phone_prefixes = ["0811", "0812", "0813", "0821", "0822", "0851", "0852", "0853", "0815", "0816"]
    phone = f"{random.choice(phone_prefixes)}{random.randint(1000000, 9999999)}"
    
    # Generate bank info
    indonesian_banks = [
        {"name": "BCA", "code": "014"},
        {"name": "BRI", "code": "002"},
        {"name": "BNI", "code": "009"},
        {"name": "Mandiri", "code": "008"},
        {"name": "CIMB Niaga", "code": "022"},
        {"name": "Danamon", "code": "011"},
        {"name": "Permata", "code": "013"},
        {"name": "BTN", "code": "200"},
        {"name": "BII", "code": "016"},
        {"name": "Panin", "code": "019"}
    ]
    
    bank = random.choice(indonesian_banks)
    account_number = ''.join([str(random.randint(0, 9)) for _ in range(random.randint(10, 16))])
    
    # Generate birth date (18-50 years old)
    birth_year = random.randint(1974, 2006)
    birth_month = random.randint(1, 12)
    birth_day = random.randint(1, 28)
    birth_date = f"{birth_day:02d}/{birth_month:02d}/{birth_year}"
    
    return {
        "full_name": full_name,
        "first_name": first_name,
        "last_name": last_name,
        "username": username,
        "password": password,
        "email": email,
        "phone": phone,
        "bank_name": bank["name"],
        "bank_code": bank["code"],
        "bank_account_number": account_number,
        "birth_date": birth_date,
        "age": datetime.now().year - birth_year
    }

def get_random_user_agent():
    """Get random user agent for browser"""
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ]
    return random.choice(user_agents)

# Task instruction for browser-use agent
extraction_instruction = """
MISSION: Extract financial account information and payment methods from Indonesian online gambling/gaming websites.

=== STEP 1: PREPARATION ===
1. Generate a random Indonesian identity using the provided generator function
2. Use stealth browsing techniques (random delays, human-like mouse movements)
3. Clear cookies and use incognito mode if possible
4. Use random user agent strings

=== STEP 2: RECONNAISSANCE ===
Before registering, explore the site to understand:
- Registration requirements and validation rules
- Available languages (prefer Indonesian/Bahasa)
- Site structure and navigation
- Security measures (CAPTCHA, email verification, etc.)
- Deposit/withdrawal page locations

=== STEP 3: REGISTRATION STRATEGY ===
Use the generated random identity to register. Common registration paths:
a) Look for "Daftar", "Register", "Sign Up", "Gabung" buttons
b) Try multiple registration approaches if first fails:
   - Main registration form
   - Mobile registration
   - Social media registration (if available)
   - Agent/referral registration

Registration form filling strategy:
- Fill all required fields with generated identity data
- Use realistic but fake information
- Accept terms and conditions
- Handle CAPTCHA: Analyze image/text carefully and solve step by step
- Handle phone/email verification: Note requirements but continue exploration

=== STEP 4: ACCOUNT ACCESS ===
After registration, attempt login and navigate to financial sections:
- Member dashboard/profile
- Deposit/Top-up pages ("Deposit", "Isi Saldo", "Top Up")
- Withdrawal pages ("Withdraw", "Tarik Dana", "Penarikan")
- Payment methods ("Metode Pembayaran", "Cara Bayar")
- Banking information pages
- Promotions/bonuses (often show payment methods)
- Help/FAQ sections about payments

=== STEP 5: FINANCIAL INFORMATION EXTRACTION ===

TARGET INFORMATION TO EXTRACT:

1. INDONESIAN BANK ACCOUNTS:
   - Bank account numbers (typically 8-16 digits)
   - Bank names: BCA, BRI, BNI, Mandiri, CIMB, Danamon, Permata, BTN, Panin, etc.
   - Account holder names (individual or company names)
   - Bank codes or SWIFT codes
   - Minimum/maximum transfer amounts
   - Transfer instructions and references

2. DIGITAL WALLETS & E-MONEY:
   - GoPay, OVO, DANA, LinkAja, ShopeePay numbers
   - QRIS codes and merchant IDs
   - Cryptocurrency wallet addresses (Bitcoin, Ethereum, USDT, etc.)
   - International wallets (PayPal, Skrill, Neteller)

3. PAYMENT GATEWAYS:
   - Midtrans, Xendit, DOKU, Faspay integration
   - Credit/debit card processing
   - Installment payment options
   - Mobile credit and voucher systems

4. ADDITIONAL FINANCIAL DATA:
   - Exchange rates and conversion fees
   - Processing times for deposits/withdrawals
   - Customer service contacts for financial issues
   - Suspicious patterns or money laundering indicators

=== STEP 6: EXTRACTION TECHNIQUES ===

Navigate through these specific areas:
- Dashboard → Deposit → View all payment methods
- Try to initiate a small deposit to see account details
- Check withdrawal page for receiving account requirements
- Look for "Bank Transfer" or "Transfer Bank" options
- Search for customer service chat (often reveals payment accounts)
- Check mobile app links or QR codes
- Look for partner bank logos and click them
- Check promotional materials for bonus payment methods

TECHNICAL EXTRACTION METHODS:
- Take screenshots of payment pages
- Copy account numbers and bank details
- Note any QR codes or payment links
- Record minimum deposit amounts
- Document processing fees and timeframes
- Save any contact information for financial departments

=== STEP 7: VERIFICATION & VALIDATION ===
- Cross-verify account numbers across multiple pages
- Check if bank accounts are consistent across deposit/withdrawal
- Validate Indonesian bank account number formats
- Note any suspicious patterns or inconsistencies
- Document the site's primary language and target audience

=== STEP 8: DATA STRUCTURING ===
Organize collected data in JSON format:

{
  "site_info": {
    "site_name": "exact site name",
    "site_url": "full URL",
    "extraction_timestamp": "current timestamp",
    "site_language": "primary language",
    "registration_success": true/false,
    "accessibility_notes": "any access issues encountered"
  },
  "bank_accounts": [
    {
      "bank_name": "bank name",
      "account_number": "account number",
      "account_holder": "account holder name",
      "bank_code": "bank code if available",
      "account_type": "personal/corporate",
      "min_deposit": "minimum amount",
      "max_deposit": "maximum amount",
      "processing_time": "processing duration",
      "page_found": "which page this was found on"
    }
  ],
  "digital_wallets": [
    {
      "wallet_type": "GoPay/OVO/DANA/etc",
      "wallet_number": "account number",
      "wallet_name": "account holder",
      "qr_code_available": true/false,
      "min_amount": "minimum transaction",
      "page_found": "source page"
    }
  ],
  "crypto_wallets": [
    {
      "cryptocurrency": "Bitcoin/Ethereum/USDT/etc",
      "wallet_address": "full wallet address",
      "network": "blockchain network",
      "min_deposit": "minimum amount",
      "page_found": "source page"
    }
  ],
  "payment_gateways": [
    {
      "gateway_name": "Midtrans/Xendit/etc",
      "supported_methods": ["credit card", "bank transfer", "etc"],
      "merchant_id": "if visible",
      "fees": "processing fees",
      "page_found": "source page"
    }
  ],
  "additional_info": {
    "customer_service_contacts": ["phone", "email", "chat"],
    "suspicious_indicators": ["any red flags noticed"],
    "security_measures": ["CAPTCHA", "email verification", "etc"],
    "mobile_app_info": "mobile app details if available"
  }
}

=== IMPORTANT BEHAVIORAL GUIDELINES ===
- Act like a normal user, not a bot
- Use random delays between actions (1-5 seconds)
- Handle errors gracefully and try alternative approaches
- If blocked, try different registration methods or wait and retry
- Document any anti-bot measures encountered
- Respect rate limits and avoid suspicious rapid-fire requests
- If registration fails, still try to extract publicly available payment info
- Take note of any geographical restrictions or IP blocking

=== SECURITY & ETHICS ===
- Only extract publicly visible financial information
- Do not attempt to access other users' accounts
- Do not perform actual financial transactions
- Use only dummy/fake personal information for registration
- Document findings for analysis purposes only
- Respect website terms of service where possible
"""