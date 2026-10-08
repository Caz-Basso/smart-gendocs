import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    ChevronDown,
    ChevronUp,
    Copy,
    Eye,
    EyeOff,
    FilePlus,
    Indent,
    Italic,
    List,
    ListOrdered,
    Outdent,
    Plus,
    Quote,
    Redo,
    Scissors,
    Sparkles,
    Split,
    Strikethrough,
    Table as TableIcon,
    Trash2,
    Underline,
    Undo,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type DragEvent,
    type RefObject,
} from 'react';
import { Button } from '@/components/ui/button';
import {
    A4_HEIGHT_MM,
    A4_WIDTH_MM,
    extractConfigComment,
    getPageDimensions,
    joinPagesIntoHtml,
    paginateDocument,
    splitHtmlIntoPages,
    stripConfigComment,
} from '@/lib/document-pagination';

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
        label: 'ABNT Oficial (Sup 3cm, Esq 3cm, Dir 2cm, Inf 2cm)',
        margins: { top: 30, left: 30, right: 20, bottom: 20 },
    },
    normal: {
        label: 'Padrão Simétrico (2,5 cm)',
        margins: { top: 25, left: 25, right: 25, bottom: 25 },
    },
    narrow: {
        label: 'Margens Estreitas (1,5 cm)',
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

function parseConfigFromHtml(rawHtml: string) {
    const configMatch = rawHtml.match(/<!--\s*a4-config:\s*([^>]+)\s*-->/);
    if (!configMatch) {
        return {
            margins: { top: 30, left: 30, right: 20, bottom: 20 },
            fontFamily: "'Times New Roman', Times, serif",
            lineHeight: '1.5',
        };
    }

    const str = configMatch[1];
    const top = str.match(/top=(\d+)/)?.[1];
    const left = str.match(/left=(\d+)/)?.[1];
    const right = str.match(/right=(\d+)/)?.[1];
    const bottom = str.match(/bottom=(\d+)/)?.[1];
    const font =
        str.match(/font="([^"]+)"/)?.[1] || "'Times New Roman', Times, serif";
    const lineHeight = str.match(/lineHeight=([0-9.]+)/)?.[1] || '1.5';

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
    const [marginPreset, setMarginPreset] = useState<string>('abnt');
    const [fontFamily, setFontFamily] = useState<string>(
        initialConfig.fontFamily,
    );
    const [lineHeight, setLineHeight] = useState<string>(
        initialConfig.lineHeight,
    );
    const [showVisualGuide, setShowVisualGuide] = useState(true);

    // Páginas do documento
    const [pages, setPages] = useState<string[]>(() => {
        return paginateDocument(html, initialConfig.margins);
    });
    const [activePageIndex, setActivePageIndex] = useState(0);

    // Referências para os nós de conteúdo de cada folha
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    const dimensions = getPageDimensions(margins);

    // Constrói o HTML consolidado e emite para o formulário pai
    const emitChange = useCallback(
        (
            updatedPages: string[],
            curMargins = margins,
            curFont = fontFamily,
            curLineHeight = lineHeight,
        ) => {
            const configComment = `<!-- a4-config: top=${curMargins.top} left=${curMargins.left} right=${curMargins.right} bottom=${curMargins.bottom} font="${curFont}" lineHeight=${curLineHeight} -->`;
            const consolidatedHtml = joinPagesIntoHtml(
                updatedPages,
                configComment,
            );

            // Mantém editorRef sincronizado com o HTML completo do documento
            if (editorRef.current) {
                editorRef.current.innerHTML = consolidatedHtml;
            }

            onChange(consolidatedHtml);
        },
        [margins, fontFamily, lineHeight, onChange, editorRef],
    );

    // Inicializa na primeira carga
    useEffect(() => {
        if (editorRef.current) {
            const configComment = `<!-- a4-config: top=${margins.top} left=${margins.left} right=${margins.right} bottom=${margins.bottom} font="${fontFamily}" lineHeight=${lineHeight} -->`;
            editorRef.current.innerHTML = joinPagesIntoHtml(
                pages,
                configComment,
            );
        }
    }, []);

    // Atualiza conteúdo de uma página específica
    const handlePageInput = (pageIndex: number, newHtml: string) => {
        const nextPages = [...pages];
        nextPages[pageIndex] = newHtml;
        setPages(nextPages);
        emitChange(nextPages);
    };

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
        [activePageIndex, pages],
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
                    ['P', 'H1', 'H2', 'H3', 'DIV', 'LI', 'TD'].includes(
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

            exec('formatBlock', '<p>');
            if (activeNode) {
                handlePageInput(activePageIndex, activeNode.innerHTML);
            }
        },
        [activePageIndex, exec],
    );

    const applyInlineStyle = useCallback(
        (cssProperty: string, value: string) => {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount || selection.isCollapsed)
                return;

            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
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
        [activePageIndex],
    );

    const applyFontFamily = (font: string) => {
        setFontFamily(font);
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
            applyInlineStyle('font-family', font);
        } else {
            applyBlockStyle('font-family', font);
        }
        emitChange(pages, margins, font, lineHeight);
    };

    const applyFontSize = (sizePt: string) => {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
            applyInlineStyle('font-size', sizePt);
        } else {
            applyBlockStyle('font-size', sizePt);
        }
    };

    const applyLineSpacing = (spacing: string) => {
        setLineHeight(spacing);
        applyBlockStyle('line-height', spacing);
        emitChange(pages, margins, fontFamily, spacing);
    };

    const applyFirstLineIndent = () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        let node: Node | null = selection.anchorNode;
        const activeNode = pageRefs.current[activePageIndex];

        while (node && node !== activeNode && node !== document.body) {
            if (
                node instanceof HTMLElement &&
                ['P', 'DIV'].includes(node.tagName)
            ) {
                const current = node.style.textIndent;
                node.style.textIndent = current === '1.25cm' ? '0cm' : '1.25cm';
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
                ['P', 'DIV'].includes(node.tagName)
            ) {
                node.style.marginLeft = '4.0cm';
                node.style.fontSize = '10pt';
                node.style.lineHeight = '1.0';
                node.style.textAlign = 'justify';
                node.style.textIndent = '0cm';
                node.style.marginTop = '8pt';
                node.style.marginBottom = '8pt';
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
            emitChange(pages, nextMargins, fontFamily, lineHeight);
        }
    };

    // Operações de Paginação
    const insertNewBlankPage = (afterIndex = pages.length - 1) => {
        const nextPages = [...pages];
        const newPageHtml =
            '<p style="text-align: justify; line-height: 1.5; font-size: 12pt;"><br/></p>';
        nextPages.splice(afterIndex + 1, 0, newPageHtml);
        setPages(nextPages);
        setActivePageIndex(afterIndex + 1);
        emitChange(nextPages);
    };

    const removePage = (indexToRemove: number) => {
        if (pages.length <= 1) return;
        const nextPages = pages.filter((_, idx) => idx !== indexToRemove);
        setPages(nextPages);
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
            const preDiv = document.createElement('div');
            preDiv.appendChild(preFragment);
            const preHtml = preDiv.innerHTML.trim() || '<p><br/></p>';

            // Elementos após o cursor
            const postRange = document.createRange();
            postRange.selectNodeContents(activeNode);
            postRange.setStart(range.endContainer, range.endOffset);
            const postFragment = postRange.cloneContents();
            const postDiv = document.createElement('div');
            postDiv.appendChild(postFragment);
            const postHtml = postDiv.innerHTML.trim() || '<p><br/></p>';

            const nextPages = [...pages];
            nextPages[activePageIndex] = preHtml;
            nextPages.splice(activePageIndex + 1, 0, postHtml);
            setPages(nextPages);
            setActivePageIndex(activePageIndex + 1);
            emitChange(nextPages);
        } catch {
            insertNewBlankPage(activePageIndex);
        }
    };

    // Auto-paginação completa de todo o documento
    const handleAutoPaginate = () => {
        const consolidated = joinPagesIntoHtml(pages);
        const repaginated = paginateDocument(consolidated, margins);
        setPages(repaginated);
        setActivePageIndex(0);
        emitChange(repaginated);
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
            const nextPages = [...pages];
            nextPages[activePageIndex] = headerHtml + activeNode.innerHTML;
            setPages(nextPages);
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
            const nextPages = [...pages];
            nextPages[activePageIndex] = activeNode.innerHTML + footerHtml;
            setPages(nextPages);
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
        exec('insertHTML', tableHtml);
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

                    {/* Indicador de Página Ativa */}
                    <div className="flex items-center gap-1 rounded bg-muted/60 px-2 py-1 text-xs font-semibold text-foreground">
                        <span>
                            Página {activePageIndex + 1} de {pages.length}
                        </span>
                    </div>

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
                        <option value="10pt">10pt (Citações / Notas ABNT)</option>
                        <option value="11pt">11pt (Tabelas)</option>
                        <option value="12pt">12pt (Corpo Oficial ABNT)</option>
                        <option value="14pt">14pt (Subtítulo)</option>
                        <option value="16pt">16pt (Título Principal)</option>
                        <option value="18pt">18pt (Cabeçalho Institucional)</option>
                    </select>

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
                        title="Justificar (Padrão Oficial ABNT)"
                        onClick={() => exec('justifyFull')}
                    >
                        <AlignJustify className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                    </Button>
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
                            <option value="1.5">1.5 (Padrão ABNT Oficial)</option>
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
                        onClick={() => exec('outdent')}
                    >
                        <Outdent className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        title="Aumentar Recuo"
                        onClick={() => exec('indent')}
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
                        variant={showVisualGuide ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title={
                            showVisualGuide
                                ? 'Ocultar Guia Visual de Área Útil'
                                : 'Exibir Guia Visual de Área Útil'
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

                    {/* Botão de Auto-Paginar */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50"
                        title="Distribuir conteúdo automaticamente no limite de altura da folha A4"
                        onClick={handleAutoPaginate}
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Auto-paginar
                    </Button>

                    <div className="mx-1 h-5 w-px bg-border/80" />

                    {/* Elementos */}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="Inserir Cabeçalho Institucional"
                        onClick={insertHeader}
                    >
                        + Cabeçalho
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        title="Inserir Rodapé Oficial"
                        onClick={insertFooter}
                    >
                        + Rodapé
                    </Button>
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

                {/* Régua de Informações da Folha A4 */}
                <div className="flex flex-wrap items-center justify-between border-t border-border/40 pt-1 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">
                            Folha A4 Oficial (210 × 297 mm) • Total:{' '}
                            {pages.length} {pages.length === 1 ? 'página' : 'páginas'}
                        </span>
                        <span>
                            Margens: Sup {(margins.top / 10).toFixed(1)}cm • Esq{' '}
                            {(margins.left / 10).toFixed(1)}cm • Dir{' '}
                            {(margins.right / 10).toFixed(1)}cm • Inf{' '}
                            {(margins.bottom / 10).toFixed(1)}cm
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-foreground">
                            Área Útil: {(dimensions.usableWidthMm / 10).toFixed(1)}{' '}
                            × {(dimensions.usableHeightMm / 10).toFixed(1)} cm
                        </span>
                    </div>
                </div>
            </div>

            {/* Mesa de Trabalho (Desk) Contendo as Folhas A4 Independentes */}
            <div className="flex w-full flex-col items-center gap-8 overflow-x-auto rounded-lg bg-slate-100 p-4 shadow-inner dark:bg-slate-900/60 sm:p-8">
                {pages.map((pageHtml, index) => {
                    const pageNumber = index + 1;
                    const isLastPage = index === pages.length - 1;

                    return (
                        <div
                            key={index}
                            className="flex flex-col items-center transition-all"
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
                                className="relative shrink-0 border border-slate-300 bg-white text-gray-900 shadow-2xl transition-all select-text dark:border-slate-700"
                                style={{
                                    width: `${A4_WIDTH_MM}mm`,
                                    height: `${A4_HEIGHT_MM}mm`,
                                    maxWidth: '100%',
                                    boxSizing: 'border-box',
                                    position: 'relative',
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
                                    onDragOver={onDragOver}
                                    onDrop={onDrop}
                                    style={{
                                        paddingTop: `${margins.top}mm`,
                                        paddingLeft: `${margins.left}mm`,
                                        paddingRight: `${margins.right}mm`,
                                        paddingBottom: `${margins.bottom}mm`,
                                        fontFamily,
                                        fontSize: '12pt',
                                        lineHeight,
                                        textAlign: 'justify',
                                        width: '100%',
                                        height: '100%',
                                        maxHeight: `${A4_HEIGHT_MM}mm`,
                                        overflow: 'auto',
                                        boxSizing: 'border-box',
                                    }}
                                    className="a4-page-content text-[12pt] text-gray-900 outline-none select-text focus:outline-none [&_.document-footer]:mt-6 [&_.document-footer]:border-t [&_.document-footer]:border-slate-300 [&_.document-footer]:pt-2 [&_.document-footer]:text-center [&_.document-footer]:text-[9pt] [&_.document-footer]:text-slate-500 [&_.document-header]:mb-5 [&_.document-header]:border-b [&_.document-header]:border-slate-300 [&_.document-header]:pb-2 [&_.document-header]:text-center [&_.document-header]:text-[10.5pt] [&_h1]:my-4 [&_h1]:text-center [&_h1]:text-[17pt] [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-[14pt] [&_h2]:font-bold [&_h3]:my-2 [&_h3]:text-[12pt] [&_h3]:font-bold [&_img]:my-3 [&_img]:inline-block [&_p]:my-1.5 [&_table]:my-3.5"
                                />

                                {/* Rodapé com Número da Página Oficial */}
                                <div
                                    className="pointer-events-none absolute bottom-2 right-4 text-[10px] text-slate-400"
                                    aria-hidden="true"
                                >
                                    Página {pageNumber} de {pages.length}
                                </div>
                            </div>

                            {/* Separador Visual de Quebra de Página entre as Folhas A4 */}
                            {!isLastPage && (
                                <div className="my-6 flex w-[210mm] max-w-full items-center justify-center gap-3">
                                    <div className="h-px flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-700" />
                                    <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        <Scissors className="h-3 w-3 text-sky-600" />
                                        <span>
                                            QUEBRA DE PÁGINA • Página {pageNumber}{' '}
                                            para {pageNumber + 1}
                                        </span>
                                    </div>
                                    <div className="h-px flex-1 border-t-2 border-dashed border-slate-300 dark:border-slate-700" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
