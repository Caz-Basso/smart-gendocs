import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    Heading1,
    Heading2,
    Heading3,
    Italic,
    List,
    ListOrdered,
    Redo,
    Strikethrough,
    Table as TableIcon,
    Underline,
    Undo,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useRef,
    type DragEvent,
    type RefObject,
} from 'react';
import { Button } from '@/components/ui/button';

interface RichDocumentEditorProps {
    editorRef: RefObject<HTMLDivElement | null>;
    html: string;
    onChange: (html: string) => void;
    onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
    onDrop?: (event: DragEvent<HTMLDivElement>) => void;
}

export function RichDocumentEditor({
    editorRef,
    html,
    onChange,
    onDragOver,
    onDrop,
}: RichDocumentEditorProps) {
    const isFirstLoad = useRef(true);

    // Inicializa o conteúdo apenas na carga inicial para preservar o cursor
    useEffect(() => {
        if (editorRef.current && isFirstLoad.current) {
            editorRef.current.innerHTML =
                html || '<p>Digite o conteúdo do seu documento aqui...</p>';
            isFirstLoad.current = false;
        }
    }, [html, editorRef]);

    const exec = useCallback(
        (command: string, value: string | undefined = undefined) => {
            document.execCommand(command, false, value);
            if (editorRef.current) {
                onChange(editorRef.current.innerHTML);
            }
        },
        [editorRef, onChange],
    );

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const insertTable = () => {
        const tableHtml = `
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 11pt;">
                <tbody>
                    <tr>
                        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Item</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Descrição</td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">01</td>
                        <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">Detalhes do serviço contratado</td>
                    </tr>
                </tbody>
            </table>
        `;
        exec('insertHTML', tableHtml);
    };

    const insertPageBreak = () => {
        const breakHtml =
            '<hr class="page-break" style="margin: 30px 0; border: none; border-top: 2px dashed #94a3b8;" />';
        exec('insertHTML', breakHtml);
    };

    return (
        <div className="flex w-full flex-col items-center">
            {/* Barra de Ferramentas Estilo Processador de Texto */}
            <div className="sticky top-2 z-20 mb-4 flex w-full max-w-[850px] flex-wrap items-center gap-1 rounded-lg border border-border/80 bg-background/95 p-1.5 shadow-sm backdrop-blur-md">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Desfazer"
                    onClick={() => exec('undo')}
                >
                    <Undo className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Refazer"
                    onClick={() => exec('redo')}
                >
                    <Redo className="h-4 w-4" />
                </Button>

                <div className="mx-1 h-5 w-px bg-border/80" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 font-bold"
                    title="Título 1"
                    onClick={() => exec('formatBlock', '<h1>')}
                >
                    <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 font-bold"
                    title="Título 2"
                    onClick={() => exec('formatBlock', '<h2>')}
                >
                    <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 font-bold"
                    title="Título 3"
                    onClick={() => exec('formatBlock', '<h3>')}
                >
                    <Heading3 className="h-4 w-4" />
                </Button>

                <div className="mx-1 h-5 w-px bg-border/80" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 font-bold"
                    title="Negrito"
                    onClick={() => exec('bold')}
                >
                    <Bold className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 italic"
                    title="Itálico"
                    onClick={() => exec('italic')}
                >
                    <Italic className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 underline"
                    title="Sublinhado"
                    onClick={() => exec('underline')}
                >
                    <Underline className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 line-through"
                    title="Tachado"
                    onClick={() => exec('strikeThrough')}
                >
                    <Strikethrough className="h-4 w-4" />
                </Button>

                <div className="mx-1 h-5 w-px bg-border/80" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Alinhar à Esquerda"
                    onClick={() => exec('justifyLeft')}
                >
                    <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Centralizar"
                    onClick={() => exec('justifyCenter')}
                >
                    <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Alinhar à Direita"
                    onClick={() => exec('justifyRight')}
                >
                    <AlignRight className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Justificar"
                    onClick={() => exec('justifyFull')}
                >
                    <AlignJustify className="h-4 w-4" />
                </Button>

                <div className="mx-1 h-5 w-px bg-border/80" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Lista com Marcadores"
                    onClick={() => exec('insertUnorderedList')}
                >
                    <List className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    title="Lista Numerada"
                    onClick={() => exec('insertOrderedList')}
                >
                    <ListOrdered className="h-4 w-4" />
                </Button>

                <div className="mx-1 h-5 w-px bg-border/80" />

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    title="Inserir Tabela"
                    onClick={insertTable}
                >
                    <TableIcon className="mr-1 h-3.5 w-3.5" />
                    Tabela
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    title="Inserir Quebra de Página"
                    onClick={insertPageBreak}
                >
                    Quebra de Página
                </Button>
            </div>

            {/* Folha A4 Contínua com Reflow */}
            <div className="relative mx-auto w-full max-w-[850px] overflow-hidden rounded-sm border border-border/80 bg-white shadow-2xl transition-all">
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    className="min-h-[1050px] w-full px-[56px] py-[48px] font-serif text-[12pt] leading-[1.7] text-gray-900 outline-none select-text focus:outline-none [&_.page-break]:my-8 [&_.page-break]:border-t-2 [&_.page-break]:border-dashed [&_.page-break]:border-slate-300 [&_h1]:my-4 [&_h1]:text-center [&_h1]:text-[18pt] [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-[15pt] [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-[13pt] [&_h3]:font-bold [&_img]:my-3 [&_img]:inline-block [&_p]:my-2 [&_table]:my-4"
                />
            </div>
        </div>
    );
}
