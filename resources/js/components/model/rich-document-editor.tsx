import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Indent,
    Italic,
    MoreHorizontal,
    Plus,
    Quote,
    Redo,
    Scissors,
    Strikethrough,
    Table as TableIcon,
    Trash2,
    Underline,
    Undo,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type DragEvent,
    type ReactNode,
    type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { Button } from "@/components/ui/button";
import {
    A4_HEIGHT_MM,
    A4_WIDTH_MM,
    getPageDimensions,
    joinPagesIntoHtml,
    paginateDocument,
} from "@/lib/document-pagination";

export interface DocumentMargins {
    top: number; // em mm
    left: number; // em mm
    right: number; // em mm
    bottom: number; // em mm
}

export const MARGIN_PRESETS: Record<
    string,
    { label: string; margins: DocumentMargins }
> = {
    abnt: {
        label: "ABNT Oficial (Sup 3cm, Esq 3cm, Dir 2cm, Inf 2cm)",
        margins: { top: 30, left: 30, right: 20, bottom: 20 },
    },
    normal: {
        label: "Padrão Simétrico (2,5 cm)",
        margins: { top: 25, left: 25, right: 25, bottom: 25 },
    },
    narrow: {
        label: "Margens Estreitas (1,5 cm)",
        margins: { top: 15, left: 15, right: 15, bottom: 15 },
    },
};

interface RichDocumentEditorProps {
    editorRef: RefObject<HTMLDivElement | null>;
    html: string;
    onChange: (html: string) => void;
    onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
    onDrop?: (event: DragEvent<HTMLDivElement>) => void;
}

const TOOLBAR_SELECT_CLASS =
    "h-8 min-w-0 rounded-md border border-input bg-transparent px-2 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:bg-background focus:ring-1 focus:ring-ring focus:outline-none cursor-pointer";

// Divisor vertical sutil
function ToolbarSeparator() {
    return (
        <div
            className="mx-1 h-5 w-[1px] shrink-0 bg-border/80"
            aria-hidden="true"
        />
    );
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

function getPaginationOptions(fontFamily: string, lineHeight: string) {
    return {
        className:
            "a4-page-content text-[12pt] text-gray-900 " +
            "[&_h1]:my-4 [&_h1]:text-center [&_h1]:text-[17pt] [&_h1]:font-bold " +
            "[&_h2]:my-3 [&_h2]:text-[14pt] [&_h2]:font-bold " +
            "[&_h3]:my-2 [&_h3]:text-[12pt] [&_h3]:font-bold " +
            "[&_p]:my-1.5 [&_table]:my-3.5",
        style: {
            "font-family": fontFamily,
            "font-size": "12pt",
            "line-height": lineHeight,
            "text-align": "justify",
            "overflow-wrap": "anywhere",
            "word-break": "break-word",
        },
    };
}

interface PageMetrics {
    usableHeight: number;
    contentHeight: number;
    overflowPx: number;
}

function measurePage(el: HTMLElement): PageMetrics {
    const cs = window.getComputedStyle(el);
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    const usableHeight = el.clientHeight - padTop - padBottom;

    const range = document.createRange();
    range.selectNodeContents(el);
    const contentRect = range.getBoundingClientRect();

    if (contentRect.height === 0) {
        return { usableHeight, contentHeight: 0, overflowPx: -usableHeight };
    }

    const boxRect = el.getBoundingClientRect();
    const contentBottom = contentRect.bottom + el.scrollTop;
    const contentTop = boxRect.top + padTop;
    const contentHeight = Math.max(0, contentBottom - contentTop);

    return {
        usableHeight,
        contentHeight,
        overflowPx: contentHeight - usableHeight,
    };
}

function hasPageOverflow(element: HTMLElement): boolean {
    return measurePage(element).overflowPx > 1;
}

interface CaretPos {
    node: Node;
    offset: number;
}

const SPLITTABLE_TAGS = new Set(["P", "DIV", "H1", "H2", "H3"]);

const BLANK_PAGE_HTML =
    '<p style="text-align: justify; line-height: 1.5; font-size: 12pt;"><br/></p>';

function isBlankPage(el: HTMLElement): boolean {
    return (
        (el.textContent || "").trim() === "" &&
        !el.querySelector("img,table,hr,header,footer")
    );
}

function getTextNodes(root: Node): Text[] {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const out: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) out.push(n as Text);
    return out;
}

function resolveTextPosition(root: Node, charOffset: number): CaretPos {
    let remaining = charOffset;
    const nodes = getTextNodes(root);
    for (const t of nodes) {
        const len = t.data.length;
        if (remaining <= len) return { node: t, offset: remaining };
        remaining -= len;
    }
    const last = nodes[nodes.length - 1];
    if (last) return { node: last, offset: last.data.length };
    return { node: root, offset: root.childNodes.length };
}

function charOffsetOf(root: Node, node: Node, offset: number): number {
    const r = document.createRange();
    r.setStart(root, 0);
    r.setEnd(node, offset);
    return r.toString().length;
}

function getUsableBottom(el: HTMLElement): number {
    const cs = window.getComputedStyle(el);
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    return el.getBoundingClientRect().top + el.clientHeight - padBottom;
}

