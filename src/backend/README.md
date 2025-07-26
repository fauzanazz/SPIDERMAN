# SPIDERMAN Backend

🕷️ FastAPI-based backend service for the SPIDERMAN gambling site account finder system. Handles web crawling, data processing, and graph database management.

## 🚀 Features

- 🔍 **Web Crawling**: Automated browser-based crawling of gambling websites
- 📊 **Graph Database**: Neo4j integration for relationship mapping
- ⚡ **Async Processing**: Celery-based distributed task queue
- 🔄 **Real-time Updates**: WebSocket support for live task monitoring
- 📋 **Report Generation**: PDF report generation with WeasyPrint
- 🔒 **Security**: Input validation, rate limiting, and CORS protection
- 📈 **Monitoring**: Health checks and performance metrics
- 🐳 **Containerized**: Docker support for easy deployment

## 🛠️ Tech Stack

- **Framework**: FastAPI 0.115+ with Pydantic v2
- **Database**: Neo4j 5.15+ (Graph Database)
- **Message Broker**: Redis 7+ with Celery 5.5+
- **Web Crawling**: Browser-use (Playwright-based automation)
- **PDF Generation**: WeasyPrint with Jinja2 templates
- **Storage**: AWS S3 compatible object storage
- **Environment**: Python 3.11+ with Poetry

## 📁 Project Structure

```
src/
├── config.py           # Configuration management
├── main.py             # FastAPI application and routes
├── database.py         # Neo4j database handler
├── graph_databse.py    # Graph operations and queries
├── graph_schema.py     # Graph data models and schemas
├── schema.py           # API request/response models
├── model.py            # Data models and entities
├── worker.py           # Celery worker tasks
├── crawler.py          # Web crawling logic
├── storage.py          # Object storage management
└── test.py             # Test utilities

templates/              # Jinja2 report templates
├── report.html         # Single account report
└── report_batch.html   # Batch report template

static/                 # Static assets
└── report.css          # Report styling

tests/                  # Unit and integration tests
└── __init__.py
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Poetry (Python dependency manager)
- Neo4j 5.15+ database
- Redis 7+ server
- Google Chrome/Chromium (for web crawling)

### Installation

1. **Install Poetry** (if not already installed)
   ```bash
   curl -sSL https://install.python-poetry.org | python3 -
   ```

2. **Install dependencies**
   ```bash
   poetry install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configurations
   ```

4. **Start services**
   ```bash
   # Start Redis (if not using Docker)
   redis-server

   # Start Neo4j (if not using Docker)
   neo4j start

   # Start the FastAPI server
   poetry run python -m src.main

   # In another terminal, start Celery worker
   poetry run celery -A src.worker worker --loglevel=info
   ```

### 🐳 Docker Setup (Recommended)

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password

# Redis Configuration
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Application Configuration
ENVIRONMENT=development
SERVER_IP=localhost
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Optional: Enhanced Crawling
GOOGLE_API_KEY=your_google_api_key

# Optional: Object Storage (AWS S3 compatible)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET_NAME=your_bucket
AWS_S3_REGION=your_region

# Optional: Auto-seeding
AUTO_SEED=true
```

### Docker Compose Configuration

The `docker-compose.yaml` includes:

- **Backend**: FastAPI server (port 8000)
- **Worker**: Celery workers (2 instances by default)
- **Database**: Neo4j 5.15 (ports 7474, 7687)
- **Redis**: Message broker (port 6379)

## 📚 API Documentation

### Core Endpoints

#### Gambling Site Analysis
```http
POST /situs-judi/cari-rekening
Content-Type: application/json

{
  "url": "https://example-gambling-site.com"
}
```

#### Batch Processing
```http
POST /situs-judi/cari-batch
Content-Type: application/json

{
  "urls": [
    "https://site1.com",
    "https://site2.com"
  ]
}
```

#### Task Management
```http
GET /tasks                    # Get all tasks
GET /tasks/{task_id}          # Get specific task status
POST /tasks/{task_id}/retry   # Retry failed task
```

#### Analytics
```http
GET /analisis/akun-mencurigakan     # Get suspicious accounts
GET /analisis/jaringan-situs        # Get site networks
GET /analisis/statistik-situs/{url} # Get site statistics
```

#### Graph Operations
```http
GET /graph/entities              # Get network graph data
GET /graph/entities/{node_id}    # Get node details
POST /graph/entities/bulk        # Bulk create entities
GET /graph/stats                 # Get graph statistics
```

#### Development Endpoints
```http
POST /dev/seed-database          # Seed test data
DELETE /dev/clear-test-data      # Clear test data
GET /dev/test-data-stats         # Get test data statistics
```

### Interactive API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🕷️ Web Crawling

### Browser Automation

