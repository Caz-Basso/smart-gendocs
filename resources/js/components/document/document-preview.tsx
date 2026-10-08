import { FileText, Scissors } from 'lucide-react';
import {
    A4_HEIGHT_MM,
    A4_WIDTH_MM,
    getPageDimensions,
    splitHtmlIntoPages,
} from '@/lib/document-pagination';
import type { DynamicField } from '@/types/document';
import type { ModelElementAttachment } from '@/types/document-element';
import { PreviewText } from './preview-text';

interface DocumentPreviewProps {
    preview?: string[];
    fields: DynamicField[];
    data: Record<string, string>;
    extractedHtml?: string | null;
    elements?: ModelElementAttachment[];
}

function parseConfigFromHtml(rawHtml: string) {
    const configMatch = rawHtml.match(/<!--\s*a4-config:\s*([^>]+)\s*-->/);
    if (!configMatch) {
        return {
            margins: { top: 30, left: 30, right: 20, bottom: 20 },
            fontFamily: "'Times New Roman', Times, serif",
            lineHeight: '1.5',
        };
    }

    const str = configMatch[1];
    const top = str.match(/top=(\d+)/)?.[1];
    const left = str.match(/left=(\d+)/)?.[1];
    const right = str.match(/right=(\d+)/)?.[1];
    const bottom = str.match(/bottom=(\d+)/)?.[1];
    const font =
        str.match(/font="([^"]+)"/)?.[1] || "'Times New Roman', Times, serif";
    const lineHeight = str.match(/lineHeight=([0-9.]+)/)?.[1] || '1.5';

    return {
        margins: {
            top: top ? parseInt(top, 10) : 30,
            left: left ? parseInt(left, 10) : 30,
            right: right ? parseInt(right, 10) : 20,
            bottom: bottom ? parseInt(bottom, 10) : 20,
        },
        fontFamily: font,
        lineHeight,
    };
}

function cleanHtmlWithoutConfig(rawHtml: string): string {
    return rawHtml.replace(/<!--\s*a4-config:\s*[^>]*-->\s*/g, '');
}

function interpolateHtml(
    html: string,
    fields: DynamicField[],
    data: Record<string, string>,
): string {
    let result = cleanHtmlWithoutConfig(html);

    for (const field of fields) {
        const val = data[field.slug];
        const placeholderRegex = new RegExp(`\\{\\{${field.slug}\\}\\}`, 'g');
        if (val !== undefined && val.trim() !== '') {
            result = result.replace(
                placeholderRegex,
                `<span style="background-color: #ecfdf5; color: #064e3b; font-weight: 600; padding: 1px 4px; border-radius: 3px; border: 1px solid #a7f3d0;">${val}</span>`,
            );
        } else {
            result = result.replace(
                placeholderRegex,
                `<span style="background-color: #fef3c7; color: #78350f; font-weight: 500; padding: 1px 4px; border-radius: 3px; border: 1px solid #fde68a;">{{${field.name}}}</span>`,
            );
        }
    }

    return result;
}

