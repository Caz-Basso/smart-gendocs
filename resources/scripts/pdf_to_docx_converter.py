#!/usr/bin/env python3
"""
Conversor de PDF para DOCX de Alta Fidelidade com suporte a OCR
Integração especializada para o SisGenDocs (editais e modelos jurídicos).

Funcionalidades:
1. Validação estrutural do PDF (magic bytes, integridade, limites).
2. Detecção de proteção por senha / criptografia.
3. Diferenciação entre PDF com texto selecionável e PDF digitalizado (escaneado).
4. Conversão de PDFs digitais para DOCX preservando texto, parágrafos, tabelas, formatações e imagens via pdf2docx.
5. Conversão de PDFs escaneados via OCR com Tesseract (por+eng) reconstruindo o DOCX estruturado.
6. Fallback resiliente caso o conversor vetorial encontre anomalias no PDF.
7. Validação do arquivo DOCX resultante (integridade OpenXML).
"""

import sys
import os
import json
import tempfile
import shutil
from pathlib import Path

# Suprime avisos do fitz/pymupdf para manter a saída JSON limpa
os.environ["FIT_WARNINGS"] = "0"
import warnings
warnings.filterwarnings("ignore")

import pymupdf  # PyMuPDF
import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT


def error_exit(message: str, code: int = 1):
    payload = {
        "success": False,
        "error": message
    }
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.exit(code)


def validate_pdf_file(pdf_path: str) -> None:
    """Verifica existência, tamanho e magic bytes do PDF."""
    if not os.path.isfile(pdf_path):
        error_exit("Arquivo PDF não encontrado.", code=2)

    file_size = os.path.getsize(pdf_path)
    if file_size == 0:
        error_exit("O arquivo enviado está vazio (0 bytes).", code=2)

    # Limite máximo de segurança: 50MB
    if file_size > 50 * 1024 * 1024:
        error_exit("O arquivo PDF excede o limite máximo permitido de 50MB.", code=2)

    # Validação de magic bytes (%PDF-)
    with open(pdf_path, "rb") as f:
        header = f.read(1024)
        if b"%PDF-" not in header:
            error_exit("O arquivo enviado não é um documento PDF válido.", code=2)


def check_encryption_and_integrity(pdf_path: str):
    """Abre o documento e verifica proteção por senha e integridade."""
    try:
        doc = pymupdf.open(pdf_path)
    except Exception as e:
        error_exit(f"O arquivo enviado está corrompido ou possui formato inválido: {str(e)}", code=3)

    if doc.is_encrypted or doc.needs_pass:
        doc.close()
        error_exit("O arquivo PDF está protegido por senha. Remova a proteção antes de importar.", code=4)

    page_count = len(doc)
    if page_count == 0:
        doc.close()
        error_exit("O arquivo PDF não contém nenhuma página.", code=5)

    if page_count > 100:
        doc.close()
        error_exit("O arquivo PDF excede o limite máximo de 100 páginas.", code=6)

    return doc


def analyze_pdf_content(doc):
    """
    Analisa o conteúdo do PDF:
    - Retorna se possui texto selecionável suficiente ou se é escaneado
    - Detecta presença de tabelas/linhas estruturais
    - Detecta presença de imagens
    """
    total_text_length = 0
    total_images = 0
    has_drawings = False

    for page in doc:
        text = page.get_text().strip()
        total_text_length += len(text)
        images = page.get_images(full=True)
        total_images += len(images)
        drawings = page.get_drawings()
        if len(drawings) > 2:
            has_drawings = True

    is_scanned = total_text_length < 25
    return {
        "page_count": len(doc),
        "total_text_length": total_text_length,
        "is_scanned": is_scanned,
        "has_images": total_images > 0,
        "has_tables": has_drawings or ("\t" in text if total_text_length > 0 else False),
    }


def convert_digital_pdf_with_pdf2docx(pdf_path: str, docx_path: str) -> bool:
    """Utiliza pdf2docx para reconstrução vetorial completa (tabelas, fontes, estilos, imagens)."""
    try:
        import io
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            from pdf2docx import Converter
        finally:
            sys.stdout = old_stdout

        cv = Converter(pdf_path)
        # Converte todas as páginas
        cv.convert(docx_path, start=0, end=None)
        cv.close()
        return os.path.isfile(docx_path) and os.path.getsize(docx_path) > 0
    except Exception as e:
        sys.stderr.write(f"pdf2docx falhou: {str(e)}\n")
        return False


