import type { DragEvent, RefObject } from 'react';

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

/**
 * Arrastar `{{tag}}` do painel de campos para dentro do editor.
 * `onInserted` recebe o nó de texto criado, para a página decidir
 * o que sincronizar (HTML do editor ou estrutura do PDF).
 */
export function useTagDrop(
    editorRef: RefObject<HTMLDivElement | null>,
    onInserted: (node: Text) => void,
) {
    const handleDragStart = (event: DragEvent<HTMLElement>, slug: string) => {
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

        const editor = editorRef.current;
        const text = event.dataTransfer.getData('text/plain');

        if (!editor || !text) return;

        const range = getCaretRange(event);

        if (!range || !editor.contains(range.commonAncestorContainer)) return;

        const node = document.createTextNode(text);

        range.deleteContents();
        range.insertNode(node);

        const cursor = document.createRange();

        cursor.setStartAfter(node);
        cursor.collapse(true);

        const selection = window.getSelection();

        selection?.removeAllRanges();
        selection?.addRange(cursor);

        onInserted(node);
    };

    return { handleDragStart, handleDragOver, handleDrop };
}
