import { countWords, sliceWords } from "@/lib/document-pagination";

import type { CaretPos, PageMetrics } from "../types";

const SPLITTABLE_TAGS = new Set(["P", "DIV", "H1", "H2", "H3"]);

export const BLANK_PAGE_HTML =
    '<p style="text-align: justify; line-height: 1.5; font-size: 12pt;"><br/></p>';

export function measurePage(el: HTMLElement): PageMetrics {
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
    const last = el.lastElementChild as HTMLElement | null;
    const lastBottom = last ? last.getBoundingClientRect().bottom : 0;
    const contentBottom =
        Math.max(contentRect.bottom, lastBottom) + el.scrollTop;
    const contentTop = boxRect.top + padTop;
    const contentHeight = Math.max(0, contentBottom - contentTop);

    return {
        usableHeight,
        contentHeight,
        overflowPx: contentHeight - usableHeight,
    };
}

export function hasPageOverflow(element: HTMLElement): boolean {
    return measurePage(element).overflowPx > 1;
}

export function isBlankPage(el: HTMLElement): boolean {
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

export function moveOverflowToNext(
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

function splitBlockToFit(
    block: HTMLElement,
    targetPage: HTMLElement,
    caret: CaretPos | null,
): HTMLElement | null {
    const totalWords = countWords(block);
    if (totalWords <= 1) return null;

    let lo = 1;
    let hi = totalWords - 1;
    let bestK = 0;

    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const slice = sliceWords(block, 0, mid);
        targetPage.appendChild(slice);
        const fits = !hasPageOverflow(targetPage);
        targetPage.removeChild(slice);

        if (fits) {
            bestK = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    if (bestK <= 0) return null;

    const caretOffset =
        caret && block.contains(caret.node)
            ? charOffsetOf(block, caret.node, caret.offset)
            : -1;

    const head = sliceWords(block, 0, bestK);
    const tail = sliceWords(block, bestK, Infinity);

    block.replaceChildren(...Array.from(tail.childNodes));
    block.style.textIndent = "0cm";

    if (caret && caretOffset >= 0) {
        const headCharLen = (head.textContent || "").length;
        if (caretOffset < headCharLen) {
            const np = resolveTextPosition(head, caretOffset);
            caret.node = np.node;
            caret.offset = np.offset;
        } else {
            const np = resolveTextPosition(
                block,
                Math.max(0, caretOffset - headCharLen),
            );
            caret.node = np.node;
            caret.offset = np.offset;
        }
    }

    return head as HTMLElement;
}

export function moveUnderflowFromNext(
    el: HTMLElement,
    nextEl: HTMLElement,
    caret: CaretPos | null,
): boolean {
    if (isBlankPage(nextEl)) return false;

    if (
        el.querySelector('[data-manual-break="true"], .manual-page-break') ||
        nextEl.querySelector(
            '[data-manual-break="true"], .manual-page-break',
        ) ||
        nextEl.hasAttribute("data-manual-page")
    ) {
        return false;
    }

    let movedAny = false;
    let guard = 0;

    while (guard++ < 500) {
        el.scrollTop = 0;
        nextEl.scrollTop = 0;

        const m = measurePage(el);
        if (m.overflowPx > -15) break;

        while (
            nextEl.firstChild &&
            nextEl.firstChild.nodeType === Node.TEXT_NODE &&
            (nextEl.firstChild.textContent || "").trim() === ""
        ) {
            nextEl.removeChild(nextEl.firstChild);
        }

        const first = nextEl.firstElementChild;
        if (!first || !(first instanceof HTMLElement)) break;

        el.appendChild(first);
        const fitsEntirely = !hasPageOverflow(el);

        if (fitsEntirely) {
            movedAny = true;
            continue;
        }

        el.removeChild(first);
        nextEl.insertBefore(first, nextEl.firstChild);

        if (SPLITTABLE_TAGS.has(first.tagName)) {
            const head = splitBlockToFit(first, el, caret);
            if (head && (head.textContent || "").trim().length > 0) {
                el.appendChild(head);
                movedAny = true;
            }
        }

        break;
    }

    return movedAny;
}
