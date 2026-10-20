import type { DragEvent, RefObject } from "react";

import {
    ChevronLeft,
    ChevronRight,
    Edit3,
    FileText,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface DocumentPreviewProps {
    loading: boolean;
    isPdf: boolean;
    pageImages: string[];
    currentPage: number;
    templateFile: File | null;
    documentHtml: string;
    editorRef: RefObject<HTMLDivElement | null>;
    handleDragOver: (event: DragEvent<HTMLDivElement>) => void;
    handleDrop: (event: DragEvent<HTMLDivElement>) => void;
    previousPage: () => void;
    nextPage: () => void;
}

export default function DocumentPreview({
    loading,
    isPdf,
    pageImages,
    currentPage,
    templateFile,
    documentHtml,
    editorRef,
    handleDragOver,
    handleDrop,
    previousPage,
    nextPage,
}: DocumentPreviewProps) {
    return (
        <div className="flex min-w-0 flex-col items-center lg:col-span-8">
            <div className="mb-4 flex w-full max-w-[900px] items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pré-visualização
                </span>

                {isPdf && pageImages.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={previousPage}
                            disabled={currentPage === 0}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="text-xs">
                            {currentPage + 1} / {pageImages.length}
                        </span>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={nextPage}
                            disabled={currentPage >= pageImages.length - 1}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {!isPdf && templateFile && (
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Edit3 className="h-3.5 w-3.5" />
                        Arraste a tag para o documento
                    </span>
                )}
            </div>

            <div className="aspect-[210/297] w-full max-w-[794px] shrink-0 overflow-hidden rounded-sm border bg-white shadow-xl">
                {loading ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="h-7 w-7 animate-spin" />

                        <span className="text-sm">
                            Renderizando documento...
                        </span>
                    </div>
                ) : isPdf && pageImages.length ? (
                    <img
                        src={pageImages[currentPage]}
                        alt={`Página ${currentPage + 1}`}
                        className="block h-auto w-full select-none"
                        draggable={false}
                    />
                ) : templateFile ? (
                    <div className="h-full w-full overflow-hidden px-[48px] py-[42px]">
                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            dangerouslySetInnerHTML={{
                                __html: documentHtml,
                            }}
                            className="document-editor min-h-full w-full outline-none"
                        />
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                        <FileText className="mb-3 h-12 w-12 opacity-50" />

                        <p className="text-sm font-medium">
                            Nenhum documento carregado
                        </p>

                        <p className="mt-1 max-w-xs text-xs">
                            Faça upload de um PDF ou DOCX para visualizar o
                            modelo.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