The system uses `browser-use` (Playwright-based) for intelligent web crawling:

```python
# src/crawler.py
async def crawl_gambling_site(url: str):
    """
    Crawl a gambling website to extract payment information
    """
    # Browser automation logic
    # Extract bank accounts, crypto wallets, e-wallets
    # Parse and validate data
```

### Supported Payment Methods

- **Bank Accounts**: BCA, BRI, BNI, Mandiri, CIMB Niaga, etc.
- **E-Wallets**: OVO, DANA, GoPay, LinkAja, ShopeePay
- **Crypto Wallets**: Bitcoin, Ethereum, USDT, etc.
- **QRIS Codes**: Indonesian standardized QR payments

### Crawling Features

- **Smart Navigation**: AI-powered page interaction
- **Data Extraction**: Pattern-based payment info extraction
- **Screenshot Capture**: Evidence collection for reports
- **Error Handling**: Robust failure recovery
- **Rate Limiting**: Respectful crawling practices

## 📊 Data Models

### Core Entities

```python
# Bank Account
class BankAccount(BaseModel):
    account_number: str
    bank_name: str
    account_holder: str
    account_type: AccountType
    # ... additional fields

# Crypto Wallet
class CryptoWallet(BaseModel):
    wallet_address: str
    cryptocurrency: str
    # ... additional fields

# Gambling Site
class GamblingSiteData(BaseModel):
    site_info: SiteInfo
    bank_accounts: List[BankAccount]
    crypto_wallets: List[CryptoWallet]
    # ... additional fields
```

### Graph Relationships

```cypher
# Example Neo4j relationships
(site:SitusJudi)-[:MENGGUNAKAN_REKENING]->(account:AkunMencurigakan)
(site:SitusJudi)-[:MENGGUNAKAN_CRYPTO]->(wallet:CryptoWallet)
(entity1)-[:TRANSFERS_TO]->(entity2)
```

## ⚡ Task Processing

### Celery Configuration

```python
# src/worker.py
from celery import Celery

celery = Celery(
    'gambling_site_crawler',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

@celery.task(bind=True)
def cari_rekening_mencurigakan(self, url: str):
    """Process single gambling site"""
    # Crawling and processing logic
```

### Task Types

1. **Single Site Processing**: `cari_rekening_mencurigakan`
2. **Batch Processing**: `cari_multiple_situs`
3. **Data Validation**: Background validation tasks
4. **Report Generation**: PDF generation tasks

### Monitoring Tasks

```bash
# Monitor Celery workers
celery -A src.worker inspect active
celery -A src.worker inspect stats

# Monitor task queue
celery -A src.worker inspect reserved
```

## 🗄️ Database Operations

### Neo4j Integration

```python
# src/database.py
class Neo4jHandler:
    def store_gambling_site_data(self, data: GamblingSiteData):
        """Store crawled data in Neo4j"""
        
    def get_all_suspicious_accounts(self):
        """Retrieve all suspicious accounts"""
        
    def get_gambling_site_networks(self):
        """Find networks between gambling sites"""
```

### Common Queries

```cypher
-- Find accounts used by multiple sites
MATCH (site1:SitusJudi)-[:MENGGUNAKAN_REKENING]->(acc:AkunMencurigakan)
      <-[:MENGGUNAKAN_REKENING]-(site2:SitusJudi)
WHERE site1 <> site2
RETURN site1.url, site2.url, acc.nomor_rekening

-- Get high-priority entities
MATCH (entity)
WHERE entity.priority_score > 70
RETURN entity, labels(entity)
```

### Database Schema

The system automatically creates indexes and constraints:

```cypher
CREATE INDEX FOR (g:SitusJudi) ON (g.url)
CREATE INDEX FOR (a:AkunMencurigakan) ON (a.nomor_rekening)
CREATE INDEX FOR (c:CryptoWallet) ON (c.alamat_wallet)
```

## 📋 Report Generation

### PDF Reports

```python
# Generate single account report
GET /report?oss_key=key&nomor_rekening=123&pemilik_rekening=Name&nama_bank=BCA

# Generate batch report
POST /report/batch
{
  "nama_bank": "BCA",
  "accounts": [...]
}
```

### Report Features

- **Professional Layout**: Government-compliant format
- **Evidence Screenshots**: Captured during crawling
- **Account Details**: Complete payment information
- **Batch Processing**: Multiple accounts in one document
- **Digital Signatures**: Cryptographic verification

## 🧪 Testing

### Running Tests

```bash
# Run all tests
poetry run pytest

# Run with coverage
poetry run pytest --cov=src --cov-report=html

# Run specific test file
poetry run pytest tests/test_database.py

# Run tests with verbose output
poetry run pytest -v
```

### Test Categories

