#!/usr/bin/env python3
"""
Reconstrutor Estrutural de Documentos Jurídicos (DOCX e PDF)
Transforma documentos em documentos contínuos editáveis estilo Word/HTML rico.
Preserva parágrafos, imagens, tabelas, alinhamentos, fontes e tags {{campo}}.
Aplica OCR (Tesseract) exclusivamente quando não há camada de texto utilizável.
"""

import sys
import os
import json
import subprocess
import tempfile
import base64
import csv
import zipfile
import re
import shutil
from pathlib import Path
import xml.etree.ElementTree as ET


def run_command(cmd, timeout=120):
    try:
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=timeout,
            check=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"Erro ao executar {cmd[0]}: {e.stderr}\n")
        raise
    except Exception as e:
        sys.stderr.write(f"Falha de execução {cmd[0]}: {str(e)}\n")
        raise


def extract_docx_to_rich_html(docx_path):
    """
    Lê a estrutura nativa OpenXML do DOCX:
    - Extrai imagens de word/media/
    - Reconstrói parágrafos, alinhamentos, formatações (negrito, itálico, tamanhos)
    - Reconstrói tabelas estruturadas
    - Preserva tags {{campo}}
    """
    NS = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
        'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture'
    }

    with zipfile.ZipFile(docx_path, 'r') as z:
        names = z.namelist()

        # 1. Extração de imagens
        images = {}
        for name in names:
            if name.startswith('word/media/'):
                filename = name.split('/')[-1]
                ext = filename.split('.')[-1].lower()
                mime = 'image/png' if ext == 'png' else ('image/jpeg' if ext in ['jpg', 'jpeg'] else 'image/png')
                b64 = base64.b64encode(z.read(name)).decode('ascii')
                images[filename] = f"data:{mime};base64,{b64}"

        # 2. Mapeamento de relações (rId -> imagem)
        rel_map = {}
        if 'word/_rels/document.xml.rels' in names:
            rels_root = ET.fromstring(z.read('word/_rels/document.xml.rels'))
            for rel in rels_root:
                rId = rel.get('Id')
                target = rel.get('Target', '')
                filename = target.split('/')[-1]
                if filename in images:
                    rel_map[rId] = images[filename]

        # 3. Mapeamento de relações de cabeçalho e rodapé
        header_blocks = []
        footer_blocks = []

        if 'word/document.xml' not in names:
            return "<p>Documento vazio.</p>"

        doc_root = ET.fromstring(z.read('word/document.xml'))
        body = doc_root.find('w:body', NS)
        if body is None:
            return "<p>Documento vazio.</p>"

        html_blocks = []

        def parse_paragraph(p_elem, default_align='justify'):
            align = default_align
            pPr = p_elem.find('w:pPr', NS)
            first_line_indent = None
            left_indent = None
            line_height = 1.5
            space_before = 0
            space_after = 6
            font_family = "'Times New Roman', Times, serif"

            if pPr is not None:
                jc = pPr.find('w:jc', NS)
                if jc is not None:
                    val = jc.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val', '')
                    if val == 'center':
                        align = 'center'
                    elif val == 'right':
                        align = 'right'
                    elif val == 'left':
                        align = 'left'
                    elif val == 'both':
                        align = 'justify'

                ind = pPr.find('w:ind', NS)
                if ind is not None:
                    fl_val = ind.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}firstLine')
                    if fl_val and fl_val.isdigit():
                        cm_val = round(int(fl_val) / 567.0, 2)
                        if cm_val > 0.1:
                            first_line_indent = f"{cm_val}cm"
                    l_val = ind.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}left')
                    if l_val and l_val.isdigit():
                        cm_val = round(int(l_val) / 567.0, 2)
                        if cm_val > 0.1:
                            left_indent = f"{cm_val}cm"

                spacing = pPr.find('w:spacing', NS)
                if spacing is not None:
                    line_val = spacing.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}line')
                    if line_val and line_val.isdigit():
                        mult = round(int(line_val) / 240.0, 2)
                        if 0.8 <= mult <= 3.0:
                            line_height = mult
                    after_val = spacing.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}after')
                    if after_val and after_val.isdigit():
                        pt_val = round(int(after_val) / 20.0, 1)
                        if pt_val >= 0:
                            space_after = pt_val
                    before_val = spacing.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}before')
                    if before_val and before_val.isdigit():
                        pt_val = round(int(before_val) / 20.0, 1)
                        if pt_val >= 0:
                            space_before = pt_val

            # Verifica imagem embutida no parágrafo
            img_html = []
            for blip in p_elem.findall('.//a:blip', NS):
                embed_id = blip.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                if embed_id and embed_id in rel_map:
                    img_src = rel_map[embed_id]
                    img_html.append(f'<img src="{img_src}" alt="Imagem do documento" style="max-width: 280px; max-height: 120px; width: auto; height: auto; display: inline-block;" />')

            # Detecção de quebra de página explícita no DOCX
            has_page_break = False
            if pPr is not None and pPr.find('w:pageBreakBefore', NS) is not None:
                has_page_break = True

            # Processa runs de texto
            runs_text = []
            is_title = False
            for r in p_elem.findall('w:r', NS):
                for br in r.findall('w:br', NS):
                    if br.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}type') == 'page':
                        has_page_break = True
                if r.find('w:lastRenderedPageBreak', NS) is not None:
                    has_page_break = True

                t = r.find('w:t', NS)
                if t is not None and t.text:
                    txt = t.text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    is_b = r.find('.//w:b', NS) is not None
                    is_i = r.find('.//w:i', NS) is not None
                    is_u = r.find('.//w:u', NS) is not None
                    sz = r.find('.//w:sz', NS)
                    rf = r.find('.//w:rFonts', NS)
                    if rf is not None:
                        f_name = rf.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}ascii') or rf.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}hAnsi')
                        if f_name:
                            if 'arial' in f_name.lower():
                                font_family = "Arial, Helvetica, sans-serif"
                            elif 'times' in f_name.lower():
                                font_family = "'Times New Roman', Times, serif"

                    formatted = txt
                    if is_b:
                        formatted = f"<b>{formatted}</b>"
                    if is_i:
                        formatted = f"<i>{formatted}</i>"
                    if is_u:
                        formatted = f"<u>{formatted}</u>"

                    if sz is not None:
                        val = sz.attrib.get('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val')
                        if val and int(val) >= 28:
                            is_title = True

                    runs_text.append(formatted)

            combined_text = "".join(runs_text)

            if img_html:
                img_block = f'<p style="text-align: {align}; margin: 12pt 0;">{" ".join(img_html)}</p>'
                if has_page_break:
                    return '<hr class="page-break" style="page-break-after: always; margin: 25px 0; border: none; border-top: 1px dashed #cbd5e1;" />\n' + img_block
                return img_block

            if not combined_text.strip():
                empty_block = '<p style="margin: 0 0 6pt 0;"><br/></p>'
                if has_page_break:
                    return '<hr class="page-break" style="page-break-after: always; margin: 25px 0; border: none; border-top: 1px dashed #cbd5e1;" />\n' + empty_block
                return empty_block

            if is_title:
                title_block = f'<h2 style="text-align: {align}; margin-top: 18pt; margin-bottom: 10pt; font-family: {font_family}; font-size: 15pt; font-weight: bold;">{combined_text}</h2>'
                if has_page_break:
                    return '<hr class="page-break" style="page-break-after: always; margin: 25px 0; border: none; border-top: 1px dashed #cbd5e1;" />\n' + title_block
                return title_block

            p_styles = [
                f"text-align: {align}",
                f"line-height: {line_height}",
                f"font-family: {font_family}",
                "font-size: 12pt",
                f"margin-top: {space_before}pt",
                f"margin-bottom: {space_after}pt",
            ]
            if first_line_indent:
                p_styles.append(f"text-indent: {first_line_indent}")
            if left_indent:
                p_styles.append(f"margin-left: {left_indent}")

            p_block = f'<p style="{"; ".join(p_styles)};">{combined_text}</p>'
            if has_page_break:
                return '<hr class="page-break" style="page-break-after: always; margin: 25px 0; border: none; border-top: 1px dashed #cbd5e1;" />\n' + p_block
            return p_block

        def parse_table(tbl_elem):
            rows_html = []
            for tr in tbl_elem.findall('w:tr', NS):
                cells_html = []
                for tc in tr.findall('w:tc', NS):
                    tc_paragraphs = [parse_paragraph(p) for p in tc.findall('w:p', NS)]
                    cell_content = "".join(tc_paragraphs) or "&nbsp;"
                    cells_html.append(f'<td style="border: 1px solid #cbd5e1; padding: 6pt 10pt; vertical-align: top;">{cell_content}</td>')
                rows_html.append(f'<tr>{"".join(cells_html)}</tr>')
            return f'<table style="width: 100%; border-collapse: collapse; margin: 14pt 0; font-size: 10.5pt;">{"".join(rows_html)}</table>'

        # Extração opcional de cabeçalhos e rodapés oficiais
        for name in names:
            if name.startswith('word/header') and name.endswith('.xml'):
                try:
                    h_root = ET.fromstring(z.read(name))
                    for p in h_root.findall('.//w:p', NS):
                        pb = parse_paragraph(p, default_align='center')
                        if pb:
                            header_blocks.append(pb)
                except Exception:
                    pass
            elif name.startswith('word/footer') and name.endswith('.xml'):
                try:
                    f_root = ET.fromstring(z.read(name))
                    for p in f_root.findall('.//w:p', NS):
                        pb = parse_paragraph(p, default_align='center')
                        if pb:
                            footer_blocks.append(pb)
                except Exception:
                    pass

        for child in body:
            tag = child.tag.split('}')[-1]
            if tag == 'p':
                block = parse_paragraph(child)
                if block:
                    html_blocks.append(block)
            elif tag == 'tbl':
                html_blocks.append(parse_table(child))

        final_blocks = []
        if header_blocks:
            final_blocks.append(f'<header class="document-header" style="text-align: center; margin-bottom: 16pt; padding-bottom: 8pt; border-bottom: 1px solid #e2e8f0; font-size: 10pt;">{" ".join(header_blocks)}</header>')
        final_blocks.extend(html_blocks)
        if footer_blocks:
            final_blocks.append(f'<footer class="document-footer" style="text-align: center; margin-top: 20pt; padding-top: 8pt; border-top: 1px solid #e2e8f0; font-size: 9pt; color: #64748b;">{" ".join(footer_blocks)}</footer>')

        return "\n".join(final_blocks)


