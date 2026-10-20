import sys
import unittest
import tempfile
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "resources/scripts"))

from document_processor import (
    convert_pdf_table_to_html,
    is_docx_heading,
    is_pdf_heading,
    is_short_uppercase_heading,
    extract_docx_to_rich_html,
)


class DocumentHeadingDetectionTest(unittest.TestCase):
    def test_only_short_uppercase_text_is_detected_as_heading(self):
        self.assertTrue(is_short_uppercase_heading("TITULO PRINCIPAL"))
        self.assertFalse(
            is_short_uppercase_heading(
                "TODOS OS DOCUMENTOS DEVEM SER ENTREGUES NO SETOR RESPONSAVEL "
                "DENTRO DO PRAZO ESTABELECIDO PELA INSTITUICAO"
            )
        )

    def test_pdf_heading_requires_most_lines_to_be_large(self):
        self.assertTrue(is_pdf_heading("Titulo principal", [20.2, 21.0]))
        self.assertFalse(is_pdf_heading("Trecho normal", [22.6, 18.1, 18.1]))
        self.assertFalse(is_pdf_heading("Texto normal", [18.1, 18.4]))

    def test_docx_heading_uses_paragraph_style_or_mostly_large_text(self):
        self.assertTrue(is_docx_heading("Heading1", "Titulo", 6, 0))
        self.assertTrue(is_docx_heading("Normal", "Titulo maior", 11, 10))
        self.assertFalse(is_docx_heading("Normal", "Texto", 100, 14))


class DocumentTableConversionTest(unittest.TestCase):
    def test_pdf_table_conversion_preserves_rows_and_escapes_cell_text(self):
        converted_html = convert_pdf_table_to_html([
            ["Item", "Descrição"],
            ["1", "Peças < especiais >"],
        ])

        self.assertIn("<th ", converted_html)
        self.assertIn("<td ", converted_html)
        self.assertIn("Peças &lt; especiais &gt;", converted_html)

    def test_docx_table_cells_remain_cells_even_when_their_text_looks_like_a_heading(self):
        document_xml = """<?xml version="1.0" encoding="UTF-8"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:tbl>
              <w:tr>
                <w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr>
                  <w:p><w:r><w:rPr><w:sz w:val="36"/></w:rPr><w:t>RESUMO</w:t></w:r></w:p>
                </w:tc>
              </w:tr>
              <w:tr><w:tc><w:p><w:r><w:t>Valor</w:t></w:r></w:p></w:tc></w:tr>
            </w:tbl>
            <w:sectPr/>
          </w:body>
        </w:document>"""

        with tempfile.TemporaryDirectory() as temporary_directory:
            docx_path = Path(temporary_directory) / "table.docx"
            with zipfile.ZipFile(docx_path, "w") as document:
                document.writestr("word/document.xml", document_xml)

            converted_html = extract_docx_to_rich_html(str(docx_path))

        self.assertIn("<table", converted_html)
        self.assertIn('<th colspan="2"', converted_html)
        self.assertNotIn("<h2", converted_html)
        self.assertIn("<td ", converted_html)


if __name__ == "__main__":
    unittest.main()