1. **Unit Tests**: Individual component testing
2. **Integration Tests**: Database and API integration
3. **End-to-End Tests**: Complete workflow testing
4. **Performance Tests**: Load and stress testing

### Test Configuration

```python
# pytest.ini configuration in pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
asyncio_mode = "auto"
addopts = "--cov=src --cov-report=html"
```

## 🔍 Development

### Code Quality

```bash
# Format code
poetry run black src/
poetry run isort src/

# Type checking
poetry run mypy src/

# Linting
poetry run flake8 src/
```

### Development Workflow

1. **Virtual Environment**: Always use Poetry virtual environment
2. **Code Formatting**: Auto-format with Black and isort
3. **Type Hints**: Use strict typing throughout
4. **Testing**: Write tests for new features
5. **Documentation**: Update docstrings and README

### Poetry Commands

```bash
# Dependency management
poetry add [library_name]              # Add new dependency
poetry add --group dev [library_name]  # Add dev dependency
poetry install                         # Install all dependencies
poetry update                          # Update dependencies

# Environment management
poetry shell                           # Activate virtual environment
poetry run [command]                   # Run command in virtual environment

# Development server
poetry run uvicorn src.main:app --reload  # Start FastAPI with auto-reload
poetry run python -m src.main             # Alternative way to start

# Worker management
poetry run celery -A src.worker worker --loglevel=info  # Start Celery worker
poetry run celery -A src.worker flower                  # Start Celery monitoring
```

### Debugging

```python
# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)

# FastAPI debug mode
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, debug=True)
```

## 🚀 Deployment

### Production Deployment

```bash
# Build Docker image
docker build -f Dockerfile.server -t spiderman-backend .

# Run in production mode
docker run -d \
  --name spiderman-backend \
  -p 8000:8000 \
  --env-file .env.production \
  spiderman-backend
```

### Environment-specific Configuration

```python
# src/config.py
class Settings:
    environment: str = "development"
    
    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"
```

### Health Monitoring

```http
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "database_connected": true,
  "celery_connected": true
}
```

## 🔐 Security Considerations

### Input Validation

```python
# Pydantic models ensure type safety
class SitusJudiRequest(BaseModel):
    url: HttpUrl  # Validates URL format
    
    @validator('url')
    def validate_url(cls, v):
        # Additional URL validation logic
        return v
```

### Rate Limiting

```python
# Implement rate limiting for API endpoints
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@app.post("/situs-judi/cari-rekening")
@limiter.limit("10/minute")
async def analyze_site(request: Request, ...):
    # Rate-limited endpoint
```

### CORS Configuration

```python
# Environment-specific CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"]
)
```

## 📊 Monitoring & Observability

### Logging

```python
import logging
logger = logging.getLogger(__name__)

# Structured logging
logger.info("Processing site", extra={
    "url": site_url,
    "task_id": task_id,
    "user_agent": user_agent
})
```

### Metrics

- **Task Processing Time**: Monitor crawling performance
- **Success/Failure Rates**: Track crawling reliability
- **Database Performance**: Monitor Neo4j query times
- **API Response Times**: Track endpoint performance

### Health Checks

```python
@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    return HealthResponse(
        status="healthy",
        database_connected=db_handler.connected,
        celery_connected=check_celery_connection()
    )
```

## 🤝 Contributing

1. **Follow Code Style**: Use Black, isort, and type hints
2. **Write Tests**: Maintain high test coverage
3. **Document Changes**: Update docstrings and README
4. **Security First**: Validate all inputs and sanitize outputs
5. **Performance**: Consider scalability in design decisions

### Development Setup

```bash
# Install development dependencies
poetry install --with dev

# Setup pre-commit hooks
poetry run pre-commit install

# Run quality checks
poetry run pre-commit run --all-files
```

## 📄 License

Part of the SPIDERMAN project - MIT License

## 🆘 Troubleshooting

### Common Issues

1. **Neo4j Connection Failed**
   ```bash
   # Check Neo4j status
   neo4j status
   
   # Check credentials
   cypher-shell -u neo4j -p your_password
   ```

2. **Celery Worker Not Starting**
   ```bash
   # Check Redis connection
   redis-cli ping
   
   # Start worker with debug info
   celery -A src.worker worker --loglevel=debug
   ```

3. **Crawling Failures**
   ```bash
   # Check Chrome/Chromium installation
   which google-chrome
   
   # Install browser dependencies
   playwright install chromium
   ```

### Performance Tuning

- **Neo4j**: Adjust heap size and pagecache
- **Redis**: Configure memory limits and persistence
- **Celery**: Scale worker processes based on CPU cores
- **FastAPI**: Use Gunicorn with multiple workers in production

---

Made with 🐍 Python and ❤️ for financial crime prevention