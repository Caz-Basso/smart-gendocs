import { ChevronLeft, ChevronRight, FileText, Layers, List } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatValue } from '@/lib/document-fields';
import type { PdfDocumentStructure } from '@/lib/pdf-document';
import type { DynamicField } from '@/types/document';
import { PreviewText } from './preview-text';

interface DocumentPreviewProps {
    preview?: string[];
    htmlContent?: string | null;
    documentStructure?: PdfDocumentStructure | null;
    templateUrl?: string | null;
    fields: DynamicField[];
    data: Record<string, string>;
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function interpolateHtml(
    rawHtml: string,
    fields: DynamicField[],
    data: Record<string, string>,
): string {
    return rawHtml.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (_, slug: string) => {
        const field = fields.find((item) => item.slug === slug);
        const rawValue = data[slug];
        const formatted = formatValue(field, rawValue);

        if (formatted !== undefined && formatted !== null && String(formatted).trim() !== '') {
            return `<mark style="background-color: #ecfdf5; color: #065f46; font-weight: 600; padding: 1px 4px; border-radius: 3px; border-bottom: 2px solid #059669; text-decoration: none;">${escapeHtml(String(formatted))}</mark>`;
        }

        const label = field?.name ?? slug;
        return `<span style="background-color: #fef3c7; color: #92400e; font-weight: 600; padding: 2px 6px; border-radius: 4px; border: 1px dashed #d97706; font-size: 0.85em; display: inline-block;">[${escapeHtml(label)}]</span>`;
    });
}

function extractPagesFromHtml(rawHtml: string): string[] {
    if (typeof window === 'undefined' || !rawHtml) {
        return [rawHtml];
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawHtml, 'text/html');

        const pageNodes = doc.querySelectorAll('.pf, .pdf-page');
        if (pageNodes.length > 0) {
            return Array.from(pageNodes).map((node) => node.outerHTML);
        }

        const pageBreaks = doc.querySelectorAll('.page-break, [style*="page-break-after"]');
        if (pageBreaks.length > 0) {
            const parts = rawHtml.split(
                /<div[^>]*class=["'][^"']*page-break[^"']*["'][^>]*>|<div[^>]*style=["'][^"']*page-break-after:\s*always[^"']*["'][^>]*>/i,
            );
            const filtered = parts.filter((part) => part.trim().length > 0);
            if (filtered.length > 0) {
                return filtered;
            }
        }
    } catch {
        // Fallback to entire HTML
    }

    return [rawHtml];
}