def convert_digital_pdf_fallback(doc, docx_path: str):
    """
    Fallback robusto usando PyMuPDF diretamente para extrair parágrafos,
    tabelas e imagens estruturadas em um documento python-docx.
    """
    out_doc = docx.Document()

    # Configura margens padrão A4 (2.5cm)
    for section in out_doc.sections:
        section.top_margin = Inches(0.98)
        section.bottom_margin = Inches(0.98)
        section.left_margin = Inches(1.18)
        section.right_margin = Inches(0.98)
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)

    for page_idx, page in enumerate(doc):
        if page_idx > 0:
            out_doc.add_page_break()

        # Extração de tabelas nativas via PyMuPDF (find_tables)
        tables = page.find_tables()
        table_rects = [t.bbox for t in tables] if tables else []

        # Extração de blocos de texto
        blocks = page.get_text("blocks")
        # Ordena blocos verticalmente (top to bottom)
        blocks = sorted(blocks, key=lambda b: (b[1], b[0]))

        # Extrai imagens da página
        image_list = page.get_images(full=True)
        img_temp_dir = tempfile.mkdtemp(prefix="pdf_fallback_img_")

        try:
            # Processa blocos de texto que não estejam dentro de tabelas
            for b in blocks:
                b_rect = pymupdf.Rect(b[0], b[1], b[2], b[3])
                # Ignora texto dentro de tabelas já detectadas
                in_table = any(b_rect.intersects(t_bbox) for t_bbox in table_rects)
                if in_table:
                    continue

                text = b[4].strip()
                if not text:
                    continue

                # Identifica títulos (caixa alta ou tamanho)
                p = out_doc.add_paragraph()
                p.paragraph_format.line_spacing = 1.3
                p.paragraph_format.space_after = Pt(6)

                is_heading = text.isupper() and len(text) < 80
                if is_heading:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    run = p.add_run(text)
                    run.bold = True
                    run.font.name = "Times New Roman"
                    run.font.size = Pt(13)
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                    run = p.add_run(text)
                    run.font.name = "Times New Roman"
                    run.font.size = Pt(11)

            # Adiciona tabelas encontradas
            if tables:
                for tab in tables:
                    extracted_tab = tab.extract()
                    if not extracted_tab or len(extracted_tab) == 0:
                        continue

                    num_rows = len(extracted_tab)
                    num_cols = max(len(row) for row in extracted_tab)
                    docx_tab = out_doc.add_table(rows=num_rows, cols=num_cols)
                    docx_tab.alignment = WD_TABLE_ALIGNMENT.CENTER
                    docx_tab.style = "Table Grid"

                    for r_idx, row_data in enumerate(extracted_tab):
                        for c_idx, cell_value in enumerate(row_data):
                            if c_idx < num_cols:
                                cell = docx_tab.cell(r_idx, c_idx)
                                cell.text = (cell_value or "").strip()

            # Adiciona imagens encontradas (se pequenas ou médias)
            for img_info in image_list[:3]:  # limita imagens por página para não inflar
                xref = img_info[0]
                base_img = doc.extract_image(xref)
                if base_img:
                    img_bytes = base_img["image"]
                    img_ext = base_img["ext"]
                    img_path = os.path.join(img_temp_dir, f"img_{page_idx}_{xref}.{img_ext}")
                    with open(img_path, "wb") as img_f:
                        img_f.write(img_bytes)

                    try:
                        out_doc.add_paragraph()
                        out_doc.add_picture(img_path, width=Inches(3.0))
                    except Exception:
                        pass
        finally:
            shutil.rmtree(img_temp_dir, ignore_errors=True)

    out_doc.save(docx_path)


