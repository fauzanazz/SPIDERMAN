from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from celery.result import AsyncResult
from datetime import datetime
import logging
from contextlib import asynccontextmanager

from .worker import (
    cari_rekening_mencurigakan,
    cari_multiple_situs,
    celery
)
from .database import db_handler
from .schema import (
    SitusJudiRequest,
    MultipleSitusRequest,
    TaskResponse, 
    TaskStatus,
    DaftarAkunResponse,
    JaringanSitusResponse,
    StatistikSitusResponse,
    HealthResponse
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Attempting to connect to Neo4j database...")
    connection_success = db_handler.connect(max_retries=15, retry_delay=3)
    
    if connection_success:
        try:
            db_handler.create_indexes()
            logger.info("Database connection established and indexes created")
        except Exception as e:
            logger.error(f"Failed to create indexes: {e}")
    else:
        logger.warning("Failed to connect to database during startup. Application will run in degraded mode.")
    
    yield
    
    try:
        if db_handler.connected:
            db_handler.close()
            logger.info("Database connection closed")
    except Exception as e:
        logger.error(f"Error closing database connection: {e}")

app = FastAPI(
    title="Indonesian Gambling Site Account Finder",
    description="Sistem pencari rekening mencurigakan pada situs judi online Indonesia",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/situs-judi/cari-rekening", response_model=TaskResponse)
async def cari_rekening_situs(request: SitusJudiRequest):
    try:
        task = cari_rekening_mencurigakan.delay(str(request.url))
        logger.info(f"Mulai pencarian rekening untuk URL: {request.url} (Task ID: {task.id})")
        return TaskResponse(task_id=task.id)
    except Exception as e:
        logger.error(f"Error starting task for {request.url}: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal memulai pencarian: {str(e)}")

@app.post("/situs-judi/cari-batch", response_model=TaskResponse)
async def cari_rekening_batch(request: MultipleSitusRequest):
    try:
        urls = [str(url) for url in request.urls]
        task = cari_multiple_situs.delay(urls)
        logger.info(f"Mulai batch processing untuk {len(urls)} URL (Task ID: {task.id})")
        return TaskResponse(task_id=task.id)
    except Exception as e:
        logger.error(f"Error starting batch task: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal memulai batch processing: {str(e)}")

@app.get("/tasks/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str):
    try:
        task_result = AsyncResult(task_id, app=celery)
        
        if task_result.state == 'PENDING':
            response = {
                'task_id': task_id,
                'status': 'PENDING',
                'result': {'message': 'Task sedang menunggu diproses'}
            }
        elif task_result.state == 'PROCESSING':
            response = {
                'task_id': task_id,
                'status': 'PROCESSING',
                'result': task_result.info
            }
        elif task_result.state == 'SUCCESS':
            response = {
                'task_id': task_id,
                'status': 'SUCCESS',
                'result': task_result.result
            }
        elif task_result.state == 'FAILURE':
            response = {
                'task_id': task_id,
                'status': 'FAILURE',
                'result': {
                    'error': str(task_result.info),
                    'traceback': task_result.traceback
                }
            }
        else:
            response = {
                'task_id': task_id,
                'status': task_result.state,
                'result': task_result.info
            }
        
        return TaskStatus(**response)
    except Exception as e:
        logger.error(f"Error getting task status for {task_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal mendapatkan status task: {str(e)}")

@app.get("/analisis/akun-mencurigakan", response_model=DaftarAkunResponse)
async def get_akun_mencurigakan():
    try:
        if not db_handler.connected:
            return DaftarAkunResponse(
                status="ERROR",
                akun_mencurigakan=[],
                jumlah=0,
                error_message="Database Neo4j tidak terhubung. Pastikan Neo4j running dan credentials benar."
            )
        
        accounts = db_handler.get_all_suspicious_accounts()
        
        return DaftarAkunResponse(
            status="SUCCESS",
            akun_mencurigakan=[
                {
                    "akun": dict(acc["akun"]),
                    "situs_judi": acc["situs_judi"]
                }
                for acc in accounts
            ],
            jumlah=len(accounts)
        )
    except Exception as e:
        logger.error(f"Error retrieving suspicious accounts: {e}")
        return DaftarAkunResponse(
            status="ERROR",
            akun_mencurigakan=[],
            jumlah=0,
            error_message=f"Terjadi error saat mengambil data: {str(e)}"
        )

@app.get("/analisis/jaringan-situs", response_model=JaringanSitusResponse)
async def get_jaringan_situs():
    try:
        if not db_handler.connected:
            return JaringanSitusResponse(
                status="ERROR",
                jaringan=[],
                jumlah=0,
                error_message="Database Neo4j tidak terhubung. Pastikan Neo4j running dan credentials benar."
            )
        
        networks = db_handler.get_gambling_site_networks()
        
        return JaringanSitusResponse(
            status="SUCCESS",
            jaringan=[
                {
                    "situs1": network["situs1"],
                    "situs2": network["situs2"],
                    "rekening_sama": network["rekening_sama"],
                    "bank": network["bank"]
                }
                for network in networks
            ],
            jumlah=len(networks)
        )
    except Exception as e:
        logger.error(f"Error retrieving gambling networks: {e}")
        return JaringanSitusResponse(
            status="ERROR",
            jaringan=[],
            jumlah=0,
            error_message=f"Terjadi error saat mengambil data: {str(e)}"
        )

@app.get("/analisis/statistik-situs/{url:path}", response_model=StatistikSitusResponse)
async def get_statistik_situs(url: str):
    try:
        if not db_handler.connected:
            return StatistikSitusResponse(
                status="ERROR",
                statistik=None,
                error_message="Database Neo4j tidak terhubung. Pastikan Neo4j running dan credentials benar."
            )
        
        stats = db_handler.get_site_statistics(url)
        
        if not stats:
            return StatistikSitusResponse(
                status="ERROR",
                statistik=None,
                error_message="Situs tidak ditemukan dalam database atau belum pernah di-crawl."
            )
        
        return StatistikSitusResponse(
            status="SUCCESS",
            statistik={
                "situs": stats["situs"],
                "jumlah_rekening": stats["jumlah_rekening"],
                "jumlah_crypto": stats["jumlah_crypto"],
                "jumlah_payment": stats["jumlah_payment"],
                "bank_list": [bank for bank in stats["bank_list"] if bank]
            }
        )
    except Exception as e:
        logger.error(f"Error retrieving site statistics for {url}: {e}")
        return StatistikSitusResponse(
            status="ERROR",
            statistik=None,
            error_message=f"Terjadi error saat mengambil statistik: {str(e)}"
        )

@app.get("/health", response_model=HealthResponse)
async def health_check():
    database_connected = db_handler.connected and db_handler._check_connection()
    celery_connected = False
    
    try:
        inspect = celery.control.inspect()
        ping_result = inspect.ping()
        if ping_result:
            celery_connected = True
    except:
        pass
    
    # Determine status based on both services
    if database_connected and celery_connected:
        status = "healthy"
    elif not database_connected and not celery_connected:
        status = "unhealthy"
    else:
        status = "degraded"
    
    return HealthResponse(
        status=status,
        timestamp=datetime.now().isoformat(),
        database_connected=database_connected,
        celery_connected=celery_connected
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)