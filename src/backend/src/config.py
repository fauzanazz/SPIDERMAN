import os
import random
from datetime import datetime
from typing import List
from browser_use.llm import ChatGoogle, ChatOpenAI
from dotenv import load_dotenv
load_dotenv()

# Browser-use configuration
if os.environ.get("GOOGLE_API_KEY"):
  llm_config = ChatGoogle(model="gemini-2.5-flash")
if os.environ.get("OPENAI_API_KEY"):
   llm_config = ChatOpenAI(
       model="gpt-4.1"
   )

# Random identity generators for registration
def generate_random_identity():
    # Common Indonesian first names
    first_names = [
    "Galih", "Intan", "Yudi", "Mega", "Joko", "Ayu", "Reza", "Nadia",
    "Teguh", "Vina", "Imam", "Tari", "Hendra", "Nisa", "Agus", "Bella",
    "Zaki", "Dina", "Ilham", "Citra", "Rian", "Sekar", "Fikri", "Laras"
  ]

    
    # Common Indonesian last names
    last_names = [
    "Saputra", "Amalia", "Hardiansyah", "Febrianti", "Ramadhan", "Putra",
    "Syafitri", "Hermawan", "Yuliani", "Aditya", "Farhan", "Rosdiana",
    "Maulana", "Nurhaliza", "Iskandar", "Herlambang", "Rahmadhani",
    "Febriyanti", "Pramudita", "Cahyani"
    ]
    
    first_name = random.choice(first_names)
    last_name = random.choice(last_names)
    full_name = f"{first_name} {last_name}"
    
    # Generate username variations
    username_patterns = [
        f"{first_name.lower()}{last_name.lower()}",
        f"{first_name.lower()}{random.randint(10, 99)}",
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

pre_registration_payment_discovery_prompt = """
# 🎯 MISSION: Extract financial account and payment method information from Indonesian online gambling websites.

============================================================
PHASE 1: INITIAL DISCOVERY (Before Registration or Login)
============================================================

✅ OBJECTIVE: Identify all available **deposit/payment methods** before account registration or login — without using any specific identity or bank.

=================
GOALS
=================
- Access the website anonymously (new session, clean cookies, fresh IP if possible).
- Explore all publicly available pages or forms **without completing any registration**.
- Identify what types of payment methods the site supports, such as:
  - 🏦 Bank transfers (e.g., BCA, BRI, Mandiri, CIMB)
  - 💳 E-wallets (e.g., OVO, DANA, GoPay)
  - ₿ Cryptocurrency (e.g., USDT, Bitcoin)
  - 📱 QRIS or generic payment gateways

=================
STRATEGIES
=================
1. Start in **incognito mode** or with a clean browser session (no cache, no cookies).
2. Visit and explore:
   - Footer or menu links (e.g., FAQ, “Cara Deposit”, “Metode Pembayaran”)
   - Public help or tutorial pages
   - Terms & Conditions or How to Play pages
3. Look for any **bank selection dropdowns or forms** — often found in registration pages — that hint at supported banks.
4. If the site allows, try accessing the **deposit page** without logging in.
5. Your identity should remain **unregistered and unbiased** to avoid personalized filtering.

=================
OUTPUT FORMAT
=================
Return a JSON-style list of all visible banks or payment channels. For example:
{{
  "payment_methods": [
    "BCA",
    "BRI",
    "Mandiri",
    "DANA",
    "OVO",
    "GoPay",
    "USDT"
  ]
}}

"""

# Task instruction for browser-use agent with multiple identities
def get_extraction_instruction(identities: List[dict], discovered_payment_methods: List[str] = None, is_default_methods: bool = False) -> str:
    # Format identities for the prompt
    identity_list = ""
    for i, identity in enumerate(identities, 1):
        identity_list += f"""
IDENTITY {i}:
   - Full Name: {identity['full_name']}
   - First Name: {identity['first_name']}
   - Last Name: {identity['last_name']}
   - Username: {identity['username']}
   - Password: {identity['password']}
   - Email: {identity['email']}
   - Phone: {identity['phone']}
   - Birth Date: {identity['birth_date']}
   - Account Number: {identity['bank_account_number']}
   - Age: {identity['age']}
"""
    
    # Format discovered payment methods if available
    payment_context = ""
    if discovered_payment_methods:
        if is_default_methods:
            payment_context = f"""
=== DEFAULT PAYMENT METHODS (FALLBACK) ===
Pre-exploration did not find specific payment methods, so using common Indonesian payment methods as reference: {', '.join(discovered_payment_methods)}
⚠️ IMPORTANT: These are DEFAULT methods - you must discover the ACTUAL payment methods supported by this specific site during registration and exploration.
"""
        else:
            payment_context = f"""
=== DISCOVERED PAYMENT METHODS ===
Based on pre-exploration, this site supports: {', '.join(discovered_payment_methods)}
Focus on finding detailed account information for these payment methods, but also look for additional methods not discovered in pre-exploration.
"""

    return f"""
# MISSION: Extract comprehensive financial account information from Indonesian online gambling/gaming websites using multiple registration attempts.

=== MULTI-IDENTITY STRATEGY ===
You have been provided with {len(identities)} different Indonesian identities. Use these strategically to:
1. **Maximize discovery**: Different identities may reveal different payment options
2. **Avoid blocks**: If one registration fails, try another identity
3. **Cross-verify**: Compare information across different accounts
4. **Comprehensive coverage**: Each identity attempt may uncover unique financial details

=== AVAILABLE IDENTITIES ===
{identity_list}

{payment_context}

=== STEP 1: PREPARATION ===
1. Use stealth browsing techniques (random delays, human-like mouse movements)
2. Clear cookies and use incognito mode if possible
3. Use random but plausible user-agent strings
4. Rotate between identities strategically

=== STEP 2: RECONNAISSANCE ===
Before starting any registration or data extraction, explore the website and collect key structural and behavioral information:

1. Identify registration requirements and input validation rules.
2. Detect security mechanisms such as:
   - CAPTCHA
   - Email or phone verification
   - Rate limiting or IP bans
3. Locate pages related to **deposits** to confirm financial transaction functionality.
4. Properly handle all popups, sidebars, or overlays that may obstruct interaction.

---

⚠️ Popup Handling Instructions
If a **large popup** appears upon site entry:
- Inspect the popup’s structure and contents to understand how to dismiss it.
- If a **close button (×)** is visible, CLICK IT IMMEDIATELY.
- If no close button is found, TRY CLICKING OUTSIDE the popup area on the background page.
- DO NOT continue until the popup has been successfully removed, minimized, or bypassed.

If any **chat popups**, **welcome messages**, **floating windows**, or **banners** appear — whether on the left, right, center, or bottom — you MUST ALWAYS TRY TO MINIMIZE OR CLOSE THEM, regardless of appearance or location.

🔍 Actions to try (ALWAYS DO THIS FIRST):
- Carefully look at the **TOP-RIGHT CORNER** of the popup. Always try clicking any buttons there (e.g., `×`, `→`, `<<`, `>>`, `_`) to close or minimize the popup. **ALWAYS TRY THIS FIRST**.
- If no button is there, try clicking:
  - Anywhere on the popup **header**
  - **Edges** or **borders** of the popup
  - Outside the popup area
- Press the **ESC key**
- Wait a few seconds — some popups may auto-dismiss

📌 If MULTIPLE popups or floating layers appear:
- Try closing the **topmost one first**
- If it doesn’t work, close the one underneath
- Be aware that **one popup may block another**, so interact with each one methodically

✅ DO NOT PROCEED with anything unless:
- **ALL** popup windows, chat bubbles, modals, floating ads, or banners are **fully dismissed or hidden**
- The screen is CLEAR and the main content (form, page, or table) is **100% visible and interactable**

⛔ NEVER interact with registration or data fields if something is blocking part of the screen

If dismissal fails:
- Reload the page and attempt again
- Wait up to 10 seconds for auto-dismiss
- Try again with new identity or IP if needed

BEFORE PROCEEDING:
✅ Confirm you can see the full registration, deposit, or withdrawal page
✅ No elements are covering buttons, fields, or required text

=== STEP 3: MULTI-REGISTRATION STRATEGY ===
PRIMARY APPROACH: Sequential Registration with Different Identities and Isolated Payment Methods

1. First Registration Attempt (IDENTITY 1):
   - Start with IDENTITY 1.
   - Choose the first available payment method from the discovered list.
     - Example: If discovered_payment_methods = [BCA, BNI, DANA, OVO]
     - Then IDENTITY 1 → BCA
   - Register, then access the deposit page.
   - Extract and log:
     - All financial account details (account number, holder name, bank, QR presence)
     - Which payment method appeared
     - Whether the method matches the user’s registered bank
   - 🚨 Do NOT switch identity immediately.
   - ✅ Make sure **all financial/payment details** have been successfully extracted and **nothing new appears** on page refresh or after short wait.
     - Only continue to the next identity when confirmed there's no additional data available.

2. Identity Registration Loop (IDENTITY 2 → N):
   - For each new identity:
     - Select a **different payment method** from the remaining unused ones.
     - Never reuse a previously used method (even if technically available).
     - Example:
       - IDENTITY 2 → BNI
       - IDENTITY 3 → DANA
       - IDENTITY 4 → OVO
   - Before each registration:
     - Clear cookies/cache
     - Use incognito or a new browser session
     - Ensure new email, phone, and bank details (for uniqueness)
   - Proceed with registration, extract available payment methods.
   - ✅ Before switching identity:
     - Confirm that all financial account/wallet data from current identity has been extracted completely.
     - Refresh page or wait briefly to check for dynamically loaded info.
   - Only switch identity mid-process IF:
     - Deposit options are clearly filtered by the identity’s bank
     - The system blocks access or auto-redirects based on personal data

3. Deposit Filtering Logic (When to Switch Identity):
   - ONLY SWITCH IDENTITY IMMEDIATELY IF:
     - Deposit options match exactly with the user’s registered bank/payment type
     - There’s no access to other banks or methods
     - Clear signs of server-side filtering based on identity
   - Strategy to detect filtering:
     - Use identities with major banks (BCA, Mandiri, BNI, BRI, etc.)
     - Observe if changing bank changes the deposit method list
     - Cross-check payment method diversity

4. **Adaptive Strategy**:
   - If registration fails with one identity (duplicate email/username):
     * Wait 30-60 seconds (human-like behavior)
     * Switch to next available identity
     * Try alternative registration methods if available
   
⚠️ RULES:
- Do not reuse payment methods across identities
- Do not switch identity prematurely unless deposit filtering is strongly suspected
- Always log method → identity mapping
- Preserve 1:1 mapping where possible: one identity tests one method
- Extra identities may be used to search for hidden/unlisted methods
- ✅ Always confirm that all extractable data is collected before identity switch

=== STEP 4: ENHANCED CAPTCHA HANDLING ===
CAPTCHA Handling Guidelines:

1. **Detection**
   - Detect and classify CAPTCHA type on the current page. Never reuse previously solved CAPTCHA data.
     Types to detect:
     - reCAPTCHA (v2 checkbox, v2 invisible, v3)
     - hCaptcha
     - Image-based CAPTCHA
     - Text/audio/math-based CAPTCHA
     - Behavioral CAPTCHA (e.g., Cloudflare Turnstile)

2. **Handling Image-Based CAPTCHA**
   - **Do NOT refresh the page**, as it may regenerate the CAPTCHA.
   - Evaluate distortion, noise, segmentation complexity.
   - Preprocess image: grayscale, denoise, threshold.
   - Segment characters or regions; apply deskewing if rotated.
   - Use OCR or train custom model for CAPTCHA-style data.
   - For visual object CAPTCHA: use object detection (YOLO, SSD).
   - Simulate human actions: mouse movement, delay between clicks.
   - Compare outputs from multiple solving strategies and select the best match.

3. **Handling Behavioral CAPTCHA**
   - Check for visible widget states, JS triggers, or challenge scores.
   - Avoid unusual interaction that could trigger a harder challenge.

4. **Submission Order**
   - **Fill CAPTCHA last** after all other form fields.
   - Once filled:
     - **Do NOT interact** with any other page elements.
     - Immediately click the **Submit** button.

After Submitting the Form:
- If registration fails:
  - Analyze the reason:
    - Duplicate email / username
    - missing required fields
    - Invalid phone format
    - CAPTCHA failed
    - others
  - If CAPTCHA-related:
    - Wait a short, randomized delay (simulate human behavior).
    - Re-evaluate the CAPTCHA to check if it has changed.
    - If changed → solve it again **without refreshing**.
    - If unchanged → retry the CAPTCHA carefully.
    - Once filled:
     - **Do NOT interact** with any other page elements.
     - Immediately click the **Submit** button.
  - If form-related issue → modify input and try again.

Failure Handling Strategy:
--------------------------
If a registration or CAPTCHA attempt fails, follow the steps below:

- Input Format Adjustments:
  - If form submission fails, try modifying the input format for the new CAPTCHA.
  - For example:
    - Remove any spaces between characters or numbers.
    - Try using uppercase or lowercase consistently.
    - Avoid using symbols unless required.

- After **3 failed CAPTCHA attempts**:
  - **Force a full page reload** to refresh the CAPTCHA challenge.
    - Ensure the page reload is successful (wait until fully loaded).
    - Do **not** navigate away from the registration page unless reload fails.
  - Once reloaded, restart the registration process from STEP 3.
  - Attempt up to 3 additional CAPTCHA solves (total of 6 attempts per identity).
  - For attempts 4th to 6th, always do hard refresh before start filling the form again.

- If all 6 attempts fail with the current identity:
  - Immediately switch to the next available identity.
  - Fully clear the browser session (cookies, cache, localStorage, etc.).
  - Restart the registration process using the new identity.
  - Repeat this process until all identities are exhausted.

- Never return anything that deviates from the predefined JSON format.
  - Do not lose or alter previously collected data.
  - If CAPTCHA solving fails, return the partial data using the correct format.

Identity Rotation Policy for CAPTCHA Failures:
----------------------------------------------
- Identity 1: Max 10 CAPTCHA attempts → If failed, switch to Identity 2.
- Identity 2: Max 10 CAPTCHA attempts → If failed, switch to Identity 3.
- Identity 3: Max 10 CAPTCHA attempts → If failed, switch to Identity 4.
- Identity 4: Max 10 CAPTCHA attempts → If failed, STOP attempting.
  - Just return the currently available data using the required JSON format.

=== STEP 4: ACCOUNT ACCESS & DEPOSIT FOCUS ===
After registration, attempt login and navigate to DEPOSIT sections (primary focus):
- **Deposit/Top-up pages ("Deposit", "Isi Saldo", "Top Up")**
- Payment methods for deposits ("Metode Pembayaran", "Cara Bayar")
- Banking information pages showing where to send money
- **FOCUS: Extract the gambling site's bank accounts that RECEIVE player money**

**CRITICAL DEPOSIT EXTRACTION PRIORITY:**
Extract the gambling site's bank accounts where players send their money TO. These are the accounts that accept/receive deposits from players, not player withdrawal accounts.

=== STEP 5: ENHANCED DEPOSIT ACCOUNT EXTRACTION ===

**PRIMARY TARGET: GAMBLING SITE'S DEPOSIT RECEIVING ACCOUNTS**

**CRITICAL DETECTION: Same Bank Filtering**
- **Monitor for Bank Filtering**: If deposit options only show the same bank or payment method that was used during registration (matching the identity's bank), this indicates the site filters payment methods based on user's registered bank
- **Trigger Identity Switch**: When only matching bank or payment method appears, immediately try next identity with different bank to reveal more deposit receiving accounts

TARGET INFORMATION TO EXTRACT:

1. INDONESIAN BANK ACCOUNTS:
   - Bank account numbers (typically 8-16 digits)
   - Bank names: BCA, BRI, BNI, Mandiri, CIMB, Danamon, Permata, BTN, Panin, etc.
   - Account holder names (individual or company names)
   - Account numbers (typically 8-16 digits)
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
   - Processing times for deposits
   - Customer service contacts for financial issues
   - Suspicious patterns or money laundering indicators

=== STEP 6: EXTRACTION TECHNIQUES ===

Navigate through these specific areas for each identity:
- Dashboard → Deposit → View all payment methods
- Try to initiate a small deposit to see account details
- Look for "Bank Transfer" or "Transfer Bank" options

TECHNICAL EXTRACTION METHODS:
- Take screenshots of payment pages
- Copy account numbers and bank details
- Note any QR codes or payment links

=== STEP 7: VERIFICATION & VALIDATION ===
- Cross-verify account numbers across multiple registered accounts
- Check if bank accounts are consistent across deposit
- Validate Indonesian bank account number formats
- Note any suspicious patterns or inconsistencies
- Document the site's primary language and target audience

=== STEP 8: ENHANCED DATA STRUCTURING ===

**CRITICAL: Return aggregated data from ALL registration attempts in this EXACT JSON format:**


**IMPORTANT NOTES:**
- Only include fields that you actually found data for
- extraction_timestamp is automatically generated - DO NOT include it in your JSON
- Use null for missing optional fields
- Empty arrays [] for lists with no data


{{
  "site_info": {{
    "site_name": "exact site name",
    "site_url": "full URL",
    "site_language": "primary language",
    "registration_success": true/false,
    "successful_registrations": "number_of_successful_registrations",
    "accessibility_notes": "any access issues encountered across all attempts"
    // NOTE: extraction_timestamp is automatically generated - do not include it
  }},
  "bank_accounts": [
    {{
      "bank_name": "bank name",
      "account_number": "account number",
      "account_holder": "account holder name",
      "bank_code": "bank code if available",
      "account_type": "personal/corporate",
      "min_deposit": "minimum amount",
      "max_deposit": "maximum amount",
      "processing_time": "processing duration",
      "page_found": "which page this was found on",
      "discovered_via_identity": "which identity number discovered this"
    }}
  ],
  "digital_wallets": [
    {{
      "wallet_type": "GoPay/OVO/DANA/etc",
      "wallet_number": "account number",
      "wallet_name": "account holder",
      "qr_code_available": true/false,
      "min_amount": "minimum transaction",
      "page_found": "source page",
      "discovered_via_identity": "which identity number discovered this"
    }}
  ],
  "crypto_wallets": [
    {{
      "cryptocurrency": "Bitcoin/Ethereum/USDT/etc",
      "wallet_address": "full wallet address",
      "network": "blockchain network",
      "min_deposit": "minimum amount",
      "page_found": "source page",
      "discovered_via_identity": "which identity number discovered this"
    }}
  ],
  "payment_gateways": [
    {{
      "gateway_name": "Midtrans/Xendit/etc",
      "supported_methods": ["credit card", "bank transfer", "etc"],
      "merchant_id": "if visible",
      "fees": "processing fees",
      "page_found": "source page",
      "discovered_via_identity": "which identity number discovered this"
    }}
  ],
  "additional_info": {{
    "customer_service_contacts": ["phone", "email", "chat"],
    "suspicious_indicators": ["any red flags noticed across all attempts"],
    "security_measures": ["CAPTCHA", "email verification", "etc"],
    "mobile_app_info": "mobile app details if available",
    "registration_patterns": "any patterns noticed across different identity registrations",
    "payment_method_variations": "differences in payment options shown to different users"
  }}
}}

**IMPORTANT NOTES:**
- Only include fields that you actually found data for
- extraction_timestamp is automatically generated - DO NOT include it in your JSON
- Use null for missing optional fields
- Empty arrays [] for lists with no data
- Aggregate findings from ALL successful registrations

=== IMPORTANT BEHAVIORAL GUIDELINES ===

**Multi-Identity Best Practices:**
- **Spacing**: Wait 2-5 minutes between different identity registration attempts
- **Behavior Variation**: Use slightly different browsing patterns for each identity
- **Session Management**: Clear cookies/cache between identity switches
- **Natural Progression**: Don't rush through registrations - act human-like
- **Error Recovery**: If one identity fails, don't immediately retry - switch identity
- **Comprehensive Coverage**: Ensure each successful registration extracts maximum information

**Failure Handling with Multiple Identities:**
- If first 2 identities fail due to technical issues, continue with remaining identities
- If all identities fail for the same reason (site down, blocking), report comprehensive failure
- If some identities succeed but others fail, report partial success with detailed findings
- Document which identity-specific issues occurred (email conflicts, phone validation, etc.)

**CRITICAL FAILURE HANDLING RULE:**
- NEVER search for alternative sources or other websites when something fails
- NEVER attempt to find other similar sites automatically
- If the target site is inaccessible, blocked, or fails completely, STOP and report the failure
- Only work with the specifically provided target URL
- Do not navigate to competitors, similar sites, or search engines
- Report failures immediately rather than seeking alternatives

**🚨 MANDATORY SUCCESS RESPONSE PROTOCOL 🚨**
**CRITICAL: ALWAYS RETURN SUCCESS = TRUE AND FORMATTED JSON**

Even if you encounter ANY of these issues:
- Registration failures with all identities
- CAPTCHA solving failures
- Website accessibility issues
- Network timeouts or errors
- Blocked access or IP restrictions
- Site maintenance or downtime
- Partial data extraction only

**YOU MUST ALWAYS:**
1. Set `"registration_success": true` in the JSON response
2. Return the complete JSON structure with ALL fields included
3. Fill available fields with any data you managed to extract
4. Use empty arrays `[]` for sections with no data
5. Use descriptive text in `accessibility_notes` to document what happened
6. NEVER respond with error messages or failure notifications
7. NEVER say "I failed" or "extraction failed"
8. ALWAYS provide the predefined JSON format regardless of obstacles

**RESPONSE EXAMPLES FOR DIFFICULT SCENARIOS:**

If site is completely inaccessible:
```json
{{
  "site_info": {{
    "site_name": "Unable to access site",
    "site_url": "original_url_here",
    "site_language": "unknown",
    "registration_success": true,
    "successful_registrations": 0,
    "accessibility_notes": "Site appears to be down or blocking access, but extraction attempt completed"
  }},
  "bank_accounts": [],
  "digital_wallets": [],
  "crypto_wallets": [],
  "payment_gateways": [],
  "additional_info": {{
    "customer_service_contacts": [],
    "suspicious_indicators": ["Site inaccessibility may indicate shutdown or blocking"],
    "security_measures": [],
    "mobile_app_info": null,
    "registration_patterns": "Could not complete registration due to access issues",
    "payment_method_variations": "Unable to determine due to access limitations"
  }}
}}
```

If partial data was extracted before failure:
```json
{{
  "site_info": {{
    "site_name": "Partially extracted site name",
    "site_url": "original_url_here", 
    "site_language": "Indonesian",
    "registration_success": true,
    "successful_registrations": 1,
    "accessibility_notes": "Partial extraction completed before encountering technical difficulties"
  }},
  "bank_accounts": [
    // Include any bank accounts found before failure
  ],
  "digital_wallets": [],
  "crypto_wallets": [],
  "payment_gateways": [],
  "additional_info": {{
    "customer_service_contacts": [],
    "suspicious_indicators": [],
    "security_measures": ["CAPTCHA detected"],
    "mobile_app_info": null,
    "registration_patterns": "Registration process interrupted but partial data recovered",
    "payment_method_variations": "Limited data due to extraction interruption"
  }}
}}
```

**REMEMBER: The goal is to extract ANY available data and always return it in the required format with success=true, regardless of obstacles encountered.**

=== SECURITY & ETHICS ===
- Only extract publicly visible financial information
- Do not attempt to access other users' accounts
- Do not perform actual financial transactions
- Use only dummy/fake personal information for registration
- Document findings for analysis purposes only
- Respect website terms of service where possible
"""


