import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
} from "react";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

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
    const parsedDocument = parser.parseFromString(html, "text/html");
    const elements = Array.from(parsedDocument.body.children);

    if (elements.length === 0) {
        return [html];
    }

    const MAX_BLOCKS_PER_PAGE = 12;
    const pages: string[] = [];

    for (let index = 0; index < elements.length; index += MAX_BLOCKS_PER_PAGE) {
        const page = elements
            .slice(index, index + MAX_BLOCKS_PER_PAGE)
            .map((element) => element.outerHTML)
            .join("");

        if (page) {
            pages.push(page);
        }
    }

    return pages.length > 0 ? pages : [html];
}

export function useDocumentPreview({
    initialDocumentHtml = "",
}: UseDocumentPreviewOptions = {}) {
    const initialPages: DocumentPage[] = initialDocumentHtml
        ? splitHtmlIntoPages(initialDocumentHtml).map((page) => ({
              type: "html",
              content: page,
          }))
        : [];

    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [documentHtml, setDocumentHtml] =
        useState<string>(initialDocumentHtml);
    const [documentPages, setDocumentPages] =
        useState<DocumentPage[]>(initialPages);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);

    const handleEditorInput = () => {
        const editor = editorRef.current;

        if (!editor) {
            return;
        }

        const html = editor.innerHTML;

        setDocumentPages((pages) =>
            pages.map((page, index) =>
                index === currentPage && page.type === "html"
                    ? {
                          ...page,
                          content: html,
                      }
                    : page,
            ),
        );
    };

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

    const getDocumentHtml = (): string => {
        return documentPages
            .filter((page) => page.type === "html")
            .map((page) => page.content)
            .join("");
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

        const editor = editorRef.current;
        const text = event.dataTransfer.getData("text/plain");

        if (!editor || !text) {
            return;
        }

        const currentDocumentPage = documentPages[currentPage];

        if (!currentDocumentPage || currentDocumentPage.type !== "html") {
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

        const updatedHtml = editor.innerHTML;

        setDocumentPages((pages) =>
            pages.map((page, index) =>
                index === currentPage && page.type === "html"
                    ? {
                          ...page,
                          content: updatedHtml,
                      }
                    : page,
            ),
        );

        setDocumentHtml((currentHtml) => {
            const pages = documentPages.map((page, index) =>
                index === currentPage && page.type === "html"
                    ? {
                          ...page,
                          content: updatedHtml,
                      }
                    : page,
            );

            return pages
                .filter((page) => page.type === "html")
                .map((page) => page.content)
                .join("");
        });
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
                const isPdf =
                    fileName.endsWith(".pdf") ||
                    templateFile.type === "application/pdf";

                if (isDocx) {
                    const result = await mammoth.convertToHtml({
                        arrayBuffer: buffer,
                    });

                    const html = cleanHtml(result.value);

                    const pages = splitHtmlIntoPages(html).map((page) => ({
                        type: "html" as const,
                        content: page,
                    }));

                    if (cancelled) {
                        return;
                    }

                    setDocumentHtml(html);
                    setDocumentPages(pages);
                    setCurrentPage(0);

                    return;
                }

                if (isPdf) {
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

    useEffect(() => {
        if (templateFile || !initialDocumentHtml) {
            return;
        }

        const pages = splitHtmlIntoPages(initialDocumentHtml).map((page) => ({
            type: "html" as const,
            content: page,
        }));

        setDocumentHtml(initialDocumentHtml);
        setDocumentPages(pages);
        setCurrentPage(0);
    }, [initialDocumentHtml, templateFile]);

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
        editorRef,
        handleFileChange,
        clearTemplate,
        handleDragOver,
        handleDrop,
        handleEditorInput,
        previousPage,
        nextPage,
        getDocumentHtml,
        setDocumentHtml: updateDocumentHtml,
    };
}
