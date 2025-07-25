from ast import List
import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from celery.result import AsyncResult
from datetime import datetime
import logging
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
from weasyprint import HTML, CSS
from .storage import storage_manager
from jinja2 import Environment, FileSystemLoader
from typing import List

from typing import Optional
from .graph_schema import (
    GraphFilters, NodeCreate, TransactionCreate,
    GraphResponse, NodeDetailResponse, NodeCreateResponse, TransactionCreateResponse,
    EntityType
)
from .graph_databse import graph_db


from .worker import (
    cari_rekening_mencurigakan,
    cari_multiple_situs,
    celery
)
from .database import db_handler
from .schema import (
    SitusJudiRequest,
    MultipleSitusRequest,
    ReportRequest,
    TaskResponse, 
    TaskStatus,
    DaftarAkunResponse,
    JaringanSitusResponse,
    StatistikSitusResponse,
    HealthResponse
)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

env = Environment(loader=FileSystemLoader("templates"))

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
    expose_headers=["Content-Disposition"]
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

@app.post("/tasks/{task_id}/retry", response_model=TaskResponse)
async def retry_failed_task(task_id: str):
    """Retry a failed task by repushing it to Redis"""
    try:
        # Get original task result
        task_result = AsyncResult(task_id, app=celery)
        
        if task_result.state != 'FAILURE':
            raise HTTPException(
                status_code=400, 
                detail=f"Task {task_id} is not in FAILURE state. Current state: {task_result.state}"
            )
        
        # Get task info to determine if it was single or batch processing
        task_info = task_result.info
        
        # Check if we can get original arguments from task
        task_name = task_result.name
        
        if task_name == 'cari_rekening_mencurigakan':
            # For single site, we need the URL - this would need to be stored somewhere
            # For now, return error asking for manual resubmission
            raise HTTPException(
                status_code=400,
                detail="Cannot automatically retry single site tasks. Please resubmit the original URL."
            )
        elif task_name == 'cari_multiple_situs':
            # For batch, same issue - we'd need the original URLs
            raise HTTPException(
                status_code=400,
                detail="Cannot automatically retry batch tasks. Please resubmit the original URLs."
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown task type: {task_name}"
            )
            
    except Exception as e:
        logger.error(f"Error retrying task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal retry task: {str(e)}")

@app.post("/situs-judi/retry-url", response_model=TaskResponse)
async def retry_url_processing(request: SitusJudiRequest):
    """Retry processing for a specific URL (manual retry)"""
    try:
        task = cari_rekening_mencurigakan.delay(str(request.url))
        logger.info(f"Retry pencarian rekening untuk URL: {request.url} (New Task ID: {task.id})")
        return TaskResponse(task_id=task.id)
    except Exception as e:
        logger.error(f"Error retrying task for {request.url}: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal retry pencarian: {str(e)}")

@app.post("/situs-judi/retry-batch", response_model=TaskResponse)
async def retry_batch_processing(request: MultipleSitusRequest):
    """Retry batch processing for multiple URLs (manual retry)"""
    try:
        urls = [str(url) for url in request.urls]
        task = cari_multiple_situs.delay(urls)
        logger.info(f"Retry batch processing untuk {len(urls)} URL (New Task ID: {task.id})")
        return TaskResponse(task_id=task.id)
    except Exception as e:
        logger.error(f"Error retrying batch task: {e}")
        raise HTTPException(status_code=500, detail=f"Gagal retry batch processing: {str(e)}")

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

