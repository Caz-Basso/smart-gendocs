import { FileText } from 'lucide-react';
import type { DynamicField } from '@/types/document';
import { PreviewText } from './preview-text';

interface DocumentPreviewProps {
    preview?: string[];
    fields: DynamicField[];
    data: Record<string, string>;
}

export function DocumentPreview({ preview, fields, data }: DocumentPreviewProps) {
    return (
        <div className="relative mx-auto w-full max-w-[850px] overflow-hidden rounded-sm border border-border/80 bg-white shadow-xl">
            <div className="min-h-[841px] w-full px-[48px] py-[42px] text-gray-900">
                {preview?.length ? (
                    preview.map((paragraph, index) => {
                        if (paragraph === '') {
                            return <div key={index} className="h-4" />;
                        }

                        const isTitle = index === 0;
                        const isClause = paragraph
                            .trim()
                            .toUpperCase()
                            .startsWith('CLÁUSULA');

                        const className = isTitle
                            ? 'mb-8 text-center text-base font-bold tracking-wide uppercase'
                            : isClause
                              ? 'mt-5 mb-2 text-xs font-bold tracking-wide uppercase'
                              : 'mb-3 text-justify font-sans text-[13px] leading-[1.7] text-[#333]';

                        return (
                            <p key={index} className={className}>
                                <PreviewText
                                    text={paragraph}
                                    fields={fields}
                                    data={data}
                                />
                            </p>
                        );
                    })
                ) : (
                    <div className="flex min-h-[750px] items-center justify-center text-center">
                        <div className="max-w-sm">
                            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />

                            <p className="text-sm font-medium text-muted-foreground">
                                Nenhum documento disponível
                            </p>

                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70">
                                Selecione um modelo para visualizar o conteúdo
                                do documento.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
