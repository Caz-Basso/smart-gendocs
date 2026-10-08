import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import {
    A4_HEIGHT_MM,
    A4_WIDTH_MM,
    getPageDimensions,
    paginateDocument,
    waitForLayoutAssets,
} from "@/lib/document-pagination";
import type { DynamicField } from "@/types/document";
import { PreviewText } from "./preview-text";

interface DocumentPreviewProps {
    preview?: string[];
    fields: DynamicField[];
    data: Record<string, string>;
    extractedHtml?: string | null;
}

function parseConfigFromHtml(rawHtml: string) {
    const configMatch = rawHtml.match(/<!--\s*a4-config:\s*([^>]+)\s*-->/);
    if (!configMatch) {
        return {
            margins: { top: 30, left: 30, right: 20, bottom: 20 },
            fontFamily: "'Times New Roman', Times, serif",
            lineHeight: "1.5",
        };
    }

    const str = configMatch[1];
    const top = str.match(/top=(\d+)/)?.[1];
    const left = str.match(/left=(\d+)/)?.[1];
    const right = str.match(/right=(\d+)/)?.[1];
    const bottom = str.match(/bottom=(\d+)/)?.[1];
    const font =
        str.match(/font="([^"]+)"/)?.[1] || "'Times New Roman', Times, serif";
    const lineHeight = str.match(/lineHeight=([0-9.]+)/)?.[1] || "1.5";

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
    return rawHtml.replace(/<!--\s*a4-config:\s*[^>]*-->\s*/g, "");
}

function interpolateHtml(
    html: string,
    fields: DynamicField[],
    data: Record<string, string>,
): string {
    let result = cleanHtmlWithoutConfig(html);

    for (const field of fields) {
        const val = data[field.slug];
        const placeholderRegex = new RegExp(`\\{\\{${field.slug}\\}\\}`, "g");
        if (val !== undefined && val.trim() !== "") {
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
}: DocumentPreviewProps) {
    const [currentPage, setCurrentPage] = useState(0);
    const [layoutVersion, setLayoutVersion] = useState(0);

    useEffect(() => {
        setCurrentPage(0);
    }, [extractedHtml]);

    useEffect(() => {
        if (!extractedHtml) return;

        let cancelled = false;

        waitForLayoutAssets(extractedHtml).then(() => {
            if (!cancelled) {
                setLayoutVersion((version) => version + 1);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [extractedHtml]);

    const config = extractedHtml ? parseConfigFromHtml(extractedHtml) : null;

    const margins = config?.margins ?? {
        top: 30,
        left: 30,
        right: 20,
        bottom: 20,
    };

    const fontFamily = config?.fontFamily ?? "'Times New Roman', Times, serif";

    const lineHeight = config?.lineHeight ?? "1.5";

    const interpolatedHtml = extractedHtml
        ? interpolateHtml(extractedHtml, fields, data)
        : "";

    const pages = useMemo(() => {
        if (!interpolatedHtml) return [];

        return paginateDocument(interpolatedHtml, margins, {
            className: "document-content",
            style: {
                fontFamily,
                fontSize: "12pt",
                lineHeight,
                textAlign: "justify",
            },
        });
    }, [
        interpolatedHtml,
        margins.top,
        margins.bottom,
        margins.left,
        margins.right,
        fontFamily,
        lineHeight,
        layoutVersion,
    ]);

    if (extractedHtml) {
        const config = parseConfigFromHtml(extractedHtml);
        const { margins, fontFamily, lineHeight } = config;
        const dimensions = getPageDimensions(margins);

        return (
            <div className="flex w-full flex-col items-center">
                <div className="mb-4 flex w-full max-w-[850px] items-center justify-between rounded-lg  px-2 py-2">
                    <button
                        type="button"
                        onClick={() =>
                            setCurrentPage((page) => Math.max(0, page - 1))
                        }
                        disabled={currentPage === 0}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                    </button>

                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Página {currentPage + 1} de {pages.length}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            setCurrentPage((page) =>
                                Math.min(pages.length - 1, page + 1),
                            )
                        }
                        disabled={currentPage === pages.length - 1}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex flex-col items-center">
                    <div
                        className="relative shrink-0 border border-slate-300 bg-white text-gray-900 shadow-2xl transition-all select-text dark:border-slate-700"
                        style={{
                            width: `${A4_WIDTH_MM}mm`,
                            height: `${A4_HEIGHT_MM}mm`,
                            maxWidth: "100%",
                            boxSizing: "border-box",
                            paddingTop: `${margins.top}mm`,
                            paddingLeft: `${margins.left}mm`,
                            paddingRight: `${margins.right}mm`,
                            paddingBottom: `${margins.bottom}mm`,
                            fontFamily,
                            fontSize: "12pt",
                            lineHeight,
                            textAlign: "justify",
                            position: "relative",
                        }}
                    >
                        <div
                            dangerouslySetInnerHTML={{
                                __html: pages[currentPage],
                            }}
                            className="document-content w-full text-[12pt] text-gray-900 outline-none [&_.document-footer]:mt-6 [&_.document-footer]:border-t [&_.document-footer]:border-slate-300 [&_.document-footer]:pt-2 [&_.document-footer]:text-center [&_.document-footer]:text-[9pt] [&_.document-footer]:text-slate-500 [&_.document-header]:mb-5 [&_.document-header]:border-b [&_.document-header]:border-slate-300 [&_.document-header]:pb-2 [&_.document-header]:text-center [&_.document-header]:text-[10.5pt] [&_h1]:my-4 [&_h1]:text-center [&_h1]:text-[17pt] [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-[14pt] [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-[12pt] [&_h3]:font-bold [&_img]:my-3 [&_img]:inline-block [&_p]:my-1.5 [&_table]:my-3.5"
                        />

                        <div
                            className="pointer-events-none absolute bottom-2 right-4 text-[10px] text-slate-400"
                            aria-hidden="true"
                        >
                            Página {currentPage + 1} de {pages.length}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative mx-auto w-full max-w-[850px] overflow-hidden rounded-sm border border-border/80 bg-white shadow-xl">
            <div className="min-h-[841px] w-full px-[48px] py-[42px] text-gray-900">
                {preview?.length ? (
                    preview.map((paragraph, index) => {
                        if (paragraph === "") {
                            return <div key={index} className="h-4" />;
                        }

                        const isTitle = index === 0;
                        const isClause = paragraph
                            .trim()
                            .toUpperCase()
                            .startsWith("CLÁUSULA");

                        const className = isTitle
                            ? "mb-8 text-center text-base font-bold tracking-wide uppercase"
                            : isClause
                              ? "mt-5 mb-2 text-xs font-bold tracking-wide uppercase"
                              : "mb-3 text-justify font-serif text-[12pt] leading-[1.6] text-[#222]";

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