export function DocumentPreview({
    preview,
    fields,
    data,
    extractedHtml,
    elements = [],
}: DocumentPreviewProps) {
    if (extractedHtml) {
        const config = parseConfigFromHtml(extractedHtml);
        const { margins, fontFamily, lineHeight } = config;
        const dimensions = getPageDimensions(margins);

        const rawPages = splitHtmlIntoPages(extractedHtml);
        const pages = rawPages.map((pHtml) =>
            interpolateHtml(pHtml, fields, data),
        );

        return (
            <div className="flex w-full flex-col items-center">
                {/* Régua de Informações da Folha A4 no Preview */}
                <div className="mb-3 flex w-full max-w-[980px] flex-wrap items-center justify-between rounded-lg border border-border/80 bg-background/95 px-3 py-1.5 text-[11px] text-muted-foreground shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                            Pré-visualização Oficial A4 (210 × 297 mm) • Total:{' '}
                            {pages.length}{' '}
                            {pages.length === 1 ? 'página' : 'páginas'}
                        </span>
                        <span>
                            Margens: Sup {(margins.top / 10).toFixed(1)}cm • Esq{' '}
                            {(margins.left / 10).toFixed(1)}cm • Dir{' '}
                            {(margins.right / 10).toFixed(1)}cm • Inf{' '}
                            {(margins.bottom / 10).toFixed(1)}cm
                        </span>
                    </div>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                        Área Útil: {(dimensions.usableWidthMm / 10).toFixed(1)}{' '}
                        × {(dimensions.usableHeightMm / 10).toFixed(1)} cm
                    </span>
                </div>

                {/* Mesa de Trabalho (Desk) com Múltiplas Folhas A4 Independentes */}
                <div className="flex w-full flex-col items-center gap-8 overflow-x-auto rounded-lg bg-slate-100 p-4 shadow-inner dark:bg-slate-900/60 sm:p-8">
                    {pages.map((pageHtml, index) => {
                        const pageNumber = index + 1;
                        const isLastPage = index === pages.length - 1;

                        return (
                            <div
                                key={index}
                                className="flex flex-col items-center"
                            >
                                {/* Folha A4 Real Independente */}
                                <div
                                    className="relative shrink-0 border border-slate-300 bg-white text-gray-900 shadow-2xl transition-all select-text dark:border-slate-700"
                                    style={{
                                        width: `${A4_WIDTH_MM}mm`,
                                        height: `${A4_HEIGHT_MM}mm`,
                                        maxWidth: '100%',
                                        boxSizing: 'border-box',
                                        paddingTop: `${margins.top}mm`,
                                        paddingLeft: `${margins.left}mm`,
                                        paddingRight: `${margins.right}mm`,
                                        paddingBottom: `${margins.bottom}mm`,
                                        fontFamily,
                                        fontSize: '12pt',
                                        lineHeight,
                                        textAlign: 'justify',
                                        position: 'relative',
                                        overflow: 'auto',
                                    }}
                                >
                                    {/* Elementos Visuais Fixos (Cabeçalhos / Rodapés) */}
                                    {elements.map((el, elIdx) => {
                                        const appliesToThisPage =
                                            el.repeat_all_pages ||
                                            (el.pages && el.pages.includes(pageNumber));
                                        if (!appliesToThisPage || !el.image_url) {
                                            return null;
                                        }

                                        return (
                                            <div
                                                key={el.id || el.element_id || elIdx}
                                                className="pointer-events-none absolute select-none"
                                                style={{
                                                    left: `${el.position_x ?? 0}mm`,
                                                    top: `${el.position_y ?? 0}mm`,
                                                    width: `${el.width ?? 210}mm`,
                                                    height: `${el.height ?? 35}mm`,
                                                    zIndex: el.z_index ?? 10,
                                                }}
                                                title={`${el.name || 'Elemento'} (${el.type})`}
                                            >
                                                <img
                                                    src={el.image_url}
                                                    alt={el.name || 'Elemento'}
                                                    className="h-full w-full object-contain"
                                                    draggable={false}
                                                />
                                            </div>
                                        );
                                    })}

                                    <div
                                        dangerouslySetInnerHTML={{
                                            __html: pageHtml,
                                        }}
                                        className="w-full text-[12pt] text-gray-900 outline-none [&_.document-footer]:mt-6 [&_.document-footer]:border-t [&_.document-footer]:border-slate-300 [&_.document-footer]:pt-2 [&_.document-footer]:text-center [&_.document-footer]:text-[9pt] [&_.document-footer]:text-slate-500 [&_.document-header]:mb-5 [&_.document-header]:border-b [&_.document-header]:border-slate-300 [&_.document-header]:pb-2 [&_.document-header]:text-center [&_.document-header]:text-[10.5pt] [&_h1]:my-4 [&_h1]:text-center [&_h1]:text-[17pt] [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-[14pt] [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-[12pt] [&_h3]:font-bold [&_img]:my-3 [&_img]:inline-block [&_p]:my-1.5 [&_table]:my-3.5"
                                    />

                                    {/* Indicador de página oficial */}
                                    <div
                                        className="pointer-events-none absolute bottom-2 right-4 text-[10px] text-slate-400"
                                        aria-hidden="true"
                                    >
                                        Página {pageNumber} de {pages.length}
                                    </div>
                                </div>

                                {!isLastPage && (
                                    <div className="my-6 flex w-[210mm] max-w-full items-center justify-center gap-3">
                                        <div className="h-px flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-700" />
                                        <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            <Scissors className="h-3 w-3 text-sky-600" />
                                            <span>
                                                QUEBRA DE PÁGINA • Página{' '}
                                                {pageNumber} para{' '}
                                                {pageNumber + 1}
                                            </span>
                                        </div>
                                        <div className="h-px flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-700" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

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
                              : 'mb-3 text-justify font-serif text-[12pt] leading-[1.6] text-[#222]';

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
