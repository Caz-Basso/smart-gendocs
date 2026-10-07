import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { useEffect, useRef } from 'react';
import { TagNode } from '@/lib/tiptap-extensions/tag-node';

interface TiTapEditorProps {
    content: string;
    onChange: (content: string) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    onInsertTag?: (slug: string, label: string) => void;
}

export function TiTapEditor({
    content,
    onChange,
    onDragOver,
    onDrop,
    onInsertTag,
}: TiTapEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3, 4, 5, 6],
                },
            }),
            Placeholder.configure({
                placeholder: 'Comece a digitar ou arraste tags aqui...',
            }),
            Typography,
            TagNode,
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none focus:outline-none min-h-[800px]',
            },
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        onDragOver?.(e);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        onDrop?.(e);
    };

    if (!editor) {
        return (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                Carregando editor...
            </div>
        );
    }

    return (
        <div
            ref={editorRef}
            className="relative mx-auto w-full max-w-[210mm] min-h-[297mm] bg-white shadow-lg"
            style={{
                padding: '25mm 20mm',
                minHeight: '297mm',
                width: '210mm',
            }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className="mb-6 border-b border-gray-200 pb-4 text-center">
                <div className="text-sm font-semibold text-gray-700">
                    UNIVERSIDADE DO EXTREMO SUL CATARINENSE - UNESC
                </div>
                <div className="mt-1 text-xs text-gray-500">
                    Documento Institucional
                </div>
            </div>

            <EditorContent editor={editor} />

            <div className="mt-6 border-t border-gray-200 pt-4 text-center">
                <div className="text-xs text-gray-500">
                    Página <span className="page-number">1</span>
                </div>
            </div>
        </div>
    );
}
