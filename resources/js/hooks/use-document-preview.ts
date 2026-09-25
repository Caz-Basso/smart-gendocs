import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
} from "react";

import mammoth from "mammoth";

import * as pdfjsLib from "pdfjs-dist";

import type { TextItem } from "pdfjs-dist/types/src/display/api";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

export type DocumentPage =
    | {
          type: "pdf";
          content: string;
      }
    | {
          type: "html";
          content: string;
      };

interface UseDocumentPreviewOptions {
    initialDocumentHtml?: string;
}

function cleanHtml(html: string): string {
    return html
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .replace(/>\s+</g, "><")
        .trim();
}

function splitHtmlIntoPages(html: string): string[] {
    if (!html.trim()) {
        return [];
    }

    const parser = new DOMParser();
    const document = parser.parseFromString(html, "text/html");

    const elements = Array.from(document.body.children);

    if (elements.length === 0) {
        return [html];
    }

    const pages: string[] = [];
    let currentPage = "";

    const MAX_BLOCKS_PER_PAGE = 12;

    elements.forEach((element) => {
        const elementHtml = element.outerHTML;

        currentPage += elementHtml;

        if (
            currentPage &&
            currentPage.split("</").length - 1 >= MAX_BLOCKS_PER_PAGE
        ) {
            pages.push(currentPage);
            currentPage = "";
        }
    });

    if (currentPage) {
        pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [html];
}

export function useDocumentPreview({
    initialDocumentHtml = "",
}: UseDocumentPreviewOptions = {}) {
    const [templateFile, setTemplateFile] = useState<File | null>(null);

    const initialPages: DocumentPage[] = initialDocumentHtml
        ? splitHtmlIntoPages(initialDocumentHtml).map((page) => ({
              type: "html",
              content: page,
          }))
        : [];

    const [documentHtml, setDocumentHtml] =
        useState<string>(initialDocumentHtml);

    const [documentPages, setDocumentPages] =
        useState<DocumentPage[]>(initialPages);

    const [currentPage, setCurrentPage] = useState(0);

    const [loading, setLoading] = useState(false);

    const [isPdf, setIsPdf] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);

    const updateDocumentHtml = (html: string) => {
        setDocumentHtml(html);

        const pages = splitHtmlIntoPages(html);

        setDocumentPages(
            pages.map((page) => ({
                type: "html",
                content: page,
            })),
        );

        setCurrentPage(0);
    };

    const getCaretRange = (event: DragEvent<HTMLDivElement>): Range | null => {
        const { clientX, clientY } = event;

        if (typeof document.caretPositionFromPoint === "function") {
            const position = document.caretPositionFromPoint(clientX, clientY);

            if (!position || !position.offsetNode) {
                return null;
            }

            const range = document.createRange();

            range.setStart(position.offsetNode, position.offset);
            range.collapse(true);

            return range;
        }

        return null;
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        if (isPdf) {
            return;
        }

        const editor = editorRef.current;
        const text = event.dataTransfer.getData("text/plain");

        if (!editor || !text) {
            return;
        }

        const range = getCaretRange(event);

        if (!range || !editor.contains(range.commonAncestorContainer)) {
            return;
        }

        const node = document.createTextNode(text);

        range.deleteContents();
        range.insertNode(node);

        const cursor = document.createRange();

        cursor.setStartAfter(node);
        cursor.collapse(true);

        const selection = window.getSelection();

        selection?.removeAllRanges();
        selection?.addRange(cursor);

        updateDocumentHtml(editor.innerHTML);
    };

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        setTemplateFile(file);
    };

    const clearTemplate = () => {
        setTemplateFile(null);
        setDocumentHtml(initialDocumentHtml);
        setCurrentPage(0);
        setIsPdf(false);

        if (initialDocumentHtml) {
            const pages = splitHtmlIntoPages(initialDocumentHtml);

            setDocumentPages(
                pages.map((page) => ({
                    type: "html",
                    content: page,
                })),
            );
        } else {
            setDocumentPages([]);
        }

        if (editorRef.current) {
            editorRef.current.innerHTML = initialDocumentHtml;
        }
    };

    useEffect(() => {
        if (!templateFile) {
            setLoading(false);
            return;
        }

        let cancelled = false;

        const loadDocument = async () => {
            setLoading(true);

            setDocumentPages([]);
            setCurrentPage(0);

            try {
                const buffer = await templateFile.arrayBuffer();

                const fileName = templateFile.name.toLowerCase();

                const isDocx = fileName.endsWith(".docx");

                const pdf =
                    fileName.endsWith(".pdf") ||
                    templateFile.type === "application/pdf";

                if (isDocx) {
                    const result = await mammoth.convertToHtml({
                        arrayBuffer: buffer,
                    });

                    if (cancelled) {
                        return;
                    }

                    const html = cleanHtml(
                        result.value || "<p>Documento vazio.</p>",
                    );

                    const pages = splitHtmlIntoPages(html);

                    setDocumentHtml(html);

                    setDocumentPages(
                        pages.map((page) => ({
                            type: "html",
                            content: page,
                        })),
                    );

                    setIsPdf(false);
                    setCurrentPage(0);

                    return;
                }

                if (pdf) {
                    const pdfDocument = await pdfjsLib.getDocument({
                        data: buffer,
                    }).promise;

                    const pages: DocumentPage[] = [];

                    for (
                        let pageNumber = 1;
                        pageNumber <= pdfDocument.numPages;
                        pageNumber++
                    ) {
                        if (cancelled) {
                            return;
                        }

                        const page = await pdfDocument.getPage(pageNumber);

                        const viewport = page.getViewport({
                            scale: 1.5,
                        });

                        const canvas = window.document.createElement("canvas");

                        canvas.width = Math.ceil(viewport.width);
                        canvas.height = Math.ceil(viewport.height);

                        await page.render({
                            canvas,
                            viewport,
                        }).promise;

                        pages.push({
                            type: "pdf",
                            content: canvas.toDataURL("image/png"),
                        });
                    }

                    if (cancelled) {
                        return;
                    }

                    setDocumentPages(pages);
                    setDocumentHtml("");
                    setIsPdf(true);
                    setCurrentPage(0);

                    return;
                }

                const errorHtml = `
                    <p class="text-red-500 font-medium">
                        Tipo de arquivo não suportado.
                    </p>
                `;

                setDocumentHtml(errorHtml);
                setDocumentPages([
                    {
                        type: "html",
                        content: errorHtml,
                    },
                ]);
                setIsPdf(false);
            } catch (error) {
                console.error("Erro ao carregar documento:", error);

                if (!cancelled) {
                    const errorHtml = `
                        <p class="text-red-500 font-medium">
                            Não foi possível carregar o documento.
                        </p>
                    `;

                    setDocumentHtml(errorHtml);

                    setDocumentPages([
                        {
                            type: "html",
                            content: errorHtml,
                        },
                    ]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadDocument();

        return () => {
            cancelled = true;
        };
    }, [templateFile]);

    const previousPage = () => {
        setCurrentPage((page) => Math.max(page - 1, 0));
    };

    const nextPage = () => {
        setCurrentPage((page) => Math.min(page + 1, documentPages.length - 1));
    };

    return {
        templateFile,
        documentHtml,
        documentPages,
        currentPage,
        loading,
        isPdf,
        editorRef,
        handleFileChange,
        clearTemplate,
        handleDragOver,
        handleDrop,
        previousPage,
        nextPage,
        setDocumentHtml: updateDocumentHtml,
    };
}
