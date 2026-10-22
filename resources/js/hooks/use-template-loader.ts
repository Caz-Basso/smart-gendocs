import mammoth from 'mammoth';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { parsePdfBytes, type PdfDocumentStructure } from '@/lib/pdf-document';
import { cleanHtml, constrainImages } from '@/lib/template-utils';

const DOCX_MIME =
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type LoadedDocument =
    | {
          kind: 'rich_document';
          html: string;
          fieldsDetected: string[];
          isScanned: boolean;
          isDocx: boolean;
      }
    | { kind: 'docx'; html: string }
    | {
          kind: 'pdf';
          /** 'file' = upload novo; 'remote' = PDF original já salvo no servidor */
          source: 'file' | 'remote';
          structure: PdfDocumentStructure;
          pageImages: string[];
      }
    | { kind: 'error'; message: string };

async function parseFileViaServer(file: File): Promise<LoadedDocument | null> {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    try {
        const formData = new FormData();
        formData.append('template', file);

        const csrfToken =
            document
                .querySelector('meta[name="csrf-token"]')
                ?.getAttribute('content') || '';

        const response = await fetch('/modelos/analisar', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                Accept: 'application/json',
            },
            body: formData,
        });

        if (!response.ok) {
            if (isPdf) {
                throw new Error(
                    'Não foi possível converter o PDF para DOCX. Tente novamente.',
                );
            }

            return null;
        }

        const payload = await response.json();
        if (payload.kind === 'rich_document' && typeof payload.html === 'string') {
            return {
                kind: 'rich_document',
                html: payload.html,
                fieldsDetected: Array.isArray(payload.fieldsDetected)
                    ? payload.fieldsDetected
                    : [],
                isScanned: Boolean(payload.isScanned),
                isDocx: Boolean(payload.isDocx),
            };
        }

        if (
            payload.structure &&
            Array.isArray(payload.pageImages) &&
            payload.pageImages.length > 0
        ) {
            return {
                kind: 'pdf',
                source: 'file',
                structure: payload.structure,
                pageImages: payload.pageImages,
            };
        }
    } catch (e) {
        if (isPdf) {
            throw e;
        }

        console.warn('Processamento no servidor indisponível, usando fallback local.', e);
    }

    if (isPdf) {
        throw new Error(
            'Não foi possível converter o PDF para DOCX. Tente novamente.',
        );
    }

    return null;
}

async function parseFile(file: File): Promise<LoadedDocument> {
    const serverResult = await parseFileViaServer(file);
    if (serverResult) {
        return serverResult;
    }

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
        const conversionToastId = `pdf-conversion-${Date.now()}`;
        const isPdf = file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf');

        const run = async () => {
            setLoading(true);

            if (isPdf) {
                toast.loading(
                    'Convertendo PDF para DOCX. Aguarde enquanto processamos o documento...',
                    { id: conversionToastId },
                );
            }

            try {
                const result = file
                    ? await parseFile(file)
                    : await parseRemotePdf(remotePdfUrl as string);

                if (!cancelled) {
                    setLoaded(result);

                    if (isPdf && result.kind === 'rich_document') {
                        toast.success('PDF convertido para DOCX com sucesso.', {
                            id: conversionToastId,
                        });
                    }
                }
            } catch (error) {
                console.error('Erro ao carregar documento:', error);

                if (!cancelled) {
                    if (isPdf) {
                        toast.error(
                            'Não foi possível converter o PDF para DOCX. Tente novamente.',
                            { id: conversionToastId },
                        );
                    }

                    setLoaded({
                        kind: 'error',
                        message:
                            'Não foi possível ler o documento. Confira se o arquivo é um PDF ou DOCX válido.',
                    });
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        run();

        return () => {
            cancelled = true;

            if (isPdf) {
                toast.dismiss(conversionToastId);
            }
        };
    }, [file, remotePdfUrl]);

    return { loading, loaded };
}
