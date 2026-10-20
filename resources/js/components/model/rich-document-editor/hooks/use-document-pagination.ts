import { useCallback } from "react";
import { flushSync } from "react-dom";

import {
    hasPageOverflow,
    isBlankPage,
    measurePage,
    moveOverflowToNext,
    moveUnderflowFromNext,
    BLANK_PAGE_HTML,
} from "../utils/dom-pagination";

import type { CaretPos, RefWithCurrent } from "../types";

interface UseDocumentPaginationOptions {
    pagesRef: RefWithCurrent<string[]>;
    pageRefs: RefWithCurrent<(HTMLDivElement | null)[]>;
    suppressBlurSyncRef: RefWithCurrent<boolean>;

    setPages: (pages: string[] | ((prev: string[]) => string[])) => void;
    setActivePageIndex: (
        updater: number | ((current: number) => number),
    ) => void;
    emitChange: (pages: string[]) => void;
    setOverflowFlag: (pageIndex: number, flag: boolean) => void;
}

export function useDocumentPagination({
    pagesRef,
    pageRefs,
    suppressBlurSyncRef,
    setPages,
    setActivePageIndex,
    emitChange,
    setOverflowFlag,
}: UseDocumentPaginationOptions) {
    const reflowFrom = useCallback(
        (startIndex: number) => {
            const first = pageRefs.current[startIndex];
            if (!first) return;

            const firstMetrics = measurePage(first);
            const needsForward = firstMetrics.overflowPx > 1;
            const needsBackward =
                firstMetrics.overflowPx < -15 && pagesRef.current.length > 1;

            if (!needsForward && !needsBackward) return;

            const sel = window.getSelection();
            const caret: CaretPos | null =
                sel && sel.rangeCount && sel.anchorNode
                    ? { node: sel.anchorNode, offset: sel.anchorOffset }
                    : null;

            const touched = new Set<number>([startIndex]);
            let i = startIndex;
            let guard = 0;

            while (guard++ < 50 && i < pagesRef.current.length) {
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
                touched.add(i);
                touched.add(i + 1);
                if (!moved) break;
                i++;
            }

            i = startIndex;
            guard = 0;
            while (guard++ < 50 && i < pagesRef.current.length - 1) {
                const el = pageRefs.current[i];
                const nextEl = pageRefs.current[i + 1];
                if (!el || !nextEl) break;

                const m = measurePage(el);
                if (m.overflowPx < -15) {
                    const moved = moveUnderflowFromNext(el, nextEl, caret);
                    if (moved) {
                        touched.add(i);
                        touched.add(i + 1);
                    }
                }

                if (
                    isBlankPage(nextEl) &&
                    !nextEl.hasAttribute("data-manual-page") &&
                    pagesRef.current.length > 1
                ) {
                    pagesRef.current.splice(i + 1, 1);
                    pageRefs.current.splice(i + 1, 1);
                    flushSync(() => {
                        setPages([...pagesRef.current]);
                    });
                    setActivePageIndex((prev) =>
                        Math.min(prev, pagesRef.current.length - 1),
                    );
                    continue;
                }

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
        [
            emitChange,
            pageRefs,
            pagesRef,
            setActivePageIndex,
            setOverflowFlag,
            setPages,
            suppressBlurSyncRef,
        ],
    );

    return { reflowFrom };
}
