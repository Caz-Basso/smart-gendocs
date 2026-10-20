import { useState } from 'react';
import { toast } from 'sonner';
import type { DocumentModel } from '@/types/document';

interface GenerateArgs {
    model: DocumentModel;
    data: Record<string, string>;
    /** Modelos mock enviam o texto do preview junto */
    includePreview?: boolean;
}

const FALLBACK_ERROR = 'Não foi possível gerar o documento.';

async function readError(response: Response): Promise<string> {
    const contentType = response.headers.get('content-type') ?? '';

    if (!contentType.includes('application/json')) return FALLBACK_ERROR;

    const payload = await response.json();
    const firstError = Object.values(payload.errors ?? {})
        .flat()
        .find((message) => typeof message === 'string');

    return typeof firstError === 'string' ? firstError : FALLBACK_ERROR;
}

function downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
}

export function useGenerateDocument() {
    const [isGenerating, setIsGenerating] = useState(false);

    const generate = async ({ model, data, includePreview }: GenerateArgs) => {
        if (isGenerating) return;

        const formData = new FormData();

        formData.append('model_id', model.id);
        formData.append('document_name', model.name);
        formData.append('field_definitions', JSON.stringify(model.fields));

        if (includePreview && model.preview) {
            model.preview.forEach((paragraph, index) => {
                formData.append(`preview[${index}]`, paragraph);
            });
        }

        Object.entries(data).forEach(([key, value]) => {
            formData.append(`data[${key}]`, value);
        });

        setIsGenerating(true);

        try {
            const response = await fetch('/modelos/gerar', {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') || '',
                    Accept: 'application/json',
                },
                body: formData,
            });

            if (!response.ok) throw new Error(await readError(response));

            const contentType = response.headers.get('content-type') ?? '';

            if (!contentType.includes('application/pdf')) {
                throw new Error('O servidor não retornou um arquivo PDF válido.');
            }

            downloadBlob(
                await response.blob(),
                `${model.name.replace(/\s+/g, '_').toLowerCase()}.pdf`,
            );

            toast.success('Documento salvo em Meus documentos e baixado.');
        } catch (error) {
            console.error('Erro:', error);

            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Erro ao gerar documento. Tente novamente.',
            );
        } finally {
            setIsGenerating(false);
        }
    };

    return { generate, isGenerating };
}