@app.get("/report")
async def generate_report(
    oss_key: str,
    nomor_rekening: str,
    pemilik_rekening: str,
    nama_bank: str,
):
    # Load template
    template = env.get_template("report.html")
    img_path = storage_manager.generate_presigned_url(oss_key, expiration=3600)

    logger.info(f"Generating report for {nomor_rekening} with image {img_path}")

    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    css_file = os.path.join(static_dir, "report.css")
    
    rendered_html = template.render(
        img_path=img_path, 
        pemilik_rekening=pemilik_rekening, 
        nama_bank=nama_bank, 
        nomor_rekening=nomor_rekening,

    )

    # Generate PDF
    if os.path.exists(css_file):
        css = CSS(filename=css_file)
        pdf_bytes = HTML(string=rendered_html).write_pdf(stylesheets=[css])
    else:
        logger.warning("CSS file not found, generating PDF without styling")
        pdf_bytes = HTML(string=rendered_html).write_pdf()
    
    # Create filename with account number and timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Laporan_Pembekuan_Rekening_{nomor_rekening}_{timestamp}.pdf"
    
    return Response(
        content=pdf_bytes, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.post("/report/batch")
async def generate_report(req: ReportRequest):
    # Load template
    template = env.get_template("report_batch.html")

    for account in req.accounts:
        #change oss_key to presigned URL
        img_path = storage_manager.generate_presigned_url(account.oss_key, expiration=3600)
        account.oss_key = img_path
   
    static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
    css_file = os.path.join(static_dir, "report.css")
    
    rendered_html = template.render(
        nama_bank=req.nama_bank,
        accounts=req.accounts,
    )

    # Generate PDF
    if os.path.exists(css_file):
        css = CSS(filename=css_file)
        pdf_bytes = HTML(string=rendered_html).write_pdf(stylesheets=[css])
    else:
        logger.warning("CSS file not found, generating PDF without styling")
        pdf_bytes = HTML(string=rendered_html).write_pdf()
    
    # Create filename with account number and timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"Laporan_Pembekuan_Rekening_{req.nama_bank}_{timestamp}.pdf"
    
    return Response(
        content=pdf_bytes, 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
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



## Buat graphs 
@app.get("/graph/entities", response_model=GraphResponse)
async def get_whole_graph(
    entity_types: Optional[str] = None,  # Comma-separated: "bank_account,crypto_wallet"
    banks: Optional[str] = None,  # Comma-separated: "BRI,BCA"
    e_wallets: Optional[str] = None,  # Comma-separated: "OVO,DANA"
    cryptocurrencies: Optional[str] = None,  # Comma-separated: "Bitcoin,USDT"
    phone_providers: Optional[str] = None,  # Comma-separated: "Simpati,XL"
    priority_score_min: Optional[int] = None,
    priority_score_max: Optional[int] = None,
    search_query: Optional[str] = None
):
    """
    Get all entities in the graph with optional filtering and clustering by gambling websites.
    
    Entities are clustered by the gambling sites where they appear, with standalone entities
    (not linked to any site) returned separately.
    
    Query Parameters:
    - entity_types: Filter by entity types (bank_account, crypto_wallet, e_wallet, phone_number, qris)
    - banks: Filter bank accounts by bank names (BRI, BCA, BNI, Mandiri, etc.)
    - e_wallets: Filter e-wallets by type (OVO, DANA, GoPay, LinkAja, etc.)
    - cryptocurrencies: Filter crypto wallets by currency (Bitcoin, Ethereum, USDT, etc.)
    - phone_providers: Filter phone numbers by provider (Simpati, XL, etc.)
    - priority_score_min/max: Filter by priority score range
    - search_query: Search by identifier (account number, wallet address, phone, etc.)
    """
    try:
        # Parse comma-separated parameters
        filters = GraphFilters(
            entity_types=[EntityType(t.strip()) for t in entity_types.split(',')] if entity_types else None,
            banks=banks.split(',') if banks else None,
            e_wallets=e_wallets.split(',') if e_wallets else None,
            cryptocurrencies=cryptocurrencies.split(',') if cryptocurrencies else None,
            phone_providers=phone_providers.split(',') if phone_providers else None,
            priority_score_min=priority_score_min,
            priority_score_max=priority_score_max,
            search_query=search_query
        )
        
        result = graph_db.get_whole_graph(filters)
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid filter parameter: {str(e)}")
    except Exception as e:
        logger.error(f"Error getting whole graph: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve graph: {str(e)}")

@app.get("/graph/entities/{node_id}", response_model=NodeDetailResponse)
async def get_node_detail(node_id: str):
    try:
        result = graph_db.get_node_detail(node_id)
        
        if result is None:
            raise HTTPException(status_code=404, detail=f"Node with ID {node_id} not found")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting node detail for {node_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve node details: {str(e)}")

@app.post("/graph/transactions", response_model=TransactionCreateResponse)
async def create_transaction(transaction_data: TransactionCreate):
    try:
        result = graph_db.create_transaction(transaction_data)
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result.get("error", "Failed to create transaction"))
        
        return TransactionCreateResponse(
            success=True,
            from_entity=result["from_entity"],
            to_entity=result["to_entity"],
            transaction=result["transaction"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transaction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create transaction: {str(e)}")
    
@app.get("/graph/stats")
async def get_graph_statistics():
    try:
        if not db_handler._check_connection():
            raise HTTPException(status_code=503, detail="Database not connected")
            
        stats_query = """
        MATCH (entity)
        OPTIONAL MATCH (entity)-[t:TRANSFERS_TO]-()
        WITH 
            labels(entity)[0] as entity_type,
            count(DISTINCT entity) as entity_count,
            count(t) as transaction_count,
            avg(coalesce(entity.priority_score, 0)) as avg_priority,
            min(coalesce(entity.priority_score, 0)) as min_priority,
            max(coalesce(entity.priority_score, 0)) as max_priority
        RETURN 
            entity_type,
            entity_count,
            transaction_count,
            avg_priority,
            min_priority,
            max_priority
        ORDER BY entity_count DESC
        """
        
        with db_handler.driver.session() as session:
            result = session.run(stats_query)
            stats = []
            
            for record in result:
                stats.append({
                    "entity_type": record["entity_type"],
                    "entity_count": record["entity_count"],
                    "transaction_count": record["transaction_count"],
                    "avg_priority": round(record["avg_priority"], 2) if record["avg_priority"] else 0,
                    "min_priority": record["min_priority"],
                    "max_priority": record["max_priority"]
                })
            
            return {
                "status": "success",
                "statistics": stats,
                "total_entities": sum(s["entity_count"] for s in stats),
                "total_transactions": sum(s["transaction_count"] for s in stats) // 2  # Divide by 2 since each transaction is counted twice
            }
            
    except Exception as e:
        logger.error(f"Error getting graph statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve statistics: {str(e)}")

@app.post("/graph/entities/bulk")
async def bulk_create_entities(entities: List[NodeCreate]):
    try:
        results = {
            "successful": [],
            "failed": [],
            "total": len(entities)
        }
        
        for entity_data in entities:
            try:
                result = graph_db.create_or_update_node(entity_data)
                if result["success"]:
                    results["successful"].append({
                        "identifier": entity_data.identifier,
                        "id": result["id"],
                        "created": result["created"]
                    })
                else:
                    results["failed"].append({
                        "identifier": entity_data.identifier,
                        "error": result.get("error", "Unknown error")
                    })
            except Exception as e:
                results["failed"].append({
                    "identifier": entity_data.identifier,
                    "error": str(e)
                })
        
        return {
            "status": "completed",
            "successful_count": len(results["successful"]),
            "failed_count": len(results["failed"]),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in bulk entity creation: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk operation failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)