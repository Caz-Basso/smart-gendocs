FROM wayoyo/python-pdf2htmlex:fastapi-ubuntu-24.04

WORKDIR /app

COPY service.py /app/service.py

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig fonts-liberation \
    && fc-cache -f \
    && rm -rf /var/lib/apt/lists/*

USER application

RUN python3 -m pip install --no-cache-dir --break-system-packages \
    fastapi==0.115.12 \
    uvicorn==0.34.2 \
    python-multipart==0.0.20 \
    && pdf2htmlEX --version

EXPOSE 8000

CMD ["python3", "-m", "uvicorn", "service:app", "--host", "0.0.0.0", "--port", "8000"]
