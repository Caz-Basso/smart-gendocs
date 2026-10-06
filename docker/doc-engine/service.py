import html
import io
from pathlib import Path
import tempfile
from typing import Any, Dict, List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
import fitz  # PyMuPDF
import pdfplumber

MAX_PDF_SIZE = 25 * 1024 * 1024  # 25 MB

app = FastAPI(
    title="UNESC Smart GenDocs - Document Intelligence Engine",
    description="Microserviço especializado em análise geométrica, extração de layout e tabelas de PDFs.",
    version="1.0.0",
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {
        "status": "healthy",
        "engine": "PyMuPDF 1.25 + pdfplumber",
        "service": "unesc-doc-engine",
    }


def is_header_line(y0: float, page_height: float) -> bool:
    """Detecta se uma coordenada Y (com origem no topo) pertence ao cabeçalho."""
    return y0 <= 85.0


def is_footer_line(y0: float, page_height: float) -> bool:
    """Detecta se uma coordenada Y (com origem no topo) pertence ao rodapé."""
    return y0 >= (page_height - 85.0)


def format_table_to_html(table_data: List[List[Any]]) -> str:
    """Converte matriz de tabela extraída pelo pdfplumber em HTML semântico limpo."""
    if not table_data:
        return ""

    rows_html = []
    for row_idx, row in enumerate(table_data):
        cells_html = []
        is_header = row_idx == 0

        for cell in row:
            content = html.escape(str(cell or "").strip())
            tag = "th" if is_header else "td"
            style = (
                "border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11.5px; text-align: left; "
                + ("background-color: #f8fafc; font-weight: 600;" if is_header else "")
            )
            cells_html.append(f"<{tag} style='{style}'>{content}</{tag}>")

        rows_html.append(f"<tr>{''.join(cells_html)}</tr>")

    table_style = "width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; font-family: 'Aptos', 'Calibri', Arial, sans-serif;"
    return f"<table style='{table_style}'>{''.join(rows_html)}</table>"


@app.post("/analyze")
async def analyze_document(file: UploadFile = File(...)) -> JSONResponse:
    """Analisa o PDF geometricamente, separando cabeçalhos, corpo, tabelas e rodapés."""
    pdf_bytes = await file.read(MAX_PDF_SIZE + 1)

    if len(pdf_bytes) > MAX_PDF_SIZE:
        raise HTTPException(status_code=413, detail="O arquivo excede o limite de 25 MB.")

    if not pdf_bytes.startswith(b"%PDF-"):
        raise HTTPException(status_code=422, detail="Arquivo inválido. O documento não é um PDF válido.")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Não foi possível abrir o PDF: {str(exc)}")

    if doc.is_encrypted:
        raise HTTPException(status_code=422, detail="O PDF está protegido por senha e não pode ser processado.")

    page_count = len(doc)
    if page_count == 0:
        raise HTTPException(status_code=422, detail="O documento PDF não possui páginas.")

    # Grava arquivo temporário para extração de tabelas com pdfplumber
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=True) as tmp_file:
        tmp_file.write(pdf_bytes)
        tmp_file.flush()

        plumber_doc = None
        try:
            plumber_doc = pdfplumber.open(tmp_file.name)
        except Exception:
            pass

        full_html_pages: List[str] = []
        document_structure: Dict[str, Any] = {
            "version": 1,
            "type": "flowable",
            "pages": [],
        }

        has_any_text = False

        for page_idx in range(page_count):
            page_num = page_idx + 1
            page = doc[page_idx]
            rect = page.rect
            width = rect.width
            height = rect.height

            # Extrai blocos de texto com coordenadas precisas do PyMuPDF
            blocks = page.get_text("blocks")
            # blocks formato: (x0, y0, x1, y1, "texto", block_no, block_type)
            # block_type == 0: texto; block_type == 1: imagem

            header_lines: List[str] = []
            body_elements: List[str] = []
            footer_lines: List[str] = []
            page_elements_ast: List[Dict[str, Any]] = []

            # Extrai tabelas com pdfplumber para esta página
            page_tables_html: List[str] = []
            if plumber_doc and page_idx < len(plumber_doc.pages):
                try:
                    tables = plumber_doc.pages[page_idx].extract_tables()
                    for tbl in tables:
                        tbl_html = format_table_to_html(tbl)
                        if tbl_html:
                            page_tables_html.append(tbl_html)
                except Exception:
                    pass

            # Classifica blocos ordenados por Y (de cima para baixo)
            text_blocks = [b for b in blocks if b[6] == 0 and b[4].strip()]
            text_blocks.sort(key=lambda b: (b[1], b[0]))

            if text_blocks:
                has_any_text = True

            for blk in text_blocks:
                x0, y0, x1, y1, raw_text = blk[0], blk[1], blk[2], blk[3], blk[4]
                cleaned_text = raw_text.strip()
                if not cleaned_text:
                    continue

                page_elements_ast.append({
                    "x": round(x0 / width, 4),
                    "y": round(y0 / height, 4),
                    "width": round((x1 - x0) / width, 4),
                    "height": round((y1 - y0) / height, 4),
                    "text": cleaned_text,
                })

                lines = [line.strip() for line in cleaned_text.splitlines() if line.strip()]

                if is_header_line(y0, height):
                    header_lines.extend(lines)
                elif is_footer_line(y0, height):
                    footer_lines.extend(lines)
                else:
                    for line in lines:
                        is_title = (
                            line.isupper()
                            and (
                                line.startswith("CONTRATO")
                                or line.startswith("EDITAL")
                                or line.startswith("ANEXO")
                                or line.startswith("UNIVERSIDADE")
                            )
                        )
                        is_clause = line.startswith("CLÁUSULA") or line.startswith("CLAUSULA")

                        if is_title:
                            body_elements.append(
                                f"<h2 style='font-size: 14px; font-weight: 700; text-align: center; text-transform: uppercase; margin: 18px 0 10px 0; color: #0f172a;'>{html.escape(line)}</h2>"
                            )
                        elif is_clause:
                            body_elements.append(
                                f"<p style='margin-top: 14px; margin-bottom: 6px; font-weight: 700; font-size: 12.5px; color: #1e293b;'>{html.escape(line)}</p>"
                            )
                        else:
                            body_elements.append(
                                f"<p style='margin-bottom: 8px; line-height: 1.6; font-size: 12.5px; text-align: justify; color: #334155;'>{html.escape(line)}</p>"
                            )

            # Insere as tabelas extraídas no corpo do documento
            if page_tables_html:
                body_elements.extend(page_tables_html)

            # Monta componentes HTML segregados
            header_html = ""
            if header_lines:
                header_html = (
                    f"<div class='pdf-header' style='margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; font-size: 11px; color: #64748b; text-align: center;'>"
                    + "<br>".join(html.escape(l) for l in header_lines)
                    + "</div>"
                )

            body_html = f"<div class='pdf-body' style='flex: 1 1 auto;'>{''.join(body_elements)}</div>"

            footer_html = ""
            if footer_lines:
                footer_html = (
                    f"<div class='pdf-footer' style='margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 10.5px; color: #64748b; text-align: center; line-height: 1.5;'>"
                    + "<br>".join(html.escape(l) for l in footer_lines)
                    + "</div>"
                )

            page_container_html = (
                f"<div class='pdf-page pf' data-page-no='{page_num}' "
                f"style=\"box-sizing: border-box; width: 100%; max-width: 210mm; min-height: 297mm; "
                f"margin: 0 auto 30px auto; padding: 25mm 20mm; background: #ffffff; "
                f"box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; "
                f"display: flex; flex-direction: column; justify-content: space-between; "
                f"font-family: 'Aptos', 'Calibri', 'Arial', sans-serif;\">"
                f"{header_html}{body_html}{footer_html}"
                f"</div>"
            )

            full_html_pages.append(page_container_html)
            document_structure["pages"].append({
                "pageNumber": page_num,
                "width": round(width, 2),
                "height": round(height, 2),
                "elements": page_elements_ast,
            })

        if plumber_doc:
            plumber_doc.close()
        doc.close()

    doc_type = "flowable" if has_any_text else "scanned"

    return JSONResponse({
        "status": "success",
        "document_type": doc_type,
        "page_count": page_count,
        "html": "".join(full_html_pages),
        "structure": document_structure,
    })

