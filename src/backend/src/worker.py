from celery import Celery
import os
import asyncio
import logging
import time
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Celery
celery = Celery(__name__)
celery.conf.broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
celery.conf.result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

# Celery configuration
celery.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
    # Result backend settings
    result_expires=3600,
    result_persistent=True,
    # Error handling
    task_store_errors_even_if_ignored=True,
    task_ignore_result=False,
)

def _process_single_site(url: str, task_id: str, update_callback=None) -> Dict[str, Any]:
    from .crawler import extract_gambling_financial_data
    from .database import db_handler
    from .model import CrawlResult
    
    start_time = time.time()
    
    try:
        logger.info(f"Mulai pencarian rekening mencurigakan untuk URL: {url} (Task ID: {task_id})")
        
        if update_callback:
            update_callback(
                state='PROCESSING',
                meta={'status': 'Mencari data rekening mencurigakan dari situs judi', 'url': url}
            )
        
        if not db_handler.driver:
            db_handler.connect()
            db_handler.create_indexes()
        
        gambling_data = asyncio.run(extract_gambling_financial_data(url))
        
        if not gambling_data:
            raise Exception("Gagal mengekstrak data dari situs judi")
        
        if update_callback:
            update_callback(
                state='PROCESSING',
                meta={'status': 'Menyimpan data ke database Neo4j', 'url': url}
            )
        
        storage_success = db_handler.store_gambling_site_data(gambling_data)
        
        if not storage_success:
            raise Exception("Gagal menyimpan data ke database Neo4j")
        
        processing_time = time.time() - start_time
        
        result = CrawlResult(
            task_id=task_id,
            status='SUCCESS',
            gambling_site_data=gambling_data,
            processing_time=processing_time
        )
        
        logger.info(f"Berhasil memproses {url} dalam {processing_time:.2f} detik")
        
        return {
            'status': 'SUCCESS',
            'url': url,
            'task_id': task_id,
            'processing_time': processing_time,
            'rekening_ditemukan': len(gambling_data.bank_accounts),
            'crypto_ditemukan': len(gambling_data.crypto_wallets),
            'payment_ditemukan': len(gambling_data.payment_gateways),
            'nama_situs': gambling_data.site_info.site_name
        }
        
    except Exception as e:
        processing_time = time.time() - start_time
        error_message = str(e)
        
        logger.error(f"Gagal memproses {url}: {error_message}")
        
        if update_callback:
            update_callback(
                state='FAILURE',
                meta={
                    'status': 'Gagal memproses situs judi',
                    'error': error_message,
                    'url': url,
                    'exc_type': type(e).__name__,
                    'exc_message': error_message,
                    'processing_time': processing_time
                }
            )
        
        # Return a properly serializable error result
        error_result = {
            'status': 'FAILURE',
            'url': url,
            'task_id': task_id,
            'exc_type': type(e).__name__,
            'exc_message': error_message,
            'error_message': error_message,
            'processing_time': processing_time
        }
        
        return error_result

def _process_multiple_sites(urls: list, task_id: str, update_callback=None) -> Dict[str, Any]:
    """Core logic for processing multiple gambling sites - extracted for testing"""
    from .crawler import extract_gambling_financial_data
    from .database import db_handler
    
    start_time = time.time()
    
    try:
        logger.info(f"Mulai batch processing {len(urls)} situs judi (Task ID: {task_id})")
        
        if update_callback:
            update_callback(
                state='PROCESSING',
                meta={'status': f'Memproses {len(urls)} situs judi', 'urls': urls}
            )
        
        if not db_handler.driver:
            db_handler.connect()
            db_handler.create_indexes()
        
        results = []
        berhasil_ekstraksi = 0
        gagal_ekstraksi = 0
        
        for i, url in enumerate(urls):
            try:
                if update_callback:
                    update_callback(
                        state='PROCESSING',
                        meta={
                            'status': f'Memproses situs {i+1}/{len(urls)}',
                            'current_url': url,
                            'progress': (i / len(urls)) * 100
                        }
                    )
                
                gambling_data = asyncio.run(extract_gambling_financial_data(url))
                storage_success = db_handler.store_gambling_site_data(gambling_data)
                
                if storage_success:
                    berhasil_ekstraksi += 1
                    results.append({
                        'url': url,
                        'status': 'SUCCESS',
                        'rekening_mencurigakan': len(gambling_data.bank_accounts),
                        'crypto_wallets': len(gambling_data.crypto_wallets),
                        'payment_methods': len(gambling_data.payment_gateways)
                    })
                else:
                    gagal_ekstraksi += 1
                    results.append({
                        'url': url,
                        'status': 'STORAGE_FAILED',
                        'error': 'Gagal menyimpan ke database'
                    })
                    
            except Exception as e:
                gagal_ekstraksi += 1
                results.append({
                    'url': url,
                    'status': 'FAILED',
                    'error': str(e)
                })
                logger.error(f"Gagal memproses {url}: {e}")
        
        processing_time = time.time() - start_time
        
        return {
            'status': 'COMPLETED',
            'task_id': task_id,
            'processing_time': processing_time,
            'total_situs': len(urls),
            'berhasil_ekstraksi': berhasil_ekstraksi,
            'gagal_ekstraksi': gagal_ekstraksi,
            'results': results
        }
        
    except Exception as e:
        processing_time = time.time() - start_time
        error_message = str(e)
        
        logger.error(f"Batch processing gagal: {error_message}")
        
        return {
            'status': 'FAILURE',
            'task_id': task_id,
            'exc_type': type(e).__name__,
            'error_message': error_message,
            'processing_time': processing_time
        }

@celery.task(bind=True, name='cari_rekening_mencurigakan')
def cari_rekening_mencurigakan(self, url: str) -> Dict[str, Any]:
    """Celery task wrapper for single site processing"""
    return _process_single_site(url, self.request.id, self.update_state)

@celery.task(bind=True, name='cari_multiple_situs')
def cari_multiple_situs(self, urls: list) -> Dict[str, Any]:
    """Celery task wrapper for multiple site processing"""
    return _process_multiple_sites(urls, self.request.id, self.update_state)

