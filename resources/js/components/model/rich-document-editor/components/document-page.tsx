import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "@/lib/document-pagination";
import type { DocumentPageProps } from "../types";

export function DocumentPage({
    pages,
    activePageIndex,
    showVisualGuide,
    overflowPages,
    margins,
    dimensions,
    pageRefs,
    isComposingRef,
    suppressBlurSyncRef,
    pagesRef,
    fontFamily,
    fontSize,
    lineHeight,
    setActivePageIndex,
    insertNewBlankPage,
    removePage,
    insertPageBreakAtCursor,
    updateActiveStates,
    handlePageInput,
    setPages,
    onDragOver,
    onDrop,
    elements = [],
}: DocumentPageProps) {
    return (
        <div className="relative flex w-full flex-col items-center gap-8 pb-4">
            {pages.map((pageHtml, index) => {
                const pageNumber = index + 1;
                const isActive = index === activePageIndex;

                return (
                    <div
                        key={index}
                        className="flex max-w-full flex-col items-center transition-all"
                        style={
                            isActive
                                ? undefined
                                : {
                                      position: "absolute",
                                      top: 0,
                                      left: 0,
                                      visibility: "hidden",
                                      pointerEvents: "none",
                                  }
                        }
                        onClick={() => setActivePageIndex(index)}
                    >
                        <div className="mb-2 flex w-[210mm] max-w-full items-center justify-between px-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-foreground">
                                    Página {pageNumber} de {pages.length}
                                </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-[11px]"
                                    title="Inserir página abaixo"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        insertNewBlankPage(index);
                                    }}
                                >
                                    <Plus className="mr-1 h-3 w-3" />
                                    Inserir Página
                                </Button>

                                {pages.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-1.5 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        title="Excluir esta página"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removePage(index);
                                        }}
                                    >
                                        <Trash2 className="mr-1 h-3 w-3" />
                                        Excluir
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div
                            className={`relative shrink-0 border bg-white text-gray-900 shadow-xl transition-all select-text ${
                                overflowPages[index]
                                    ? "border-red-500 ring-2 ring-red-400/70"
                                    : "border-slate-300 dark:border-slate-700"
                            }`}
                            style={{
                                width: `${A4_WIDTH_MM}mm`,
                                height: `${A4_HEIGHT_MM}mm`,
                                maxWidth: "100%",
                                boxSizing: "border-box",
                                position: "relative",
                            }}
                        >
                            {showVisualGuide && (
                                <div
                                    className="pointer-events-none absolute z-10 border border-dashed border-sky-400/40"
                                    style={{
                                        top: `${margins.top}mm`,
                                        left: `${margins.left}mm`,
                                        right: `${margins.right}mm`,
                                        bottom: `${margins.bottom}mm`,
                                    }}
                                    title={`Área Útil: ${(dimensions.usableWidthMm / 10).toFixed(1)} × ${(dimensions.usableHeightMm / 10).toFixed(1)} cm`}
                                />
                            )}

                            {/* Elementos Visuais Fixos (Cabeçalhos / Rodapés) */}
                            {elements.map((el, elIdx) => {
                                const appliesToThisPage =
                                    el.repeat_all_pages ||
                                    (el.pages && el.pages.includes(pageNumber));
                                const imageUrl = el.image_url || el.element?.image_url;
                                if (!appliesToThisPage || !imageUrl) {
                                    return null;
                                }

                                return (
                                    <div
                                        key={el._instanceKey || el.id || el.element_id || elIdx}
                                        className="pointer-events-none absolute select-none"
                                        style={{
                                            left: `${el.position_x ?? 0}mm`,
                                            top: `${el.position_y ?? 0}mm`,
                                            width: `${el.width ?? 210}mm`,
                                            height: `${el.height ?? 35}mm`,
                                            zIndex: el.z_index ?? 10,
                                        }}
                                        title={`${el.name || "Elemento"} (${el.type})`}
                                    >
                                        <img
                                            src={imageUrl}
                                            alt={el.name || "Elemento"}
                                            className="h-full w-full object-contain"
                                            draggable={false}
                                        />
                                    </div>
                                );
                            })}

                            <div
                                ref={(el) => {
                                    pageRefs.current[index] = el;
                                }}
                                contentEditable
                                suppressContentEditableWarning
                                dangerouslySetInnerHTML={{
                                    __html: pageHtml,
                                }}
                                onFocus={() => {
                                    setActivePageIndex(index);
                                    updateActiveStates();
                                }}
                                onInput={(e) =>
                                    handlePageInput(
                                        index,
                                        e.currentTarget.innerHTML,
                                    )
                                }
                                onKeyDown={(e) => {
                                    if (
                                        e.key === "Enter" &&
                                        (e.ctrlKey || e.metaKey)
                                    ) {
                                        e.preventDefault();
                                        insertPageBreakAtCursor();
                                    }
                                }}
                                onKeyUp={updateActiveStates}
                                onMouseUp={updateActiveStates}
                                onCompositionStart={() => {
                                    isComposingRef.current = true;
                                }}
                                onCompositionEnd={() => {
                                    isComposingRef.current = false;
                                    const node = pageRefs.current[index];
                                    if (node) {
                                        handlePageInput(index, node.innerHTML);
                                    }
                                }}
                                onBlur={() => {
                                    if (suppressBlurSyncRef.current) return;
                                    setPages([...pagesRef.current]);
                                }}
                                onDragOver={onDragOver}
                                onDrop={onDrop}
                                style={{
                                    paddingTop: `${margins.top}mm`,
                                    paddingLeft: `${margins.left}mm`,
                                    paddingRight: `${margins.right}mm`,
                                    paddingBottom: `${margins.bottom}mm`,
                                    fontFamily,
                                    fontSize,
                                    lineHeight,
                                    textAlign: "justify",
                                    overflowWrap: "anywhere",
                                    wordBreak: "break-word",
                                    width: "100%",
                                    height: `${A4_HEIGHT_MM}mm`,
                                    maxHeight: `${A4_HEIGHT_MM}mm`,
                                    boxSizing: "border-box",
                                }}
                                className="a4-page-content text-gray-900 outline-none select-text focus:outline-none [&_.document-footer]:mt-6 [&_.document-footer]:border-t [&_.document-footer]:border-slate-300 [&_.document-footer]:pt-2 [&_.document-footer]:text-center [&_.document-footer]:text-[9pt] [&_.document-footer]:text-slate-500 [&_.document-header]:mb-5 [&_.document-header]:border-b [&_.document-header]:border-slate-300 [&_.document-header]:pb-2 [&_.document-header]:text-center [&_.document-header]:text-[10.5pt] [&_h1]:my-4 [&_h1]:text-center [&_h1]:text-[17pt] [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-[14pt] [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-[12pt] [&_h3]:font-bold [&_img]:my-3 [&_img]:inline-block [&_p]:my-1.5 [&_table]:my-3.5 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-solid [&_table]:border-slate-400 [&_th]:border [&_th]:border-solid [&_th]:border-slate-400 [&_td]:border [&_td]:border-solid [&_td]:border-slate-300"
                            />

                            {overflowPages[index] && (
                                <div
                                    className="pointer-events-none absolute left-4 top-2 z-20 rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow"
                                    aria-hidden="true"
                                >
                                    Conteúdo excede a área útil
                                </div>
                            )}

                            <div
                                className="pointer-events-none absolute bottom-2 right-4 text-[10px] text-slate-400"
                                aria-hidden="true"
                            >
                                Página {pageNumber} de {pages.length}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
