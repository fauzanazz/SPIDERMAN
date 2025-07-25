FROM python:3.11-buster AS builder

RUN pip install poetry==1.4.2

ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

WORKDIR /app

COPY pyproject.toml poetry.lock ./
RUN touch README.md

RUN --mount=type=cache,target=$POETRY_CACHE_DIR poetry install --without dev --no-root

FROM python:3.11-slim-bookworm AS runtime
ENV VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH"

RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libgobject-2.0-0 \
    libgtk-3-0 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi6 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}

RUN playwright install chromium --with-deps --no-shell

COPY src/ /app/src/

WORKDIR /app

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]