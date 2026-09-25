import type { DragEvent, RefObject } from "react";

import {
    ChevronLeft,
    ChevronRight,
    Edit3,
    FileText,
    Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface DocumentPage {
    type: "pdf" | "html";
    content: string;
}

interface DocumentPreviewProps {
    loading: boolean;
    documentPages: DocumentPage[];
    currentPage: number;
    editorRef: RefObject<HTMLDivElement | null>;
    handleDragOver: (event: DragEvent<HTMLDivElement>) => void;
    handleDrop: (event: DragEvent<HTMLDivElement>) => void;
    previousPage: () => void;
    nextPage: () => void;
}

export default function DocumentPreview({
    loading,
    documentPages,
    currentPage,
    editorRef,
    handleDragOver,
    handleDrop,
    previousPage,
    nextPage,
}: DocumentPreviewProps) {
    const currentDocument = documentPages[currentPage];

    return (
        <div className="flex min-w-0 flex-col items-center lg:col-span-8">
            <div className="mb-4 flex w-full max-w-[900px] items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pré-visualização
                </span>

                {documentPages.length > 0 && (
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
                            {currentPage + 1} / {documentPages.length}
                        </span>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={nextPage}
                            disabled={
                                currentPage >= documentPages.length - 1
                            }
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}

                {currentDocument?.type === "html" && (
                    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Edit3 className="h-3.5 w-3.5" />
                        Arraste a tag para o documento
                    </span>
                )}
            </div>

            <div className="w-full max-w-[850px] overflow-hidden rounded-sm border bg-white shadow-xl">
                {loading ? (
                    <div className="flex min-h-[841px] flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="h-7 w-7 animate-spin" />

                        <span className="text-sm">
                            Renderizando documento...
                        </span>
                    </div>
                ) : currentDocument?.type === "pdf" ? (
                    <img
                        src={currentDocument.content}
                        alt={`Página ${currentPage + 1}`}
                        className="block h-auto w-full select-none"
                        draggable={false}
                    />
                ) : currentDocument?.type === "html" ? (
                    <div className="min-h-[841px] px-[48px] py-[42px]">
                        <div
                            ref={editorRef}
                            contentEditable
                            suppressContentEditableWarning
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            dangerouslySetInnerHTML={{
                                __html: currentDocument.content,
                            }}
                            className="document-editor min-h-[750px] w-full font-sans text-[13px] leading-[1.7] text-[#333] outline-none"
                        />
                    </div>
                ) : (
                    <div className="flex min-h-[841px] flex-col items-center justify-center text-center text-muted-foreground">
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