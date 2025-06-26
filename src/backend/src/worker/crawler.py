from celery import Celery
import os
import time


celery = Celery(__name__)
celery.conf.broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
celery.conf.result_backend = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

@celery.task
def process_data(data: dict):
    time.sleep(5)
    return {
        "status": "completed", 
        "processed_data": data
    }