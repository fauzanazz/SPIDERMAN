# SPIDERMAN - Indonesian Gambling Site Account Finder

🕷️ **SPIDERMAN** (Sistema Pencari Identitas Data Entitas Rekening Mencurigakan di Aplikasi Network) is a comprehensive system designed to detect and analyze suspicious accounts used by Indonesian gambling websites.

## 🎯 Overview

SPIDERMAN helps financial institutions and regulatory bodies identify suspicious bank accounts, crypto wallets, and payment methods used by illegal gambling operations in Indonesia. The system crawls gambling websites, extracts payment information, and builds a network graph to visualize connections between different entities.

## ✨ Features

- 🔍 **Web Crawling**: Automated crawling of gambling websites to extract payment information
- 📊 **Network Analysis**: Visualize connections between accounts, wallets, and gambling sites
- 🏦 **Multi-Payment Support**: Detect bank accounts, crypto wallets, e-wallets, and QRIS codes
- 📈 **Real-time Monitoring**: Track task progress with live status updates
- 📋 **Report Generation**: Generate PDF reports for regulatory compliance
- 🎛️ **Interactive Dashboard**: Modern web interface for data exploration
- 🔗 **Graph Database**: Neo4j-powered relationship mapping
- ⚡ **Scalable Architecture**: Distributed processing with Celery workers

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React/TS)    │◄──►│   (FastAPI)     │◄──►│   (Neo4j)       │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST APIs     │    │ • Graph Data    │
│ • Network Graph │    │ • Task Queue    │    │ • Relationships │
│ • Reports       │    │ • Web Crawler   │    │ • Analytics     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Message      │
                       │    Broker)      │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- Neo4j 5.15+
- Redis 7+

### 🐳 Docker Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/SPIDERMAN.git
   cd SPIDERMAN
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configurations
   ```

3. **Start all services**
   ```bash
   cd src/backend
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs
   - Neo4j Browser: http://localhost:7474

### 🛠️ Development Setup

#### Backend Setup
```bash
cd src/backend
poetry install
poetry run python -m src.main
```

#### Frontend Setup
```bash
cd src/frontend
npm install
npm run dev
```

See individual README files for detailed setup instructions:
- [Backend README](src/backend/README.md)
- [Frontend README](src/frontend/README.md)

## 📚 API Documentation

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/situs-judi/cari-rekening` | Analyze single gambling site |
| `POST` | `/situs-judi/cari-batch` | Batch analyze multiple sites |
| `GET` | `/tasks` | Get all tasks |
| `GET` | `/tasks/{task_id}` | Get specific task status |
| `GET` | `/analisis/akun-mencurigakan` | Get suspicious accounts |
| `GET` | `/graph/entities` | Get network graph data |
| `GET` | `/health` | Health check |

Full API documentation available at: http://localhost:8000/docs

## 🧪 Testing

```bash
# Backend tests
cd src/backend
poetry run pytest

# Frontend tests
cd src/frontend
npm run test
```

## 📊 Data Flow

1. **Input**: Gambling website URLs
2. **Crawling**: Extract payment information using browser automation
3. **Processing**: Parse and validate extracted data
4. **Storage**: Store entities and relationships in Neo4j
5. **Analysis**: Generate network graphs and identify patterns
6. **Output**: Visual dashboards and compliance reports

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEO4J_URI` | Neo4j connection URI | `bolt://localhost:7687` |
| `NEO4J_USERNAME` | Neo4j username | `neo4j` |
| `NEO4J_PASSWORD` | Neo4j password | Required |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `GOOGLE_API_KEY` | Google API key for enhanced crawling | Optional |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is designed for legitimate regulatory and compliance purposes only. Users are responsible for ensuring compliance with local laws and regulations when using this system.

## 🆘 Support

- 📧 Email: support@spiderman-project.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-username/SPIDERMAN/issues)
- 📖 Documentation: [Wiki](https://github.com/your-username/SPIDERMAN/wiki)

## 🏆 Acknowledgments

- Built with FastAPI, React, and Neo4j
- Inspired by financial crime prevention initiatives
- Designed for Indonesian regulatory compliance

---

Made with ❤️ for a safer financial ecosystem in Indonesia