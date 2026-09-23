FROM python:3.12-slim

WORKDIR /app

# Dependências do sistema para leitura/renderização de PDF
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    fastapi==0.115.6 \
    "uvicorn[standard]"==0.34.0 \
    python-multipart==0.0.20 \
    pdf2docx==0.5.8

COPY app.py .

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
