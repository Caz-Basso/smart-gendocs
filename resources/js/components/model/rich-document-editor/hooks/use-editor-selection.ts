import { useCallback, useRef } from "react";

interface UseEditorSelectionOptions {
    pageRefs: React.RefObject<(HTMLDivElement | null)[]>;
    activePageIndex: number;
}

export function useEditorSelection({
    pageRefs,
    activePageIndex,
}: UseEditorSelectionOptions) {
    const savedRangeRef = useRef<Range | null>(null);

    const saveSelection = useCallback(() => {
        const selection = window.getSelection();

        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const activePage = pageRefs.current[activePageIndex];

        if (
            activePage &&
            activePage.contains(range.commonAncestorContainer)
        ) {
            savedRangeRef.current = range.cloneRange();
        }
    }, [activePageIndex, pageRefs]);

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
    }, [activePageIndex, pageRefs]);

    return {
        saveSelection,
        restoreSelection,
    };
}