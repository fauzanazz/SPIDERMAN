## Documentation for SPIDERMAN backend

Used Library
- [Poetry(Dependecy Manager)](https://python-poetry.org/)
- [Celery(Worker)](https://docs.celeryq.dev/en/stable/index.html)
- [Neo4j(GraphDB)](https://neo4j.com/)
- [FastAPi(WebApp)](https://fastapi.tiangolo.com/)

Poetry Command
- poetry add [library_name]
- poetry install
- poetry run uvicorn src.main:app --reload 

OpenAPI
- localhost:8000/docs ( Default )

Run test
```
poetry run pytest tests/ -v --cov=src --cov-report=html
```