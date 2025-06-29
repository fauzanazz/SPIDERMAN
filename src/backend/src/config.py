from crawl4ai import LLMExtractionStrategy, LLMConfig, CrawlerRunConfig, CacheMode, BrowserConfig
from .model import GamblingSiteData
import os

llm_strategy = LLMExtractionStrategy(
    llm_config=LLMConfig(
        provider="gemini-2.5-flash", 
        api_token=os.getenv('GEMINI_API_KEY') or os.getenv('OPENAI_API_KEY')
    ),
    schema=GamblingSiteData.model_json_schema(),
    extraction_type="schema",
    instruction="""
    Ekstrak informasi akun keuangan dan metode pembayaran dari website judi online Indonesia.
    Cari dan temukan:
    
    1. REKENING BANK INDONESIA:
       - Nomor rekening bank (8-16 digit)
       - Nama bank (BCA, BRI, BNI, Mandiri, CIMB, Danamon, dll)
       - Nama pemilik rekening
       - Kode bank atau informasi transfer
       
    2. DOMPET DIGITAL:
       - Nomor akun GoPay, OVO, DANA, LinkAja, ShopeePay
       - Alamat wallet cryptocurrency (Bitcoin, Ethereum, USDT)
       
    3. METODE PEMBAYARAN:
       - E-wallet lokal dan internasional
       - Payment gateway (Midtrans, Xendit, dll)
       - Pulsa dan voucher game
       
    Fokus pada halaman:
    - Deposit/setor dana
    - Withdrawal/tarik dana  
    - Metode pembayaran
    - Panduan transfer
    - Customer service/kontak
    
    Ekstrak semua nomor rekening, nama bank, dan informasi pembayaran yang ditemukan.
    Jangan lakukan analisis risiko, hanya kumpulkan data mentah.
    """,
    chunk_token_threshold=2000,
    overlap_rate=0.1,
    apply_chunking=True,
    input_format="markdown",
    extra_args={"temperature": 0.1, "max_tokens": 2000}
)

pattern_extraction_strategy = LLMExtractionStrategy(
    llm_config=LLMConfig(
        provider="gemini-2.5-flash", 
        api_token=os.getenv('GEMINI_API_KEY') or os.getenv('OPENAI_API_KEY')
    ),
    schema=GamblingSiteData.model_json_schema(),
    extraction_type="schema",
    instruction="""
    Cari pola-pola nomor rekening dan informasi pembayaran Indonesia:
    
    POLA REKENING BANK:
    - Nomor rekening 8-16 digit
    - Format: BCA (10 digit), BRI (15 digit), BNI (10 digit), Mandiri (13 digit)
    - Nama bank Indonesia
    
    POLA E-WALLET:
    - Nomor HP untuk GoPay, OVO, DANA (08xx-xxxx-xxxx)
    - ID akun ShopeePay, LinkAja
    
    POLA CRYPTO:
    - Alamat Bitcoin (dimulai 1, 3, atau bc1)
    - Alamat Ethereum (dimulai 0x)
    - Alamat USDT
    
    Ekstrak semua yang cocok dengan pola-pola ini.
    """,
    chunk_token_threshold=1500,
    overlap_rate=0.0,
    apply_chunking=True,
    input_format="markdown",
    extra_args={"temperature": 0.0, "max_tokens": 1500}
)

crawl_config = CrawlerRunConfig(
    extraction_strategy=llm_strategy,
    cache_mode=CacheMode.BYPASS,
    word_count_threshold=50,
    excluded_tags=['script', 'style', 'nav', 'footer', 'header', 'aside'],
    only_text=False,
    process_iframes=True,
    remove_overlay_elements=True,
    simulate_user=True,
    override_navigator=True
)

browser_config = BrowserConfig(
    browser_type="chromium",
    headless=True,
    proxy=None,
    viewport_width=1920,
    viewport_height=1080,
    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    headers={
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive"
    }
)