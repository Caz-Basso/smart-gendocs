import type { DragEvent, RefObject } from 'react';

interface HtmlEditorProps {
    editorRef: RefObject<HTMLDivElement | null>;
    /** HTML inicial. Depois disso o DOM é a fonte da verdade (use `key` para recarregar). */
    html: string;
    onChange: (html: string) => void;
    onDragOver: (event: DragEvent<HTMLDivElement>) => void;
    onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

export function HtmlEditor({
    editorRef,
    html,
    onChange,
    onDragOver,
    onDrop,
}: HtmlEditorProps) {
    return (
        <div className="min-h-[841px] w-full px-[48px] py-[42px] text-gray-900">
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(event) => onChange(event.currentTarget.innerHTML)}
                onDragOver={onDragOver}
                onDrop={onDrop}
                className="document-editor min-h-[750px] w-full font-sans text-[13px] leading-[1.7] text-[#333] outline-none focus:outline-none"
                dangerouslySetInnerHTML={{
                    __html:
                        html ||
                        '<p>Digite ou cole o texto do seu modelo diretamente aqui...</p>',
                }}
            />
        </div>
    );
}
