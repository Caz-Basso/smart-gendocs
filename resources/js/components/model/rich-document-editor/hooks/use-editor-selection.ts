
import { useCallback, useRef } from "react";

interface UseEditorSelectionOptions {
    pageRefs: {
        current: (HTMLDivElement | null)[];
    };
    activePageIndex: number;
}

interface SavedSelection {
    range: Range;
    pageIndex: number;
    startOffset: number;
    endOffset: number;
    collapsed: boolean;
}

function getTextOffset(root: HTMLElement, container: Node, offset: number) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let total = 0;
    let node: Node | null;

    while ((node = walker.nextNode())) {
        if (node === container) {
            return total + offset;
        }

        total += node.textContent?.length ?? 0;
    }

    if (container === root) {
        const range = document.createRange();
        range.selectNodeContents(root);
        range.setEnd(root, Math.min(offset, root.childNodes.length));
        return range.toString().length;
    }

    return total;
}

function getTextPosition(root: HTMLElement, targetOffset: number) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let remaining = targetOffset;
    let node: Node | null;
    let lastTextNode: Node | null = null;

    while ((node = walker.nextNode())) {
        lastTextNode = node;
        const length = node.textContent?.length ?? 0;

        if (remaining <= length) {
            return { node, offset: remaining };
        }

        remaining -= length;
    }

    if (lastTextNode) {
        return {
            node: lastTextNode,
            offset: lastTextNode.textContent?.length ?? 0,
        };
    }

    return null;
}

export function useEditorSelection({
    pageRefs,
    activePageIndex,
}: UseEditorSelectionOptions) {
    const savedRangeRef = useRef<SavedSelection | null>(null);

    const saveSelection = useCallback(() => {
        const selection = window.getSelection();
        const activePage = pageRefs.current[activePageIndex];

        if (!selection?.rangeCount || !activePage) return;

        const range = selection.getRangeAt(0);

        if (
            !activePage.contains(range.startContainer) ||
            !activePage.contains(range.endContainer)
        ) {
            return;
        }

        savedRangeRef.current = {
            range: range.cloneRange(),
            pageIndex: activePageIndex,
            startOffset: getTextOffset(
                activePage,
                range.startContainer,
                range.startOffset,
            ),
            endOffset: getTextOffset(
                activePage,
                range.endContainer,
                range.endOffset,
            ),
            collapsed: range.collapsed,
        };
    }, [activePageIndex, pageRefs]);

    const restoreSelection = useCallback(() => {
        const saved = savedRangeRef.current;
        if (!saved) return;

        const page = pageRefs.current[saved.pageIndex];
        if (!page) return;

        try {
            const selection = window.getSelection();
            if (!selection) return;

            let range: Range;

            const originalRangeIsValid =
                saved.range.startContainer.isConnected &&
                saved.range.endContainer.isConnected &&
                page.contains(saved.range.startContainer) &&
                page.contains(saved.range.endContainer);

            if (originalRangeIsValid) {
                range = saved.range.cloneRange();
            } else {
                const start = getTextPosition(page, saved.startOffset);
                const end = getTextPosition(page, saved.endOffset);

                if (!start || !end) return;

                range = document.createRange();
                range.setStart(start.node, start.offset);
                range.setEnd(
                    end.node,
                    saved.collapsed ? start.offset : end.offset,
                );
            }

            selection.removeAllRanges();
            selection.addRange(range);
        } catch {
        }
    }, [pageRefs]);

    return { saveSelection, restoreSelection };
}
