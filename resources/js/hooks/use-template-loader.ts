import mammoth from 'mammoth';
import { useEffect, useState } from 'react';
import { parsePdfBytes, type PdfDocumentStructure } from '@/lib/pdf-document';
import { cleanHtml, constrainImages } from '@/lib/template-utils';

const DOCX_MIME =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type LoadedDocument =
    | { kind: 'docx'; html: string }
    | {
          kind: 'pdf';
          /** 'file' = upload novo; 'remote' = PDF original já salvo no servidor */
          source: 'file' | 'remote';
          structure: PdfDocumentStructure;
          pageImages: string[];
      }
    | { kind: 'error'; message: string };

async function parseFile(file: File): Promise<LoadedDocument> {
    const name = file.name.toLowerCase();
    const buffer = await file.arrayBuffer();

    if (name.endsWith('.docx') || file.type === DOCX_MIME) {
        const result = await mammoth.convertToHtml({
            arrayBuffer: buffer,
            styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
            ],
        });

        return {
            kind: 'docx',
            html: constrainImages(
                cleanHtml(result.value || '<p>Documento vazio.</p>'),
            ),
        };
    }

    if (name.endsWith('.pdf') || file.type === 'application/pdf') {
        const parsed = await parsePdfBytes(buffer);

        return {
            kind: 'pdf',
            source: 'file',
            structure: parsed.structure,
            pageImages: parsed.pageImages,
        };
    }

    return {
        kind: 'error',
        message: 'Tipo de arquivo não suportado. Selecione um .docx ou .pdf.',
    };
}

async function parseRemotePdf(url: string): Promise<LoadedDocument> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error('Não foi possível carregar o PDF original.');
    }

    const parsed = await parsePdfBytes(await response.arrayBuffer());

    return {
        kind: 'pdf',
        source: 'remote',
        structure: parsed.structure,
        pageImages: parsed.pageImages,
    };
}

/**
 * Lê o arquivo enviado (DOCX/PDF) ou, sem arquivo, o PDF original do modelo.
 * Centraliza loading, cancelamento e erro.
 */
export function useTemplateLoader(
    file: File | null,
    remotePdfUrl: string | null,
) {
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState<LoadedDocument | null>(null);

    useEffect(() => {
        if (!file && !remotePdfUrl) {
            setLoaded(null);
            setLoading(false);

            return;
        }

        let cancelled = false;

        const run = async () => {
            setLoading(true);

            try {
                const result = file
                    ? await parseFile(file)
                    : await parseRemotePdf(remotePdfUrl as string);

                if (!cancelled) setLoaded(result);
            } catch (error) {
                console.error('Erro ao carregar documento:', error);

                if (!cancelled) {
                    setLoaded({
                        kind: 'error',
                        message:
                            'Não foi possível ler o documento. Confira se o arquivo é um PDF ou DOCX válido.',
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [file, remotePdfUrl]);

    return { loading, loaded };
}