def convert_scanned_pdf_with_ocr(doc, docx_path: str) -> None:
    """
    Executa OCR em cada página do PDF escaneado usando Tesseract (por+eng)
    e reconstrói o DOCX estruturado com parágrafos, quebras e formatação.
    """
    import pytesseract
    from PIL import Image

    # Verifica se tesseract está acessível
    try:
        pytesseract.get_tesseract_version()
    except Exception as e:
        error_exit(
            "O PDF é digitalizado/escaneado (sem camada de texto), mas o Tesseract OCR não está disponível no servidor.",
            code=7
        )

    out_doc = docx.Document()
    for section in out_doc.sections:
        section.top_margin = Inches(0.98)
        section.bottom_margin = Inches(0.98)
        section.left_margin = Inches(1.18)
        section.right_margin = Inches(0.98)

    temp_dir = tempfile.mkdtemp(prefix="ocr_pdf_docx_")
    total_ocr_words = 0

    try:
        for page_num in range(len(doc)):
            if page_num > 0:
                out_doc.add_page_break()

            page = doc[page_num]
            pix = page.get_pixmap(dpi=150)
            page_img_path = os.path.join(temp_dir, f"page_{page_num}.png")
            pix.save(page_img_path)

            try:
                img = Image.open(page_img_path)
                # Tenta português + inglês
                ocr_text = pytesseract.image_to_string(img, lang="por+eng")
            except Exception:
                try:
                    ocr_text = pytesseract.image_to_string(img, lang="por")
                except Exception as e:
                    sys.stderr.write(f"Falha no OCR da página {page_num}: {str(e)}\n")
                    ocr_text = ""

            paragraphs = [p.strip() for p in ocr_text.split("\n\n") if p.strip()]

            for p_text in paragraphs:
                clean_text = " ".join(p_text.split())
                if not clean_text:
                    continue

                total_ocr_words += len(clean_text.split())
                p = out_doc.add_paragraph()
                p.paragraph_format.line_spacing = 1.3
                p.paragraph_format.space_after = Pt(6)

                is_heading = clean_text.isupper() and len(clean_text) < 80
                is_clause = clean_text.upper().startswith("CLÁUSULA") or clean_text.upper().startswith("CLAUSULA")

                if is_heading:
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    run = p.add_run(clean_text)
                    run.bold = True
                    run.font.name = "Times New Roman"
                    run.font.size = Pt(13)
                elif is_clause:
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    run = p.add_run(clean_text)
                    run.bold = True
                    run.font.name = "Times New Roman"
                    run.font.size = Pt(11)
                else:
                    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                    run = p.add_run(clean_text)
                    run.font.name = "Times New Roman"
                    run.font.size = Pt(11)

        if total_ocr_words < 5:
            # Documento muito ruidoso ou ilegível
            p = out_doc.add_paragraph("Aviso: O documento foi identificado como imagem digitalizada, porém o OCR obteve pouca ou nenhuma leitura legível.")
            p.paragraph_format.space_after = Pt(10)

        out_doc.save(docx_path)
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def validate_generated_docx(docx_path: str):
    """Valida se o arquivo DOCX final é válido, não está vazio e pode ser aberto."""
    if not os.path.isfile(docx_path):
        error_exit("O arquivo DOCX não foi gerado pelo processo de conversão.", code=8)

    if os.path.getsize(docx_path) == 0:
        error_exit("O arquivo DOCX gerado está vazio.", code=8)

    try:
        test_doc = docx.Document(docx_path)
        paragraphs_count = len(test_doc.paragraphs)
        tables_count = len(test_doc.tables)
    except Exception as e:
        error_exit(f"O arquivo DOCX gerado possui formato inválido ou corrompido: {str(e)}", code=8)

    return {
        "paragraphs_count": paragraphs_count,
        "tables_count": tables_count
    }


def strip_headers_footers(doc) -> int:
    """
    Identifica e remove cabeçalhos e rodapés institucionais/recorrentes do PDF original.
    Preserva títulos importantes, cláusulas, datas, assinaturas e tags {{campo}}.
    """
    import re

    header_threshold = 0.12  # topo 12% da página (~100pt em folha A4)
    footer_threshold = 0.88  # base 12% da página (~740pt em folha A4)

    header_texts = {}
    footer_texts = {}

    for page_idx, page in enumerate(doc):
        h = page.rect.height
        blocks = page.get_text("blocks")
        for b in blocks:
            text = b[4].strip()
            if not text:
                continue
            y0, y1 = b[1], b[3]
            if y1 <= h * header_threshold:
                header_texts.setdefault(text, []).append(page_idx)
            elif y0 >= h * footer_threshold:
                footer_texts.setdefault(text, []).append(page_idx)

    pagination_re = re.compile(
        r'^(?:p[áa]g(?:ina)?\.?\s*\d+(?:\s*(?:de|\/)\s*\d+)?|\d+\s*(?:de|\/)\s*\d+|\d+)$',
        re.IGNORECASE
    )
    header_info_re = re.compile(
        r'(?:universidade|unesc|gabinete|reitoria|prefeitura|governo|secretaria|departamento|pr[óo]-reitoria|campus|minist[ée]rio|instituto)',
        re.IGNORECASE
    )
    footer_info_re = re.compile(
        r'(?:www\.|\.unesc\.net|cnpj|fone:|telefone:|cep\s*\d|av\.\s*universit[áa]ria|rua\s+|bairro\s+)',
        re.IGNORECASE
    )
    protected_re = re.compile(
        r'^(?:cl[áa]usula|edital|processo|contrato|termo|anexo|objeto|portaria|resolu[çc][ãa]o|data:|assina)',
        re.IGNORECASE
    )

    removed_count = 0
    num_pages = len(doc)

    for page_idx, page in enumerate(doc):
        h = page.rect.height
        blocks = page.get_text("blocks")

        for b in blocks:
            text = b[4].strip()
            if not text or protected_re.match(text) or "{{" in text:
                continue

            y0, y1 = b[1], b[3]
            is_header = False
            is_footer = False

            if y1 <= h * header_threshold:
                if (num_pages > 1 and len(header_texts.get(text, [])) > 1) or pagination_re.match(text) or header_info_re.search(text):
                    is_header = True
                elif num_pages == 1 and (pagination_re.match(text) or header_info_re.search(text)):
                    is_header = True

            if y0 >= h * footer_threshold:
                if (num_pages > 1 and len(footer_texts.get(text, [])) > 1) or pagination_re.match(text) or footer_info_re.search(text):
                    is_footer = True
                elif num_pages == 1 and (pagination_re.match(text) or footer_info_re.search(text)):
                    is_footer = True

            if is_header or is_footer:
                rect = pymupdf.Rect(b[0] - 2, b[1] - 2, b[2] + 2, b[3] + 2)
                page.add_redact_annot(rect)
                removed_count += 1

        if num_pages > 1:
            images = page.get_images(full=True)
            for img_info in images:
                xref = img_info[0]
                img_rects = page.get_image_rects(xref)
                for irect in img_rects:
                    if irect.y1 <= h * header_threshold:
                        page.add_redact_annot(irect)
                        removed_count += 1

        page.apply_redactions()

    return removed_count


