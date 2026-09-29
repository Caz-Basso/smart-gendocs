from pathlib import Path
import subprocess
import tempfile

from fastapi import FastAPI, File, HTTPException, UploadFile


MAX_PDF_SIZE = 10 * 1024 * 1024
MAX_HTML_SIZE = 40 * 1024 * 1024
CONVERSION_TIMEOUT_SECONDS = 120

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/convert")
def convert(file: UploadFile = File(...)) -> dict[str, str]:
    pdf_bytes = file.file.read(MAX_PDF_SIZE + 1)

    if len(pdf_bytes) > MAX_PDF_SIZE:
        raise HTTPException(status_code=413, detail="PDF exceeds the 10 MB limit.")

    if not pdf_bytes.startswith(b"%PDF-"):
        raise HTTPException(status_code=422, detail="The uploaded file is not a valid PDF.")

    try:
        with tempfile.TemporaryDirectory(prefix="pdf2htmlex-") as temporary_directory:
            working_directory = Path(temporary_directory)
            source_path = working_directory / "source.pdf"
            output_path = working_directory / "converted.html"
            source_path.write_bytes(pdf_bytes)

            process = subprocess.run(
                [
                    "pdf2htmlEX",
                    "--embed-css", "1",
                    "--embed-font", "1",
                    "--embed-image", "1",
                    "--embed-javascript", "1",
                    "--embed-outline", "0",
                    "--process-outline", "0",
                    "--dest-dir", str(working_directory),
                    str(source_path),
                    output_path.name,
                ],
                capture_output=True,
                text=True,
                timeout=CONVERSION_TIMEOUT_SECONDS,
                check=False,
            )

            if process.returncode != 0 or not output_path.is_file():
                if process.stderr:
                    print(process.stderr[-2000:], flush=True)

                raise HTTPException(
                    status_code=422,
                    detail="pdf2htmlEX could not convert this PDF.",
                )

            html = output_path.read_text(encoding="utf-8")

            if len(html.encode("utf-8")) > MAX_HTML_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail="The converted HTML exceeds the 50 MB limit.",
                )

            return {"html": html}
    except subprocess.TimeoutExpired as exception:
        raise HTTPException(
            status_code=408,
            detail="PDF conversion timed out.",
        ) from exception
