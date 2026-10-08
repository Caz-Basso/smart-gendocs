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
    Outdent,
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

// Liga/desliga o log de diagnóstico de estouro (roda a cada tecla).
const DEBUG_PAGE_OVERFLOW = true;

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
    usableHeight: number; // px disponíveis para conteúdo (altura da folha - paddings)
    contentHeight: number; // px realmente ocupados pelo conteúdo
    overflowPx: number; // > 0 indica estouro
}

/**
 * Mede a página pela geometria real do conteúdo, comparando com a ÁREA ÚTIL
 * (clientHeight menos padding superior/inferior), e não com a altura da folha.
 */
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
    // scrollTop compensa a rolagem automática que o contentEditable faz
    // quando o cursor passa do fim, mesmo com overflow hidden.
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

// ---------------------------------------------------------------------------
// Reflow entre páginas (transferência do conteúdo excedente)
// ---------------------------------------------------------------------------

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

// Converte um deslocamento em caracteres (texto do bloco) em nó+offset do DOM
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

// Limite inferior (coordenada de viewport) da área útil da página. Requer scrollTop = 0.
function getUsableBottom(el: HTMLElement): number {
    const cs = window.getComputedStyle(el);
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    return el.getBoundingClientRect().top + el.clientHeight - padBottom;
}