def convert_pdf_to_docx(input_pdf: str, output_docx: str):
    """Fluxo orquestrado completo de conversão de PDF para DOCX."""
    import uuid
    validate_pdf_file(input_pdf)
    doc = check_encryption_and_integrity(input_pdf)

    analysis = analyze_pdf_content(doc)
    warnings = []

    # Cria diretório de destino se necessário
    output_dir = os.path.dirname(os.path.abspath(output_docx))
    os.makedirs(output_dir, exist_ok=True)

    # Remove/desconsidera cabeçalhos e rodapés institucionais do PDF original
    removed_headers_footers = strip_headers_footers(doc)
    if removed_headers_footers > 0:
        warnings.append(f"Foram identificados e ignorados {removed_headers_footers} elementos de cabeçalho/rodapé do PDF original.")

    if analysis["is_scanned"]:
        # PDF digitalizado (escaneado) -> OCR (já com cabeçalhos e rodapés removidos)
        convert_scanned_pdf_with_ocr(doc, output_docx)
        conversion_mode = "ocr"
    else:
        # Salva o PDF limpo temporário para alimentar o conversor vetorial
        clean_temp_pdf = os.path.join(tempfile.gettempdir(), f"clean_pdf_{uuid.uuid4().hex}.pdf")
        doc.save(clean_temp_pdf)
        doc.close()

        success = convert_digital_pdf_with_pdf2docx(clean_temp_pdf, output_docx)
        if success:
            conversion_mode = "pdf2docx"
        else:
            warnings.append("A conversão vetorial primária falhou; foi utilizado o fallback estrutural PyMuPDF.")
            clean_doc = pymupdf.open(clean_temp_pdf)
            convert_digital_pdf_fallback(clean_doc, output_docx)
            clean_doc.close()
            conversion_mode = "fallback_pymupdf"

        if os.path.isfile(clean_temp_pdf):
            try:
                os.remove(clean_temp_pdf)
            except Exception:
                pass

    # Validação do DOCX gerado
    doc_stats = validate_generated_docx(output_docx)

    return {
        "success": True,
        "docxPath": output_docx,
        "pageCount": analysis["page_count"],
        "isScanned": analysis["is_scanned"],
        "hasTables": analysis["has_tables"],
        "hasImages": analysis["has_images"],
        "headersFootersIgnored": removed_headers_footers > 0,
        "headersFootersCount": removed_headers_footers,
        "conversionMode": conversion_mode,
        "paragraphsCount": doc_stats["paragraphs_count"],
        "tablesCount": doc_stats["tables_count"],
        "warnings": warnings
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        error_exit("Uso: python3 pdf_to_docx_converter.py <input_pdf> <output_docx>", code=1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        result = convert_pdf_to_docx(input_file, output_file)
        sys.stdout.write(json.dumps(result, ensure_ascii=False) + "\n")
        sys.exit(0)
    except SystemExit:
        raise
    except Exception as e:
        error_exit(f"Erro inesperado durante a conversão do PDF para DOCX: {str(e)}", code=9)

