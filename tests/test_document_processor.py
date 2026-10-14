import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "resources/scripts"))

from document_processor import (
    is_docx_heading,
    is_pdf_heading,
    is_short_uppercase_heading,
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


if __name__ == "__main__":
    unittest.main()