/**
 * Divide `block` no ponto em que ele ultrapassa `limitY`, devolvendo um clone
 * do bloco (mesma tag e estilo) com o trecho excedente. A formatação inline é
 * preservada por Range.extractContents(). Atualiza `caret` se ele estiver no bloco.
 */
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

    // O retângulo de texto não inclui o espaçamento entre linhas; soma a meia-folga
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

    // Maior k cujo texto [0, k) cabe na página
    let lo = 0;
    let hi = total;
    while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (fits(mid)) lo = mid;
        else hi = mid - 1;
    }
    let k = lo;

    if (k >= total) {
        // O texto cabe mas o bloco ainda estoura: empurra a última palavra
        k = total;
        while (k > 0 && /\s/.test(fullText[k - 1])) k--;
        while (k > 0 && !/\s/.test(fullText[k - 1])) k--;
        if (k <= 0 && total > 1) k = total - 1;
    } else {
        // Recua até o início de uma palavra (se houver espaço)
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
    tail.style.textIndent = "0cm"; // continuação do parágrafo não recebe recuo de 1ª linha

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

/**
 * Move o excedente de `el` para o início de `nextEl` até `el` caber na área útil.
 * Blocos que começam dentro da página são divididos; blocos fora dela são movidos inteiros.
 */
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

        // Remove espaços em branco soltos no fim
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
                    // Mesma continuação de parágrafo: junta em vez de criar outro bloco
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

        // Se o bloco começa fora da área útil, move-o inteiro.
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

    const goToPreviousPage = () => {
        setActivePageIndex((current) => Math.max(0, current - 1));
    };

    const goToNextPage = () => {
        setActivePageIndex((current) =>
            Math.min(pagesRef.current.length - 1, current + 1),
        );
    };
    // Páginas cujo conteúdo excede a área útil (para sinalização visual)
    const [overflowPages, setOverflowPages] = useState<boolean[]>([]);
    const pagesRef = useRef<string[]>(pages);

    // Referências para os nós de conteúdo de cada folha
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Config e onChange sempre atuais, para handlers estáveis (sem closures obsoletas)
    const configRef = useRef({ margins, fontFamily, lineHeight });
    configRef.current = { margins, fontFamily, lineHeight };
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const dimensions = getPageDimensions(margins);

    // Único ponto de escrita das páginas: mantém ref e estado sincronizados
    const commitPages = useCallback((next: string[]) => {
        pagesRef.current = next;
        setPages(next);
    }, []);

    // Atualiza o flag de estouro de uma página só quando o valor muda (evita re-render a cada tecla)
    const setOverflowFlag = useCallback((pageIndex: number, flag: boolean) => {
        setOverflowPages((prev) => {
            if (!!prev[pageIndex] === flag) return prev;
            const next = [...prev];
            next[pageIndex] = flag;
            return next;
        });
    }, []);

    // Constrói o HTML consolidado e emite para o formulário pai
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

    // Evita que o onBlur reescreva o HTML (e derrube o cursor) durante o reflow
    const suppressBlurSyncRef = useRef(false);
    const isComposingRef = useRef(false);

    // Transfere o conteúdo excedente da página `startIndex` para as seguintes (em cascata)
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
                    // Renderiza a nova folha já, sem tocar no DOM das existentes
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

            // Persiste o HTML das páginas alteradas
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

            // Restaura o cursor na página onde ele foi parar
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

    // Inicializa na primeira carga
    useEffect(() => {
        if (editorRef.current) {
            const configComment = `<!-- a4-config: top=${margins.top} left=${margins.left} right=${margins.right} bottom=${margins.bottom} font="${fontFamily}" lineHeight=${lineHeight} -->`;
            editorRef.current.innerHTML = joinPagesIntoHtml(
                pagesRef.current,
                configComment,
            );
        }
    }, []);

    // Atualiza conteúdo de uma página específica (não chama setPages: preserva o cursor)
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
                if (DEBUG_PAGE_OVERFLOW) {
                    console.log("Diagnóstico da página:", {
                        pageIndex,
                        usableHeight: Math.round(m.usableHeight),
                        contentHeight: Math.round(m.contentHeight),
                        overflowPx: Math.round(m.overflowPx),
                        clientHeight: pageElement.clientHeight,
                        scrollHeight: pageElement.scrollHeight,
                        scrollTop: pageElement.scrollTop,
                        hasOverflow: hasPageOverflow(pageElement),
                    });
                }
            }

            if (!isComposingRef.current) reflowFrom(pageIndex);
        },
        [emitChange, setOverflowFlag, reflowFrom],
    );

    // Reavalia o estouro de todas as páginas após render (páginas, margens, fonte, entrelinhas)
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

    // Comando nativo de edição de texto
    const exec = useCallback(
        (command: string, value: string | undefined = undefined) => {
            document.execCommand(command, false, value);
            // Sincroniza página ativa
            const activeNode = pageRefs.current[activePageIndex];
            if (activeNode) {
                handlePageInput(activePageIndex, activeNode.innerHTML);
            }
        },
        [activePageIndex, handlePageInput],
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

    // Operações de Paginação
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

    // Quebra a página atual na posição do cursor
    const insertPageBreakAtCursor = () => {
        const selection = window.getSelection();
        const activeNode = pageRefs.current[activePageIndex];

        if (!selection || !selection.rangeCount || !activeNode) {
            insertNewBlankPage(activePageIndex);
            return;
        }

        try {
            const range = selection.getRangeAt(0);
            // Elementos antes do cursor
            const preRange = document.createRange();
            preRange.selectNodeContents(activeNode);
            preRange.setEnd(range.startContainer, range.startOffset);
            const preFragment = preRange.cloneContents();
            const preDiv = document.createElement("div");
            preDiv.appendChild(preFragment);
            const preHtml = preDiv.innerHTML.trim() || "<p><br/></p>";

            // Elementos após o cursor
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

    // Inserção de Elementos Oficiais
    const insertHeader = () => {
        const headerHtml = `
            <header class="document-header" style="text-align: center; margin-bottom: 18pt; padding-bottom: 8pt; border-bottom: 1px solid #cbd5e1; font-size: 10.5pt; line-height: 1.4;">
                <p style="margin: 0; font-weight: bold; text-transform: uppercase; font-size: 11pt;">REPÚBLICA FEDERATIVA DO BRASIL</p>
                <p style="margin: 2pt 0 0 0; font-size: 10pt; color: #475569;">Órgão / Entidade Governamental / Unidade Administrativa</p>
            </header>
        `;
        const activeNode = pageRefs.current[activePageIndex];
        if (activeNode) {
            const nextPages = [...pagesRef.current];
            nextPages[activePageIndex] = headerHtml + activeNode.innerHTML;
            commitPages(nextPages);
            emitChange(nextPages);
        }
    };

    const insertFooter = () => {
        const footerHtml = `
            <footer class="document-footer" style="text-align: center; margin-top: 24pt; padding-top: 8pt; border-top: 1px solid #cbd5e1; font-size: 9pt; color: #64748b; line-height: 1.4;">
                <p style="margin: 0;">Endereço Institucional Oficial • CEP 00000-000 • Contato: oficial@instituicao.gov.br</p>
            </footer>
        `;
        const activeNode = pageRefs.current[activePageIndex];
        if (activeNode) {
            const nextPages = [...pagesRef.current];
            nextPages[activePageIndex] = activeNode.innerHTML + footerHtml;
            commitPages(nextPages);
            emitChange(nextPages);
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

            {/* Barra de Ferramentas Avançada com Suporte a Paginação A4 */}
            <div className="sticky top-2 z-20 mb-6 flex w-full max-w-[980px] flex-col gap-1.5 rounded-lg border border-border/80 bg-background/95 p-2 shadow-md backdrop-blur-md">
                {/* Linha 1: Histórico, Navegação de Páginas, Fonte, Tamanho, Estilo, Alinhamento */}
                <div className="flex flex-wrap items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Desfazer"
                        onClick={() => exec("undo")}
                    >
                        <Undo className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Refazer"
                        onClick={() => exec("redo")}
                    >
                        <Redo className="h-4 w-4" />
                    </Button>

                    <div className="mx-1 h-5 w-px bg-border/80" />

                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Página anterior"
                            disabled={activePageIndex === 0}
                            onClick={goToPreviousPage}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <span className="min-w-[90px] text-center text-xs font-medium">
                            Página {activePageIndex + 1} de {pages.length}
                        </span>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title="Próxima página"
                            disabled={activePageIndex >= pages.length - 1}
                            onClick={goToNextPage}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="mx-1 h-5 w-px bg-border/80" />

                    <div className="mx-1 h-5 w-px bg-border/80" />

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 bg-emerald-50 px-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                        title="Inserir Nova Folha A4 no Documento"
                        onClick={() => insertNewBlankPage(activePageIndex)}
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Nova Página A4
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 px-2 text-xs font-semibold"
                        title="Quebrar Página no Cursor"
                        onClick={insertPageBreakAtCursor}
                    >
                        <Scissors className="h-3.5 w-3.5 text-blue-600" />
                        Quebra de Página
                    </Button>

                    <div className="mx-1 h-5 w-px bg-border/80" />

                    {/* Família da Fonte */}
                    <select
                        value={fontFamily}
                        onChange={(e) => applyFontFamily(e.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:ring-1 focus:ring-ring focus:outline-none"
                        title="Família da Fonte (Padrão Oficial)"
                    >
                        <option value="'Times New Roman', Times, serif">
                            Times New Roman (ABNT/Jurídico)
                        </option>
                        <option value="Arial, Helvetica, sans-serif">
                            Arial (Oficial/Executivo)
                        </option>
                        <option value="Calibri, sans-serif">
                            Calibri (Administrativo)
                        </option>
                        <option value="Georgia, serif">
                            Georgia (Clássico)
                        </option>
                    </select>

                    {/* Tamanho da Fonte */}
                    <select
                        defaultValue="12pt"
                        onChange={(e) => applyFontSize(e.target.value)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:ring-1 focus:ring-ring focus:outline-none"
                        title="Tamanho da Fonte"
                    >
                        <option value="10pt">
                            10pt (Citações / Notas ABNT)
                        </option>
                        <option value="11pt">11pt (Tabelas)</option>
                        <option value="12pt">12pt (Corpo Oficial ABNT)</option>
                        <option value="14pt">14pt (Subtítulo)</option>
                        <option value="16pt">16pt (Título Principal)</option>
                        <option value="18pt">
                            18pt (Cabeçalho Institucional)
                        </option>
                    </select>

                    <div className="mx-1 h-5 w-px bg-border/80" />

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 font-bold"
                        title="Negrito"
                        onClick={() => exec("bold")}
                    >
                        <Bold className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 italic"
                        title="Itálico"
                        onClick={() => exec("italic")}
                    >
                        <Italic className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 underline"
                        title="Sublinhado"
                        onClick={() => exec("underline")}
                    >
                        <Underline className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 line-through"
                        title="Tachado"
                        onClick={() => exec("strikeThrough")}
                    >
                        <Strikethrough className="h-4 w-4" />
                    </Button>

                    <div className="mx-1 h-5 w-px bg-border/80" />

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Justificar (Padrão Oficial ABNT)"
                        onClick={() => exec("justifyFull")}
                    >
                        <AlignJustify className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Alinhar à Esquerda"
                        onClick={() => exec("justifyLeft")}
                    >
                        <AlignLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Centralizar"
                        onClick={() => exec("justifyCenter")}
                    >
                        <AlignCenter className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        title="Alinhar à Direita"
                        onClick={() => exec("justifyRight")}
                    >
                        <AlignRight className="h-4 w-4" />
                    </Button>
                </div>

                {/* Linha 2: Entrelinhas, Recuos, Margens, Tabela, Cabeçalho/Rodapé, Guia Visual */}
                <div className="flex flex-wrap items-center gap-1 border-t border-border/60 pt-1.5">
                    {/* Espaçamento Entrelinhas */}
                    <div className="flex items-center gap-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                            Entrelinhas:
                        </span>
                        <select
                            value={lineHeight}
                            onChange={(e) => applyLineSpacing(e.target.value)}
                            className="h-7 rounded border border-input bg-background px-1.5 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                            title="Espaçamento Entrelinhas"
                        >
                            <option value="1.0">1.0 (Simples)</option>
                            <option value="1.15">1.15 (Compacto)</option>
                            <option value="1.5">
                                1.5 (Padrão ABNT Oficial)
                            </option>
                            <option value="2.0">2.0 (Duplo)</option>
                        </select>
                    </div>

                    <div className="mx-1 h-5 w-px bg-border/80" />

                    {/* Recuos de Parágrafo */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-medium"
                        title="Recuo de 1ª Linha (1,25 cm ABNT)"
                        onClick={applyFirstLineIndent}
                    >
                        <Indent className="mr-1 h-3.5 w-3.5" />
                        Recuo 1,25cm
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-medium"
                        title="Citação Longa (Recuo 4,0 cm, 10pt, simples - ABNT NBR 10520)"
                        onClick={formatAsLongCitation}
                    >
                        <Quote className="mr-1 h-3.5 w-3.5" />
                        Citação 4cm
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Diminuir Recuo"
                        onClick={() => exec("outdent")}
                    >
                        <Outdent className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Aumentar Recuo"
                        onClick={() => exec("indent")}
                    >
                        <Indent className="h-3.5 w-3.5" />
                    </Button>

                    <div className="mx-1 h-5 w-px bg-border/80" />

                    {/* Margens da Folha A4 */}
                    <div className="flex items-center gap-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                            Margens:
                        </span>
                        <select
                            value={marginPreset}
                            onChange={(e) =>
                                handleMarginPresetChange(e.target.value)
                            }
                            className="h-7 rounded border border-input bg-background px-1.5 text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                            title="Configuração de Margens da Folha A4"
                        >
                            <option value="abnt">
                                ABNT Oficial (3cm Sup/Esq, 2cm Dir/Inf)
                            </option>
                            <option value="normal">Padrão (2,5 cm)</option>
                            <option value="narrow">Estreita (1,5 cm)</option>
                        </select>
                    </div>

                    {/* Guia Visual da Área Útil */}
                    <Button
                        type="button"
                        variant={showVisualGuide ? "secondary" : "ghost"}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title={
                            showVisualGuide
                                ? "Ocultar Guia Visual de Área Útil"
                                : "Exibir Guia Visual de Área Útil"
                        }
                        onClick={() => setShowVisualGuide(!showVisualGuide)}
                    >
                        {showVisualGuide ? (
                            <Eye className="mr-1 h-3.5 w-3.5 text-sky-600" />
                        ) : (
                            <EyeOff className="mr-1 h-3.5 w-3.5" />
                        )}
                        Guia Útil
                    </Button>

                    <div className="mx-1 h-5 w-px bg-border/80" />

                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="Inserir Tabela Formatada"
                        onClick={insertTable}
                    >
                        <TableIcon className="mr-1 h-3.5 w-3.5" />
                        Tabela
                    </Button>
                </div>
            </div>

            {/* Mesa de Trabalho (Desk) Contendo as Folhas A4 Independentes */}
            <div className="relative flex w-full flex-col items-center gap-8 overflow-x-auto rounded-lg bg-slate-100 p-4 shadow-inner dark:bg-slate-900/60 sm:p-8">
                {pages.map((pageHtml, index) => {
                    const pageNumber = index + 1;
                    const isLastPage = index === pages.length - 1;

                    return (
                        <div
                            key={index}
                            className="flex flex-col items-center transition-all"
                            style={
                                index === activePageIndex
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
                            {/* Cabeçalho da Folha A4 com Ações da Página */}
                            <div className="mb-2 flex w-[210mm] max-w-full items-center justify-between px-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground">
                                        Página {pageNumber} — Folha A4
                                    </span>
                                    <span className="text-[11px]">
                                        (210 × 297 mm)
                                    </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-1.5 text-[11px]"
                                        title="Inserir nova página abaixo desta"
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

                            {/* Folha A4 Real Independente (210mm x 297mm) */}
                            <div
                                className={`relative shrink-0 border bg-white text-gray-900 shadow-2xl transition-all select-text ${
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
                                {/* Guia Visual da Área Útil Imprimível */}
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

                                {/* Área de Conteúdo Editável da Folha com Margens Exatas */}
                                <div
                                    ref={(el) => {
                                        pageRefs.current[index] = el;
                                    }}
                                    contentEditable
                                    suppressContentEditableWarning
                                    dangerouslySetInnerHTML={{
                                        __html: pageHtml,
                                    }}
                                    onFocus={() => setActivePageIndex(index)}
                                    onInput={(e) =>
                                        handlePageInput(
                                            index,
                                            e.currentTarget.innerHTML,
                                        )
                                    }
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

                                {/* Aviso de conteúdo excedente na área útil */}
                                {overflowPages[index] && (
                                    <div
                                        className="pointer-events-none absolute left-4 top-2 z-20 rounded bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow"
                                        aria-hidden="true"
                                    >
                                        Conteúdo excede a área útil
                                    </div>
                                )}

                                {/* Rodapé com Número da Página Oficial */}
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