function splitBlockAtLimit(
    block: HTMLElement,
    limitY: number,
    caret: CaretPos | null,
): HTMLElement | null {
    const fullText = getTextNodes(block)
        .map((t) => t.data)
        .join("");
    const total = fullText.length;
    if (total === 0) return null;

    const cs = window.getComputedStyle(block);
    const fs = parseFloat(cs.fontSize) || 16;
    const lhParsed = parseFloat(cs.lineHeight);
    const lh = Number.isNaN(lhParsed) ? fs * 1.2 : lhParsed;

    const fits = (k: number): boolean => {
        const r = document.createRange();
        r.setStart(block, 0);
        const p = resolveTextPosition(block, k);
        r.setEnd(p.node, p.offset);
        const rects = r.getClientRects();
        if (!rects.length) return true;
        const lastRect = rects[rects.length - 1];
        const extra = Math.max(0, (lh - lastRect.height) / 2);
        return lastRect.bottom + extra <= limitY + 0.5;
    };

    let lo = 0;
    let hi = total;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits(mid)) lo = mid;
        else hi = mid - 1;
    }
    let k = lo;

    if (k >= total) {
        k = total;
        while (k > 0 && /\s/.test(fullText[k - 1])) k--;
        while (k > 0 && !/\s/.test(fullText[k - 1])) k--;
        if (k <= 0 && total > 1) k = total - 1;
    } else {
        let kk = k;
        while (kk > 0 && !/\s/.test(fullText[kk - 1])) kk--;
        if (kk > 0) k = kk;
    }
    if (k <= 0) return null;

    const caretOffset =
        caret && block.contains(caret.node)
            ? charOffsetOf(block, caret.node, caret.offset)
            : -1;

    const range = document.createRange();
    const pos = resolveTextPosition(block, k);
    range.setStart(pos.node, pos.offset);
    range.setEnd(block, block.childNodes.length);
    const frag = range.extractContents();

    const tail = block.cloneNode(false) as HTMLElement;
    tail.appendChild(frag);
    tail.style.textIndent = "0cm";

    if (caret && caretOffset >= 0) {
        const np =
            caretOffset > k
                ? resolveTextPosition(tail, caretOffset - k)
                : resolveTextPosition(block, caretOffset);
        caret.node = np.node;
        caret.offset = np.offset;
    }

    return tail;
}

function moveOverflowToNext(
    el: HTMLElement,
    nextEl: HTMLElement,
    caret: CaretPos | null,
): boolean {
    let movedAny = false;
    let splitTail: HTMLElement | null = null;
    let guard = 0;

    while (guard++ < 2000) {
        el.scrollTop = 0;
        if (!hasPageOverflow(el)) break;

        while (
            el.lastChild &&
            el.lastChild.nodeType === Node.TEXT_NODE &&
            (el.lastChild.textContent || "").trim() === ""
        ) {
            el.removeChild(el.lastChild);
        }
        const last = el.lastChild;
        if (!last) break;

        const significant = Array.from(el.childNodes).filter(
            (n) =>
                n.nodeType === Node.ELEMENT_NODE ||
                (n.textContent || "").trim() !== "",
        ).length;
        const limitY = getUsableBottom(el);

        if (
            last instanceof HTMLElement &&
            SPLITTABLE_TAGS.has(last.tagName) &&
            last.getBoundingClientRect().top < limitY - 1
        ) {
            const tail = splitBlockAtLimit(last, limitY, caret);
            if (tail) {
                if (splitTail && nextEl.firstChild === splitTail) {
                    while (tail.lastChild) {
                        splitTail.insertBefore(
                            tail.lastChild,
                            splitTail.firstChild,
                        );
                    }
                } else {
                    nextEl.insertBefore(tail, nextEl.firstChild);
                    splitTail = tail;
                }
                movedAny = true;
                continue;
            }
        }

        const lastRect =
            last instanceof HTMLElement ? last.getBoundingClientRect() : null;

        if (lastRect && lastRect.top >= limitY - 1) {
            nextEl.insertBefore(last, nextEl.firstChild);
            movedAny = true;
            continue;
        }

        if (significant > 1) {
            nextEl.insertBefore(last, nextEl.firstChild);
            movedAny = true;
            continue;
        }

        break;
    }

    return movedAny;
}

