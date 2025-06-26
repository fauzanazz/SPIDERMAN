from fastapi import FastAPI
from celery.result import AsyncResult
from .worker import process_data, celery
from .schema import (
    TaskRequest, 
    TaskResponse, 
    TaskStatus
)

app = FastAPI()

@app.get("/health", status_code=200)
async def health_check():
    return {"status": "ok"}

@app.post("/tasks", response_model=TaskResponse, status_code=202)
async def run_task(request: TaskRequest):
    task = process_data.delay(request.data)
    return {"task_id": task.id}

@app.get("/tasks/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str):
    task_result = AsyncResult(task_id, app=celery)
    result = task_result.result if task_result.ready() else None
    return {
        "task_id": task_id,
        "status": task_result.status,
        "result": result
    }