export function DocumentPreview({
    preview,
    htmlContent,
    documentStructure,
    fields,
    data,
}: DocumentPreviewProps) {
    const [currentPage, setCurrentPage] = useState(0);
    const [viewMode, setViewMode] = useState<'paginated' | 'continuous'>('paginated');

    const htmlPages = useMemo(() => {
        if (!htmlContent) return [];
        return extractPagesFromHtml(htmlContent);
    }, [htmlContent]);

    const totalPages = htmlPages.length > 0
        ? htmlPages.length
        : documentStructure?.pages?.length ?? 1;

    const safeCurrentPage = Math.min(currentPage, Math.max(0, totalPages - 1));

    const previewA4Styles = `
        .doc-preview-a4 {
            font-family: 'Aptos', 'Calibri', 'Arial', sans-serif;
            color: #1f2937;
            line-height: 1.6;
        }
        .doc-preview-a4 .pdf-page {
            box-sizing: border-box;
            width: 100%;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            min-height: 842px;
            padding: 0 !important;
        }
        .doc-preview-a4 .pdf-header {
            margin-bottom: 20px;
            width: 100%;
            flex-shrink: 0;
        }
        .doc-preview-a4 .pdf-body {
            flex: 1 0 auto;
            width: 100%;
        }
        .doc-preview-a4 .pdf-footer {
            margin-top: auto;
            padding-top: 14px;
            width: 100%;
            flex-shrink: 0;
        }
        .doc-preview-a4 p {
            margin-bottom: 12px;
            text-align: justify;
        }
        .doc-preview-a4 table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
        }
        .doc-preview-a4 th, .doc-preview-a4 td {
            border: 1px solid #cbd5e1;
            padding: 6px 10px;
            font-size: 12px;
        }
        .doc-preview-a4 th {
            background-color: #f8fafc;
            font-weight: 600;
        }
        .doc-preview-a4 img {
            max-width: 100%;
            height: auto;
            object-fit: contain;
        }
    `;

    // Render 1: Structured HTML content (Fluid DOCX / Paged HTML / Converted PDF)
    if (htmlPages.length > 0) {
        return (
            <div className="w-full space-y-4">
                <style dangerouslySetInnerHTML={{ __html: previewA4Styles }} />

                {htmlPages.length > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-card p-2.5 text-xs text-muted-foreground shadow-xs">
                        <div className="flex items-center gap-1.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                disabled={safeCurrentPage === 0 || viewMode === 'continuous'}
                                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                Anterior
                            </Button>

                            <span className="px-2 font-medium text-foreground">
                                Página {safeCurrentPage + 1} de {totalPages}
                            </span>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                disabled={safeCurrentPage >= totalPages - 1 || viewMode === 'continuous'}
                                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                            >
                                Próxima
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant={viewMode === 'paginated' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() => setViewMode('paginated')}
                            >
                                <Layers className="h-3.5 w-3.5" />
                                Por página
                            </Button>

                            <Button
                                type="button"
                                variant={viewMode === 'continuous' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                onClick={() => setViewMode('continuous')}
                            >
                                <List className="h-3.5 w-3.5" />
                                Todas as páginas
                            </Button>
                        </div>
                    </div>
                )}

                {viewMode === 'continuous' && htmlPages.length > 1 ? (
                    <div className="space-y-6">
                        {htmlPages.map((pageHtml, index) => (
                            <div
                                key={index}
                                className="relative mx-auto w-full max-w-[850px] overflow-hidden rounded-sm border border-border/80 bg-white shadow-lg"
                            >
                                <div className="border-b border-border/40 bg-muted/40 px-6 py-2 text-right text-[11px] font-medium text-muted-foreground">
                                    Página {index + 1} de {totalPages}
                                </div>
                                <div
                                    className="doc-preview-a4 min-h-[841px] w-full px-[48px] py-[42px] text-gray-900"
                                    dangerouslySetInnerHTML={{
                                        __html: interpolateHtml(pageHtml, fields, data),
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="relative mx-auto w-full max-w-[850px] overflow-hidden rounded-sm border border-border/80 bg-white shadow-xl">
                        {htmlPages.length > 1 && (
                            <div className="border-b border-border/40 bg-muted/40 px-6 py-2 text-right text-[11px] font-medium text-muted-foreground">
                                Página {safeCurrentPage + 1} de {totalPages}
                            </div>
                        )}
                        <div
                            className="doc-preview-a4 min-h-[841px] w-full px-[48px] py-[42px] text-gray-900"
                            dangerouslySetInnerHTML={{
                                __html: interpolateHtml(htmlPages[safeCurrentPage] ?? '', fields, data),
                            }}
                        />
                    </div>
                )}
            </div>
        );
    }

    // Render 2: Document Structure (PDF pages with text elements)
    if (documentStructure?.pages && documentStructure.pages.length > 0) {
        const pages = documentStructure.pages;
        const page = pages[safeCurrentPage] ?? pages[0];

        return (
            <div className="w-full space-y-4">
                {pages.length > 1 && (
                    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-card p-2.5 text-xs text-muted-foreground shadow-xs">
                        <div className="flex items-center gap-1.5">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                disabled={safeCurrentPage === 0}
                                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                                Anterior
                            </Button>

                            <span className="px-2 font-medium text-foreground">
                                Página {safeCurrentPage + 1} de {pages.length}
                            </span>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs"
                                disabled={safeCurrentPage >= pages.length - 1}
                                onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                            >
                                Próxima
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}

                <div className="relative mx-auto w-full max-w-[850px] overflow-hidden rounded-sm border border-border/80 bg-white shadow-xl">
                    <div className="min-h-[841px] w-full px-[48px] py-[42px] text-gray-900">
                        {page?.elements && page.elements.length > 0 ? (
                            page.elements.map((element, index) => (
                                <p key={index} className="mb-3 text-justify font-sans text-[13px] leading-[1.7] text-[#333]">
                                    <PreviewText
                                        text={element.text}
                                        fields={fields}
                                        data={data}
                                    />
                                </p>
                            ))
                        ) : (
                            <p className="text-xs text-muted-foreground">Página vazia.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Render 3: Plain preview paragraph array
    if (preview?.length) {
        return (
            <div className="relative mx-auto w-full max-w-[850px] overflow-hidden rounded-sm border border-border/80 bg-white shadow-xl">
                <div className="min-h-[841px] w-full px-[48px] py-[42px] text-gray-900">
                    {preview.map((paragraph, index) => {
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
                    })}
                </div>
            </div>
        );
    }

    // Render 4: Empty state
    return (
        <div className="relative mx-auto w-full max-w-[850px] overflow-hidden rounded-sm border border-border/80 bg-white shadow-xl">
            <div className="flex min-h-[750px] items-center justify-center text-center">
                <div className="max-w-sm">
                    <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-muted-foreground">
                        Nenhum documento disponível
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70">
                        Selecione um modelo para visualizar o conteúdo do documento.
                    </p>
                </div>
            </div>
        </div>
    );
}
