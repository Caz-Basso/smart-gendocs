"""Microserviço de conversão PDF -> DOCX usando pdf2docx.

POST /convert  (multipart/form-data, campo "file")
Retorna o .docx gerado (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
"""
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from pdf2docx import Converter
from fastapi.responses import Response

app = FastAPI(title="PDF to DOCX Converter")

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/convert")
async def convert(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=422, detail="O arquivo deve ser um PDF.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=422, detail="Arquivo vazio.")
    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo maior que 25 MB.")

    source_path = f"/tmp/{file.filename or 'upload.pdf'}"
    with open(source_path, "wb") as f:
        f.write(pdf_bytes)
    output_path = "/tmp/out.docx"

    try:
        cv = Converter(source_path)
        cv.convert(output_path)
        cv.close()

        with open(output_path, "rb") as f:
            docx_bytes = f.read()
    finally:
        for path in (source_path, output_path):
            try:
                os.remove(path)
            except FileNotFoundError:
                pass
    name = (file.filename or "document").rsplit(".", 1)[0]

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{name}.docx"',
        },
    )
