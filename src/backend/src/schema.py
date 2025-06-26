from pydantic import BaseModel

class TaskRequest(BaseModel):
    data: dict

class TaskResponse(BaseModel):
    task_id: str

class TaskStatus(BaseModel):
    task_id: str
    status: str
    result: dict | None