def extract_pdf_digital_to_rich_html(pdf_path, temp_dir):
    """
    Extrai texto vetorial estruturado de PDF digital usando poppler (pdftotext -bbox-layout)
    e extrai imagens embutidas usando pdfimages.
    Reconstrói parágrafos contínuos com alinhamento e títulos.
    """
    # 1. Extrai imagens embutidas do PDF
    img_prefix = os.path.join(temp_dir, "img")
    try:
        subprocess.run(["pdfimages", "-png", pdf_path, img_prefix], timeout=30, check=False)
    except Exception:
        pass

    extracted_images = sorted([
        os.path.join(temp_dir, f) for f in os.listdir(temp_dir) if f.startswith("img-") and f.endswith(".png")
    ])
    images_b64 = []
    for img_p in extracted_images:
        try:
            with open(img_p, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("ascii")
                images_b64.append(f"data:image/png;base64,{b64}")
        except Exception:
            pass

    # 2. Executa pdftotext -bbox-layout
    try:
        xml_output = run_command(["pdftotext", "-bbox-layout", pdf_path, "-"], timeout=60)
    except Exception:
        return None

    try:
        root = ET.fromstring(xml_output)
    except Exception:
        return None

    html_blocks = []
    total_words = 0
    img_idx = 0

    for page in root.iter():
        if page.tag.endswith('page'):
            page_w = float(page.get('width', '595'))
            page_blocks = []

            for flow in page.iter():
                if flow.tag.endswith('flow'):
                    for block in flow.iter():
                        if block.tag.endswith('block'):
                            block_lines = []
                            line_widths = []
                            max_font_size = 0.0

                            for line in block.iter():
                                if line.tag.endswith('line'):
                                    words = []
                                    xMin = float(line.get('xMin', '0'))
                                    xMax = float(line.get('xMax', '0'))
                                    yMin = float(line.get('yMin', '0'))
                                    yMax = float(line.get('yMax', '0'))
                                    line_h = max(1.0, yMax - yMin)

                                    for word in line.iter():
                                        if word.tag.endswith('word') and word.text:
                                            words.append(word.text)
                                            total_words += 1

                                    if words:
                                        block_lines.append(" ".join(words))
                                        line_widths.append((xMin, xMax, line_h))
                                        max_font_size = max(max_font_size, line_h * 0.9)

                            if block_lines:
                                paragraph_text = " ".join(block_lines).strip()
                                paragraph_text = paragraph_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

                                # Determina alinhamento baseado na posição horizontal média
                                first_xMin = line_widths[0][0]
                                first_xMax = line_widths[0][1]
                                line_center = (first_xMin + first_xMax) / 2.0
                                page_center = page_w / 2.0

                                align = 'justify'
                                if abs(line_center - page_center) < (page_w * 0.08):
                                    align = 'center'
                                elif first_xMin > (page_w * 0.55):
                                    align = 'right'

                                # Detecção de título ou cláusula
                                is_heading = max_font_size >= 14.0 or paragraph_text.isupper() and len(paragraph_text) < 80
                                is_clause = paragraph_text.upper().startswith('CLÁUSULA') or paragraph_text.upper().startswith('CLAUSULA')

                                if is_heading:
                                    page_blocks.append(f'<h2 style="text-align: {align}; margin-top: 18pt; margin-bottom: 10pt; font-family: \'Times New Roman\', Times, serif; font-size: 15pt; font-weight: bold;">{paragraph_text}</h2>')
                                elif is_clause:
                                    page_blocks.append(f'<p style="text-align: {align}; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; line-height: 1.5; font-family: \'Times New Roman\', Times, serif; font-size: 12pt;">{paragraph_text}</p>')
                                else:
                                    page_blocks.append(f'<p style="text-align: {align}; margin-top: 0; margin-bottom: 6pt; line-height: 1.5; font-family: \'Times New Roman\', Times, serif; font-size: 12pt;">{paragraph_text}</p>')

            # Se existirem imagens extraídas, insere no topo ou posição relevante
            if img_idx < len(images_b64):
                img_src = images_b64[img_idx]
                img_idx += 1
                page_blocks.insert(0, f'<p style="text-align: center; margin: 12pt 0;"><img src="{img_src}" style="max-width: 250px; max-height: 100px; height: auto;" /></p>')

            if page_blocks:
                html_blocks.extend(page_blocks)
                html_blocks.append('<hr class="page-break" style="margin: 25px 0; border: none; border-top: 1px dashed #cbd5e1;" />')

    if total_words < 5:
        return None  # Provavelmente escaneado ou baseado em imagem

    return "\n".join(html_blocks)


def extract_pdf_scanned_with_ocr(pdf_path, temp_dir):
    """
    Executa OCR em português com Tesseract quando o PDF não possui camada de texto.
    Reconstrói os parágrafos agrupando por par_num e block_num em fluxo contínuo.
    """
    prefix = os.path.join(temp_dir, "page")
    run_command(["pdftoppm", "-png", "-r", "150", pdf_path, prefix], timeout=120)

    page_images = sorted([
        os.path.join(temp_dir, f) for f in os.listdir(temp_dir) if f.startswith("page-") and f.endswith(".png")
    ], key=lambda p: int(Path(p).stem.split("-")[-1]))

    html_blocks = []

    for page_num, img_path in enumerate(page_images, start=1):
        base_tsv = img_path + "_ocr"
        tsv_path = base_tsv + ".tsv"

        run_command(["tesseract", img_path, base_tsv, "tsv", "-l", "por+eng"], timeout=90)

        if not os.path.exists(tsv_path):
            continue

        paragraphs = {}
        with open(tsv_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f, delimiter="\t")
            for row in reader:
                level = int(row.get("level", 0))
                conf = float(row.get("conf", -1))
                text = row.get("text", "").strip()

                if level == 5 and conf > 20 and text:
                    block_num = int(row.get("block_num", 0))
                    par_num = int(row.get("par_num", 0))
                    key = (block_num, par_num)

                    if key not in paragraphs:
                        paragraphs[key] = {
                            "words": [],
                            "left": int(row.get("left", 0)),
                            "right": int(row.get("left", 0)) + int(row.get("width", 0))
                        }

                    paragraphs[key]["words"].append(text)
                    paragraphs[key]["right"] = max(paragraphs[key]["right"], int(row.get("left", 0)) + int(row.get("width", 0)))

        for key, p_data in paragraphs.items():
            words = p_data["words"]
            if not words:
                continue

            par_text = " ".join(words).strip()
            par_text = par_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

            is_heading = par_text.isupper() and len(par_text) < 70
            is_clause = par_text.upper().startswith('CLÁUSULA') or par_text.upper().startswith('CLAUSULA')

            if is_heading:
                html_blocks.append(f'<h2 style="text-align: center; margin-top: 18pt; margin-bottom: 10pt; font-family: \'Times New Roman\', Times, serif; font-size: 15pt; font-weight: bold;">{par_text}</h2>')
            elif is_clause:
                html_blocks.append(f'<p style="font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; line-height: 1.5; font-family: \'Times New Roman\', Times, serif; font-size: 12pt;">{par_text}</p>')
            else:
                html_blocks.append(f'<p style="text-align: justify; line-height: 1.5; margin-top: 0; margin-bottom: 6pt; font-family: \'Times New Roman\', Times, serif; font-size: 12pt;">{par_text}</p>')

        if page_num < len(page_images):
            html_blocks.append('<hr class="page-break" style="margin: 25px 0; border: none; border-top: 1px dashed #cbd5e1;" />')

    return "\n".join(html_blocks)


def process_document_to_structured_document(file_path):
    """
    Orquestrador principal de leitura e reconstrução:
    1. DOCX -> Análise nativa OpenXML
    2. PDF Digital -> Análise vetorial Poppler
    3. PDF Escaneado -> OCR Tesseract
    Retorna HTML rico com reflow, tags identificadas e metadados.
    """
    temp_dir = tempfile.mkdtemp(prefix="smart_gendocs_struct_")
    try:
        lower_path = file_path.lower()
        is_docx = lower_path.endswith('.docx')
        is_scanned = False
        document_type = "pdf_digital"

        if is_docx:
            document_type = "docx"
            html = extract_docx_to_rich_html(file_path)
        else:
            # Tenta extração vetorial do PDF digital
            html = extract_pdf_digital_to_rich_html(file_path, temp_dir)
            if not html:
                # Aciona OCR exclusivamente para PDF escaneado
                is_scanned = True
                document_type = "pdf_scanned"
                html = extract_pdf_scanned_with_ocr(file_path, temp_dir)

        if not html or not html.strip():
            html = "<p>Nenhum texto pôde ser extraído do documento.</p>"

        # Encontra tags como {{nome_do_cliente}} existentes no texto
        found_fields = sorted(list(set(re.findall(r'\{\{([a-zA-Z0-9_]+)\}\}', html))))

        return {
            "documentType": document_type,
            "html": html,
            "fieldsDetected": found_fields,
            "isScanned": is_scanned,
            "isDocx": is_docx
        }
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write("Uso: python3 document_processor.py <caminho_arquivo>\n")
        sys.exit(1)

    input_file = sys.argv[1]
    if not os.path.exists(input_file):
        sys.stderr.write(f"Arquivo não encontrado: {input_file}\n")
        sys.exit(1)

    result = process_document_to_structured_document(input_file)
    print(json.dumps(result, ensure_ascii=False))