export function RichDocumentEditor({
    editorRef,
    html,
    onChange,
    onDragOver,
    onDrop,
}: RichDocumentEditorProps) {
    const initialConfig = parseConfigFromHtml(html);

    const [margins, setMargins] = useState<DocumentMargins>(
        initialConfig.margins,
    );
    const [marginPreset, setMarginPreset] = useState<string>("abnt");
    const [fontFamily, setFontFamily] = useState<string>(
        initialConfig.fontFamily,
    );
    const [lineHeight, setLineHeight] = useState<string>(
        initialConfig.lineHeight,
    );
    const [showVisualGuide, setShowVisualGuide] = useState(true);

    // Estado para controle dos botões ativos
    const [activeStates, setActiveStates] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikeThrough: false,
        alignLeft: false,
        alignCenter: false,
        alignRight: false,
        alignJustify: false,
    });

    // Páginas do documento
    const [pages, setPages] = useState<string[]>(() => {
        return paginateDocument(
            html,
            initialConfig.margins,
            getPaginationOptions(
                initialConfig.fontFamily,
                initialConfig.lineHeight,
            ),
        );
    });
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [showMoreTools, setShowMoreTools] = useState(false);

    const pagesRef = useRef<string[]>(pages);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
    const savedRangeRef = useRef<Range | null>(null);

    const [overflowPages, setOverflowPages] = useState<boolean[]>([]);

    const configRef = useRef({ margins, fontFamily, lineHeight });
    configRef.current = { margins, fontFamily, lineHeight };
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // Função de verificação e atualização dos estados ativos de formatação
    const updateActiveStates = useCallback(() => {
        if (typeof document === "undefined") return;

        const isBold = document.queryCommandState("bold");
        const isItalic = document.queryCommandState("italic");
        const isUnderline = document.queryCommandState("underline");
        const isStrikeThrough = document.queryCommandState("strikeThrough");

        const isAlignLeft = document.queryCommandState("justifyLeft");
        const isAlignCenter = document.queryCommandState("justifyCenter");
        const isAlignRight = document.queryCommandState("justifyRight");
        const isAlignJustify = document.queryCommandState("justifyFull");

        setActiveStates({
            bold: isBold,
            italic: isItalic,
            underline: isUnderline,
            strikeThrough: isStrikeThrough,
            alignLeft: isAlignLeft,
            alignCenter: isAlignCenter,
            alignRight: isAlignRight,
            alignJustify: isAlignJustify,
        });
    }, []);

    // Monitora alterações na seleção do usuário
    useEffect(() => {
        const handleSelectionChange = () => {
            updateActiveStates();
        };
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => {
            document.removeEventListener(
                "selectionchange",
                handleSelectionChange,
            );
        };
    }, [updateActiveStates]);

    // Navegação funcional corrigida entre páginas
    const goToPreviousPage = () => {
        setActivePageIndex((current) => Math.max(0, current - 1));
    };

    const goToNextPage = () => {
        setActivePageIndex((current) =>
            Math.min(pagesRef.current.length - 1, current + 1),
        );
    };

    const saveSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const activePage = pageRefs.current[activePageIndex];

        if (activePage && activePage.contains(range.commonAncestorContainer)) {
            savedRangeRef.current = range.cloneRange();
        }
    }, [activePageIndex]);

    const restoreSelection = useCallback(() => {
        const range = savedRangeRef.current;
        if (!range || !range.startContainer.isConnected) return;

        const activePage = pageRefs.current[activePageIndex];
        if (
            !activePage ||
            !activePage.contains(range.commonAncestorContainer)
        ) {
            return;
        }

        const selection = window.getSelection();
        if (!selection) return;

        selection.removeAllRanges();
        selection.addRange(range);
    }, [activePageIndex]);

    const dimensions = getPageDimensions(margins);

    const commitPages = useCallback((next: string[]) => {
        pagesRef.current = next;
        setPages(next);
    }, []);

    const setOverflowFlag = useCallback((pageIndex: number, flag: boolean) => {
        setOverflowPages((prev) => {
            if (!!prev[pageIndex] === flag) return prev;
            const next = [...prev];
            next[pageIndex] = flag;
            return next;
        });
    }, []);

    const emitChange = useCallback(
        (
            updatedPages: string[],
            curMargins: DocumentMargins = configRef.current.margins,
            curFont: string = configRef.current.fontFamily,
            curLineHeight: string = configRef.current.lineHeight,
        ) => {
            const configComment = `<!-- a4-config: top=${curMargins.top} left=${curMargins.left} right=${curMargins.right} bottom=${curMargins.bottom} font="${curFont}" lineHeight=${curLineHeight} -->`;
            const consolidatedHtml = joinPagesIntoHtml(
                updatedPages,
                configComment,
            );

            onChangeRef.current(consolidatedHtml);
        },
        [],
    );

    const suppressBlurSyncRef = useRef(false);
    const isComposingRef = useRef(false);

    const reflowFrom = useCallback(
        (startIndex: number) => {
            const first = pageRefs.current[startIndex];
            if (!first || !hasPageOverflow(first)) return;

            const sel = window.getSelection();
            const caret: CaretPos | null =
                sel && sel.rangeCount && sel.anchorNode
                    ? { node: sel.anchorNode, offset: sel.anchorOffset }
                    : null;

            const touched = new Set<number>([startIndex]);
            let i = startIndex;
            let guard = 0;

            while (guard++ < 50) {
                const el = pageRefs.current[i];
                if (!el) break;
                el.scrollTop = 0;
                if (!hasPageOverflow(el)) break;

                if (i + 1 >= pagesRef.current.length) {
                    pagesRef.current = [...pagesRef.current, BLANK_PAGE_HTML];
                    flushSync(() =>
                        setPages((prev) => [...prev, BLANK_PAGE_HTML]),
                    );
                }
                const nextEl = pageRefs.current[i + 1];
                if (!nextEl) break;

                if (isBlankPage(nextEl)) nextEl.innerHTML = "";
                const moved = moveOverflowToNext(el, nextEl, caret);
                if (nextEl.innerHTML === "") nextEl.innerHTML = BLANK_PAGE_HTML;
                touched.add(i + 1);
                if (!moved) break;
                i++;
            }

            const nextPages = [...pagesRef.current];
            touched.forEach((idx) => {
                const n = pageRefs.current[idx];
                if (n) nextPages[idx] = n.innerHTML;
            });
            pagesRef.current = nextPages;
            emitChange(nextPages);
            touched.forEach((idx) => {
                const n = pageRefs.current[idx];
                if (n) setOverflowFlag(idx, hasPageOverflow(n));
            });

            if (caret && caret.node.isConnected) {
                const c = caret;
                const host = pageRefs.current.findIndex(
                    (p) => !!p && p.contains(c.node),
                );
                const hostEl = host >= 0 ? pageRefs.current[host] : null;
                if (hostEl) {
                    if (document.activeElement !== hostEl) {
                        suppressBlurSyncRef.current = true;
                        hostEl.focus();
                        suppressBlurSyncRef.current = false;
                    }
                    const range = document.createRange();
                    range.setStart(c.node, c.offset);
                    range.collapse(true);
                    const s = window.getSelection();
                    s?.removeAllRanges();
                    s?.addRange(range);
                    setActivePageIndex(host);
                    (
                        (c.node instanceof HTMLElement
                            ? c.node
                            : c.node.parentElement) ?? hostEl
                    ).scrollIntoView({ block: "nearest" });
                }
            }
        },
        [emitChange, setOverflowFlag],
    );

    useEffect(() => {
        if (editorRef.current) {
            const configComment = `<!-- a4-config: top=${margins.top} left=${margins.left} right=${margins.right} bottom=${margins.bottom} font="${fontFamily}" lineHeight=${lineHeight} -->`;
            editorRef.current.innerHTML = joinPagesIntoHtml(
                pagesRef.current,
                configComment,
            );
        }
    }, []);

    const handlePageInput = useCallback(
        (pageIndex: number, newHtml: string) => {
            const nextPages = [...pagesRef.current];
            nextPages[pageIndex] = newHtml;
            pagesRef.current = nextPages;
            emitChange(nextPages);

            const pageElement = pageRefs.current[pageIndex];
            if (pageElement) {
                const m = measurePage(pageElement);
                setOverflowFlag(pageIndex, m.overflowPx > 1);
            }

            if (!isComposingRef.current) reflowFrom(pageIndex);
            updateActiveStates();
        },
        [emitChange, setOverflowFlag, reflowFrom, updateActiveStates],
    );

    useEffect(() => {
        const id = requestAnimationFrame(() => {
            const flags = pageRefs.current
                .slice(0, pages.length)
                .map((el) => (el ? hasPageOverflow(el) : false));
            setOverflowPages((prev) =>
                prev.length === flags.length &&
                prev.every((v, i) => v === flags[i])
                    ? prev
                    : flags,
            );
        });
        return () => cancelAnimationFrame(id);
    }, [pages, margins, fontFamily, lineHeight]);

    const exec = useCallback(
        (command: string, value?: string) => {
            restoreSelection();

            const activeNode = pageRefs.current[activePageIndex];
            if (!activeNode) return;

            activeNode.focus();
            document.execCommand(command, false, value);
            handlePageInput(activePageIndex, activeNode.innerHTML);
            saveSelection();
            updateActiveStates();
        },
        [
            activePageIndex,
            handlePageInput,
            restoreSelection,
            saveSelection,
            updateActiveStates,
        ],
    );

    const applyBlockStyle = useCallback(
        (cssProperty: string, value: string) => {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount) return;

            let node: Node | null = selection.anchorNode;
            const activeNode = pageRefs.current[activePageIndex];

            while (node && node !== activeNode && node !== document.body) {
                if (
                    node instanceof HTMLElement &&
                    ["P", "H1", "H2", "H3", "DIV", "LI", "TD"].includes(
                        node.tagName,
                    )
                ) {
                    node.style.setProperty(cssProperty, value);
                    if (activeNode) {
                        handlePageInput(activePageIndex, activeNode.innerHTML);
                    }
                    return;
                }
                node = node.parentNode;
            }

            exec("formatBlock", "<p>");
            if (activeNode) {
                handlePageInput(activePageIndex, activeNode.innerHTML);
            }
        },
        [activePageIndex, exec, handlePageInput],
    );

    const applyInlineStyle = useCallback(
        (cssProperty: string, value: string) => {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount || selection.isCollapsed)
                return;

            const range = selection.getRangeAt(0);
            const span = document.createElement("span");
            span.style.setProperty(cssProperty, value);

            try {
                const contents = range.extractContents();
                span.appendChild(contents);
                range.insertNode(span);
                selection.removeAllRanges();
                const newRange = document.createRange();
                newRange.selectNodeContents(span);
                selection.addRange(newRange);
            } catch {
                // Fallback silencioso
            }

            const activeNode = pageRefs.current[activePageIndex];
            if (activeNode) {
                handlePageInput(activePageIndex, activeNode.innerHTML);
            }
        },
        [activePageIndex, handlePageInput],
    );

    const applyFontFamily = (font: string) => {
        setFontFamily(font);
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
            applyInlineStyle("font-family", font);
        } else {
            applyBlockStyle("font-family", font);
        }
        emitChange(pagesRef.current, margins, font, lineHeight);
    };

    const applyFontSize = (sizePt: string) => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
            applyInlineStyle("font-size", sizePt);
        } else {
            applyBlockStyle("font-size", sizePt);
        }
    };

    const applyLineSpacing = (spacing: string) => {
        setLineHeight(spacing);
        applyBlockStyle("line-height", spacing);
        emitChange(pagesRef.current, margins, fontFamily, spacing);
    };

    const applyFirstLineIndent = () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        let node: Node | null = selection.anchorNode;
        const activeNode = pageRefs.current[activePageIndex];

        while (node && node !== activeNode && node !== document.body) {
            if (
                node instanceof HTMLElement &&
                ["P", "DIV"].includes(node.tagName)
            ) {
                const current = node.style.textIndent;
                node.style.textIndent = current === "1.25cm" ? "0cm" : "1.25cm";
                if (activeNode) {
                    handlePageInput(activePageIndex, activeNode.innerHTML);
                }
                return;
            }
            node = node.parentNode;
        }
    };

    const formatAsLongCitation = () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        let node: Node | null = selection.anchorNode;
        const activeNode = pageRefs.current[activePageIndex];

        while (node && node !== activeNode && node !== document.body) {
            if (
                node instanceof HTMLElement &&
                ["P", "DIV"].includes(node.tagName)
            ) {
                node.style.marginLeft = "4.0cm";
                node.style.fontSize = "10pt";
                node.style.lineHeight = "1.0";
                node.style.textAlign = "justify";
                node.style.textIndent = "0cm";
                node.style.marginTop = "8pt";
                node.style.marginBottom = "8pt";
                if (activeNode) {
                    handlePageInput(activePageIndex, activeNode.innerHTML);
                }
                return;
            }
            node = node.parentNode;
        }
    };

    const handleMarginPresetChange = (presetKey: string) => {
        setMarginPreset(presetKey);
        if (MARGIN_PRESETS[presetKey]) {
            const nextMargins = MARGIN_PRESETS[presetKey].margins;
            setMargins(nextMargins);
            emitChange(pagesRef.current, nextMargins, fontFamily, lineHeight);
        }
    };

    const insertNewBlankPage = (afterIndex = pagesRef.current.length - 1) => {
        const nextPages = [...pagesRef.current];
        const newPageHtml =
            '<p style="text-align: justify; line-height: 1.5; font-size: 12pt;"><br/></p>';
        nextPages.splice(afterIndex + 1, 0, newPageHtml);
        commitPages(nextPages);
        setActivePageIndex(afterIndex + 1);
        emitChange(nextPages);
    };

    const removePage = (indexToRemove: number) => {
        if (pagesRef.current.length <= 1) return;
        const nextPages = pagesRef.current.filter(
            (_, idx) => idx !== indexToRemove,
        );
        pageRefs.current.splice(indexToRemove, 1);
        commitPages(nextPages);
        const nextActive = Math.min(activePageIndex, nextPages.length - 1);
        setActivePageIndex(nextActive);
        emitChange(nextPages);
    };

    const insertPageBreakAtCursor = () => {
        const selection = window.getSelection();
        const activeNode = pageRefs.current[activePageIndex];

        if (!selection || !selection.rangeCount || !activeNode) {
            insertNewBlankPage(activePageIndex);
            return;
        }

        try {
            const range = selection.getRangeAt(0);
            const preRange = document.createRange();
            preRange.selectNodeContents(activeNode);
            preRange.setEnd(range.startContainer, range.startOffset);
            const preFragment = preRange.cloneContents();
            const preDiv = document.createElement("div");
            preDiv.appendChild(preFragment);
            const preHtml = preDiv.innerHTML.trim() || "<p><br/></p>";

            const postRange = document.createRange();
            postRange.selectNodeContents(activeNode);
            postRange.setStart(range.endContainer, range.endOffset);
            const postFragment = postRange.cloneContents();
            const postDiv = document.createElement("div");
            postDiv.appendChild(postFragment);
            const postHtml = postDiv.innerHTML.trim() || "<p><br/></p>";

            const nextPages = [...pagesRef.current];
            nextPages[activePageIndex] = preHtml;
            nextPages.splice(activePageIndex + 1, 0, postHtml);
            commitPages(nextPages);
            setActivePageIndex(activePageIndex + 1);
            emitChange(nextPages);
        } catch {
            insertNewBlankPage(activePageIndex);
        }
    };

    const insertTable = () => {
        const tableHtml = `
           <table style="width: 100%; border-collapse: collapse; margin: 14pt 0; font-size: 10.5pt;">
               <thead>
                   <tr style="background-color: #f8fafc;">
                       <th style="border: 1px solid #94a3b8; padding: 6pt 10pt; text-align: left; font-weight: bold;">Item</th>
                       <th style="border: 1px solid #94a3b8; padding: 6pt 10pt; text-align: left; font-weight: bold;">Descrição Oficial</th>
                       <th style="border: 1px solid #94a3b8; padding: 6pt 10pt; text-align: center; font-weight: bold;">Qtd</th>
                       <th style="border: 1px solid #94a3b8; padding: 6pt 10pt; text-align: right; font-weight: bold;">Valor</th>
                   </tr>
               </thead>
               <tbody>
                   <tr>
                       <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt;">01</td>
                       <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt;">Prestação de serviço conforme termo</td>
                       <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt; text-align: center;">01</td>
                       <td style="border: 1px solid #cbd5e1; padding: 6pt 10pt; text-align: right;">R$ 0,00</td>
                   </tr>
               </tbody>
           </table>
       `;
        exec("insertHTML", tableHtml);
    };

    return (
        <div className="flex w-full flex-col items-center">
            {/* Contêiner invisível mantendo editorRef compatível com submissão */}
            <div ref={editorRef} className="hidden" aria-hidden="true" />

            {/* Barra de Ferramentas Inspirada no Google Docs */}
            <div
                role="toolbar"
                aria-label="Ferramentas do editor de documentos"
                className="sticky top-2 z-30 mb-6 flex w-full max-w-[980px] flex-col rounded-xl border border-border/80 bg-background/95 px-3 py-1.5  backdrop-blur-md"
            >
                {/* Linha principal de ações */}
                <div className="flex min-w-0 items-center justify-between gap-1 overflow-x-auto py-0.5">
                    <div className="flex items-center gap-0.5">
                        {/* Histórico: Undoing & Redoing */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-muted"
                            title="Desfazer (Ctrl+Z)"
                            aria-label="Desfazer"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                saveSelection();
                            }}
                            onClick={() => exec("undo")}
                        >
                            <Undo className="h-4 w-4 text-muted-foreground" />
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-muted"
                            title="Refazer (Ctrl+Y)"
                            aria-label="Refazer"
                            onMouseDown={(e) => {
                                e.preventDefault();
                                saveSelection();
                            }}
                            onClick={() => exec("redo")}
                        >
                            <Redo className="h-4 w-4 text-muted-foreground" />
                        </Button>

                        <ToolbarSeparator />

                        {/* Navegação Global de Páginas integrada na Barra */}
                        <div className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full hover:bg-muted"
                                title="Página anterior"
                                aria-label="Página anterior"
                                disabled={activePageIndex === 0}
                                onClick={goToPreviousPage}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="whitespace-nowrap px-1 font-medium text-foreground text-xs">
                                Página {activePageIndex + 1} / {pages.length}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full hover:bg-muted"
                                title="Próxima página"
                                aria-label="Próxima página"
                                disabled={activePageIndex >= pages.length - 1}
                                onClick={goToNextPage}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <ToolbarSeparator />

                        {/* Família e Tamanho da Fonte */}
                        <select
                            value={fontFamily}
                            onChange={(e) => applyFontFamily(e.target.value)}
                            title="Família da fonte"
                            aria-label="Família da fonte"
                            className={`${TOOLBAR_SELECT_CLASS} w-32`}
                        >
                            <option value="'Times New Roman', Times, serif">
                                Times New Roman
                            </option>
                            <option value="Arial, Helvetica, sans-serif">
                                Arial
                            </option>
                            <option value="Calibri, sans-serif">Calibri</option>
                            <option value="Georgia, serif">Georgia</option>
                        </select>

                        <select
                            defaultValue="12pt"
                            onChange={(e) => applyFontSize(e.target.value)}
                            title="Tamanho da fonte"
                            aria-label="Tamanho da fonte"
                            className={`${TOOLBAR_SELECT_CLASS} w-16 text-center`}
                        >
                            <option value="10pt">10</option>
                            <option value="11pt">11</option>
                            <option value="12pt">12</option>
                            <option value="14pt">14</option>
                            <option value="16pt">16</option>
                            <option value="18pt">18</option>
                        </select>

                        <ToolbarSeparator />

                        {/* Estilos de Texto com Indicação Ativa */}
                        <Button
                            type="button"
                            variant={activeStates.bold ? "secondary" : "ghost"}
                            size="icon"
                            className={`h-8 w-8 rounded-md transition-colors ${
                                activeStates.bold
                                    ? "bg-accent text-accent-foreground font-bold shadow-sm"
                                    : "hover:bg-muted text-muted-foreground"
                            }`}
                            title="Negrito (Ctrl+B)"
                            aria-label="Negrito"
                            aria-pressed={activeStates.bold}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                saveSelection();
                            }}
                            onClick={() => exec("bold")}
                        >
                            <Bold className="h-4 w-4" />
                        </Button>

                        <Button
                            type="button"
                            variant={
                                activeStates.italic ? "secondary" : "ghost"
                            }
                            size="icon"
                            className={`h-8 w-8 rounded-md transition-colors ${
                                activeStates.italic
                                    ? "bg-accent text-accent-foreground shadow-sm"
                                    : "hover:bg-muted text-muted-foreground"
                            }`}
                            title="Itálico (Ctrl+I)"
                            aria-label="Itálico"
                            aria-pressed={activeStates.italic}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                saveSelection();
                            }}
                            onClick={() => exec("italic")}
                        >
                            <Italic className="h-4 w-4" />
                        </Button>

                        <Button
                            type="button"
                            variant={
                                activeStates.underline ? "secondary" : "ghost"
                            }
                            size="icon"
                            className={`h-8 w-8 rounded-md transition-colors ${
                                activeStates.underline
                                    ? "bg-accent text-accent-foreground shadow-sm"
                                    : "hover:bg-muted text-muted-foreground"
                            }`}
                            title="Sublinhado (Ctrl+U)"
                            aria-label="Sublinhado"
                            aria-pressed={activeStates.underline}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                saveSelection();
                            }}
                            onClick={() => exec("underline")}
                        >
                            <Underline className="h-4 w-4" />
                        </Button>

                        <Button
                            type="button"
                            variant={
                                activeStates.strikeThrough
                                    ? "secondary"
                                    : "ghost"
                            }
                            size="icon"
                            className={`h-8 w-8 rounded-md transition-colors ${
                                activeStates.strikeThrough
                                    ? "bg-accent text-accent-foreground shadow-sm"
                                    : "hover:bg-muted text-muted-foreground"
                            }`}
                            title="Tachado"
                            aria-label="Tachado"
                            aria-pressed={activeStates.strikeThrough}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                saveSelection();
                            }}
                            onClick={() => exec("strikeThrough")}
                        >
                            <Strikethrough className="h-4 w-4" />
                        </Button>

                        <ToolbarSeparator />

                        {/* Alinhamentos com Indicação Ativa */}
                        <Button
                            type="button"
                            variant={
                                activeStates.alignLeft ? "secondary" : "ghost"
                            }
                            size="icon"
                            className={`h-8 w-8 rounded-md transition-colors ${
                                activeStates.alignLeft
                                    ? "bg-accent text-accent-foreground shadow-sm"
                                    : "hover:bg-muted text-muted-foreground"
                            }`}
                            title="Alinhar à esquerda"
                            aria-label="Alinhar à esquerda"
                            aria-pressed={activeStates.alignLeft}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                saveSelection();
                            }}
                            onClick={() => exec("justifyLeft")}
                        >
                            <AlignLeft className="h-4 w-4" />
                        </Button>

                        <Button
                            type="button"
                            variant={
                                activeStates.alignCenter ? "secondary" : "ghost"
                            }
                            size="icon"
                            className={`h-8 w-8 rounded-md transition-colors ${
                                activeStates.alignCenter
                                    ? "bg-accent text-accent-foreground shadow-sm"
                                    : "hover:bg-muted text-muted-foreground"
                            }`}
                            title="Centralizar"
                            aria-label="Centralizar"
                            aria-pressed={activeStates.alignCenter}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                saveSelection();
                            }}
                            onClick={() => exec("justifyCenter")}
                        >
                            <AlignCenter className="h-4 w-4" />
                        </Button>

                        <Button
                            type="button"
                            variant={
                                activeStates.alignRight ? "secondary" : "ghost"
                            }
                            size="icon"
                            className={`h-8 w-8 rounded-md transition-colors ${
                                activeStates.alignRight
                                    ? "bg-accent text-accent-foreground shadow-sm"
                                    : "hover:bg-muted text-muted-foreground"
                            }`}
                            title="Alinhar à direita"
                            aria-label="Alinhar à direita"
                            aria-pressed={activeStates.alignRight}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                saveSelection();
                            }}
                            onClick={() => exec("justifyRight")}
                        >
                            <AlignRight className="h-4 w-4" />
                        </Button>

                        <Button
                            type="button"
                            variant={
                                activeStates.alignJustify
                                    ? "secondary"
                                    : "ghost"
                            }
                            size="icon"
                            className={`h-8 w-8 rounded-md transition-colors ${
                                activeStates.alignJustify
                                    ? "bg-accent text-accent-foreground shadow-sm"
                                    : "hover:bg-muted text-muted-foreground"
                            }`}
                            title="Justificar"
                            aria-label="Justificar"
                            aria-pressed={activeStates.alignJustify}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                saveSelection();
                            }}
                            onClick={() => exec("justifyFull")}
                        >
                            <AlignJustify className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Mais Ferramentas */}
                    <div className="flex items-center gap-1 pl-1">
                        <ToolbarSeparator />
                        <Button
                            type="button"
                            variant={showMoreTools ? "secondary" : "ghost"}
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-muted"
                            title="Mais opções de formatação"
                            aria-label="Mais opções de formatação"
                            aria-expanded={showMoreTools}
                            onClick={() => setShowMoreTools((prev) => !prev)}
                        >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </div>
                </div>

                {/* Painel Expansível de Opções Adicionais */}
                {showMoreTools && (
                    <div
                        className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs"
                        aria-label="Ferramentas secundárias"
                    >
                        <div className="flex flex-wrap items-center gap-1.5">
                            {/* Espaçamento de Parágrafo */}
                            <div className="flex items-center gap-1">
                                <span className="text-[11px] text-muted-foreground font-medium">
                                    Entrelinhas:
                                </span>
                                <select
                                    value={lineHeight}
                                    onChange={(e) =>
                                        applyLineSpacing(e.target.value)
                                    }
                                    className={`${TOOLBAR_SELECT_CLASS} w-16`}
                                    title="Espaçamento entre linhas"
                                >
                                    <option value="1.0">1,0</option>
                                    <option value="1.15">1,15</option>
                                    <option value="1.5">1,5</option>
                                    <option value="2.0">2,0</option>
                                </select>
                            </div>

                            <ToolbarSeparator />

                            {/* Recuo e Citação */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                title="Recuo de primeira linha de 1,25 cm"
                                onClick={applyFirstLineIndent}
                            >
                                <Indent className="h-3.5 w-3.5 mr-1" />
                                Recuo 1,25 cm
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                title="Formatar citação longa (ABNT)"
                                onClick={formatAsLongCitation}
                            >
                                <Quote className="h-3.5 w-3.5 mr-1" />
                                Citação 4 cm
                            </Button>

                            <ToolbarSeparator />

                            {/* Inserção e Margens */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                title="Inserir tabela formatada"
                                onClick={insertTable}
                            >
                                <TableIcon className="h-3.5 w-3.5 mr-1" />
                                Tabela
                            </Button>

                            <select
                                value={marginPreset}
                                onChange={(e) =>
                                    handleMarginPresetChange(e.target.value)
                                }
                                className={`${TOOLBAR_SELECT_CLASS} w-36`}
                                title="Margens do documento"
                            >
                                <option value="abnt">ABNT Oficial</option>
                                <option value="normal">Padrão (2,5 cm)</option>
                                <option value="narrow">
                                    Estreita (1,5 cm)
                                </option>
                            </select>

                            <Button
                                type="button"
                                variant={
                                    showVisualGuide ? "secondary" : "ghost"
                                }
                                size="sm"
                                className="h-7 px-2 text-xs"
                                title={
                                    showVisualGuide
                                        ? "Ocultar guia de margem"
                                        : "Exibir guia de margem"
                                }
                                onClick={() =>
                                    setShowVisualGuide(!showVisualGuide)
                                }
                            >
                                {showVisualGuide ? (
                                    <Eye className="h-3.5 w-3.5 mr-1 text-sky-600" />
                                ) : (
                                    <EyeOff className="h-3.5 w-3.5 mr-1" />
                                )}
                                Guia útil
                            </Button>
                        </div>

                        {/* Gerenciamento de Páginas */}
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                title="Quebrar página no cursor"
                                onClick={insertPageBreakAtCursor}
                            >
                                <Scissors className="h-3.5 w-3.5 mr-1" />
                                Quebra
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-primary"
                                title="Adicionar nova página ao final"
                                onClick={() =>
                                    insertNewBlankPage(activePageIndex)
                                }
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Nova folha
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Área de folhas A4 com cabeçalho fixo e independente */}
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
                            {/* Ações da Folha Atual */}
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

                            {/* Folha Folha A4 */}
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
                                {/* Guia Visual da Área Útil */}
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

                                {/* Conteúdo Editável */}
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
                                    onKeyUp={updateActiveStates}
                                    onMouseUp={updateActiveStates}
                                    onCompositionStart={() => {
                                        isComposingRef.current = true;
                                    }}
                                    onCompositionEnd={() => {
                                        isComposingRef.current = false;
                                        const node = pageRefs.current[index];
                                        if (node) {
                                            handlePageInput(
                                                index,
                                                node.innerHTML,
                                            );
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
                                        fontSize: "12pt",
                                        lineHeight,
                                        textAlign: "justify",
                                        overflowWrap: "anywhere",
                                        wordBreak: "break-word",
                                        width: "100%",
                                        height: `${A4_HEIGHT_MM}mm`,
                                        maxHeight: `${A4_HEIGHT_MM}mm`,
                                        overflowY: "hidden",
                                        overflowX: "hidden",
                                        boxSizing: "border-box",
                                    }}
                                    className="a4-page-content text-[12pt] text-gray-900 outline-none select-text focus:outline-none [&_.document-footer]:mt-6 [&_.document-footer]:border-t [&_.document-footer]:border-slate-300 [&_.document-footer]:pt-2 [&_.document-footer]:text-center [&_.document-footer]:text-[9pt] [&_.document-footer]:text-slate-500 [&_.document-header]:mb-5 [&_.document-header]:border-b [&_.document-header]:border-slate-300 [&_.document-header]:pb-2 [&_.document-header]:text-center [&_.document-header]:text-[10.5pt] [&_h1]:my-4 [&_h1]:text-center [&_h1]:text-[17pt] [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-[14pt] [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-[12pt] [&_h3]:font-bold [&_img]:my-3 [&_img]:inline-block [&_p]:my-1.5 [&_table]:my-3.5"
                                />

                                {/* Indicador de Transbordo */}
                                {overflowPages[index] && (
                                    <div
                                        className="pointer-events-none absolute left-4 top-2 z-20 rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow"
                                        aria-hidden="true"
                                    >
                                        Conteúdo excede a área útil
                                    </div>
                                )}

                                {/* Número da Página Rodapé */}
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
        </div>
    );
}
