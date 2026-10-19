import type { DragEvent } from 'react';

function getCaretRange(event: DragEvent<HTMLElement>): Range | null {
    const { clientX, clientY } = event;

    if (typeof document.caretRangeFromPoint === 'function') {
        return document.caretRangeFromPoint(clientX, clientY);
    }

    if (typeof document.caretPositionFromPoint === 'function') {
        const position = document.caretPositionFromPoint(clientX, clientY);

        if (!position) return null;

        const range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);

        return range;
    }

    return null;
}

export function useTagDrop(
    onInserted: (node: Text) => void,
) {
    const handleDragStart = (
        event: DragEvent<HTMLElement>,
        slug: string,
    ) => {
        if (!slug) return;

        event.dataTransfer.setData('text/plain', `{{${slug}}}`);
        event.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (event: DragEvent<HTMLElement>) => {
        event.preventDefault();

        const editor = event.currentTarget;
        const text = event.dataTransfer.getData('text/plain');

        if (!text || !editor.isContentEditable) return;

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

        // Atualiza a estrutura do PDF, quando aplicável.
        onInserted(node);

        // Notifica o editor para sincronizar o HTML e a paginação.
        editor.dispatchEvent(
            new Event('input', { bubbles: true }),
        );
    };

    return { handleDragStart, handleDragOver, handleDrop };
}