import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    ChevronLeft,
    ChevronRight,
    Eye,
    EyeOff,
    Indent,
    Italic,
    MoreHorizontal,
    Plus,
    Quote,
    Redo,
    Scissors,
    Strikethrough,
    Table as TableIcon,
    Underline,
    Undo,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToolbarSeparator } from "./toolbar-separator";
import type { MarginPresetKey } from "../utils/editor-config";

interface EditorToolbarProps {
    activePageIndex: number;
    pagesCount: number;
    fontFamily: string;
    lineHeight: string;
    marginPreset: MarginPresetKey;
    showMoreTools: boolean;
    showVisualGuide: boolean;
    activeStates: {
        bold: boolean;
        italic: boolean;
        underline: boolean;
        strikeThrough: boolean;
        alignLeft: boolean;
        alignCenter: boolean;
        alignRight: boolean;
        alignJustify: boolean;
    };

    saveSelection: () => void;
    exec: (command: string) => void;
    goToPreviousPage: () => void;
    goToNextPage: () => void;
    applyFontFamily: (font: string) => void;
    applyFontSize: (size: string) => void;
    applyLineSpacing: (lineHeight: string) => void;
    applyFirstLineIndent: () => void;
    formatAsLongCitation: () => void;
    insertTable: () => void;
    handleMarginPresetChange: (preset: MarginPresetKey) => void;
    setShowMoreTools: (show: boolean) => void;
    setShowVisualGuide: (show: boolean) => void;
    insertPageBreakAtCursor: () => void;
    insertNewBlankPage: (pageIndex: number) => void;
}

const TOOLBAR_SELECT_CLASS =
    "h-8 rounded-md border border-border bg-background px-2 text-xs";

export function EditorToolbar({
    activePageIndex,
    pagesCount,
    fontFamily,
    lineHeight,
    marginPreset,
    showMoreTools,
    showVisualGuide,
    activeStates,
    saveSelection,
    exec,
    goToPreviousPage,
    goToNextPage,
    applyFontFamily,
    applyFontSize,
    applyLineSpacing,
    applyFirstLineIndent,
    formatAsLongCitation,
    insertTable,
    handleMarginPresetChange,
    setShowMoreTools,
    setShowVisualGuide,
    insertPageBreakAtCursor,
    insertNewBlankPage,
}: EditorToolbarProps) {
    return (
        <div
            role="toolbar"
            aria-label="Ferramentas do editor de documentos"
            className="sticky top-2 z-30 mb-6 flex w-full max-w-[980px] flex-col rounded-xl border border-border/80 bg-background/95 px-3 py-1.5  backdrop-blur-md"
        >
            <div className="flex min-w-0 items-center justify-between gap-1 overflow-x-auto py-0.5">
                <div className="flex items-center gap-0.5">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-muted"
                        title="Desfazer (Ctrl+Z)"
                        aria-label="Desfazer"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            saveSelection();
                        }}
                        onClick={() => exec("undo")}
                    >
                        <Undo className="h-4 w-4 text-muted-foreground" />
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-muted"
                        title="Refazer (Ctrl+Y)"
                        aria-label="Refazer"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            saveSelection();
                        }}
                        onClick={() => exec("redo")}
                    >
                        <Redo className="h-4 w-4 text-muted-foreground" />
                    </Button>

                    <ToolbarSeparator />

                    <div className="flex items-center gap-1 px-1 text-xs text-muted-foreground">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full hover:bg-muted"
                            title="Página anterior"
                            aria-label="Página anterior"
                            disabled={activePageIndex === 0}
                            onClick={goToPreviousPage}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="whitespace-nowrap px-1 font-medium text-foreground text-xs">
                            Página {activePageIndex + 1} / {pagesCount}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full hover:bg-muted"
                            title="Próxima página"
                            aria-label="Próxima página"
                            disabled={activePageIndex >= pagesCount - 1}
                            onClick={goToNextPage}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <ToolbarSeparator />

                    <select
                        value={fontFamily}
                        onMouseDown={saveSelection}
                        onChange={(e) => applyFontFamily(e.target.value)}
                        title="Família da fonte"
                        aria-label="Família da fonte"
                        className={`${TOOLBAR_SELECT_CLASS} w-32`}
                    >
                        <option value="'Times New Roman', Times, serif">
                            Times New Roman
                        </option>
                        <option value="Arial, Helvetica, sans-serif">
                            Arial
                        </option>
                        <option value="Calibri, sans-serif">Calibri</option>
                        <option value="Georgia, serif">Georgia</option>
                    </select>

                    <select
                        defaultValue="12pt"
                        onMouseDown={saveSelection}
                        onChange={(e) => applyFontSize(e.target.value)}
                        title="Tamanho da fonte"
                        aria-label="Tamanho da fonte"
                        className={`${TOOLBAR_SELECT_CLASS} w-16 text-center`}
                    >
                        <option value="10pt">10</option>
                        <option value="11pt">11</option>
                        <option value="12pt">12</option>
                        <option value="14pt">14</option>
                        <option value="16pt">16</option>
                        <option value="18pt">18</option>
                    </select>

                    <ToolbarSeparator />

                    <Button
                        type="button"
                        variant={activeStates.bold ? "secondary" : "ghost"}
                        size="icon"
                        className={`h-8 w-8 rounded-md transition-colors ${
                            activeStates.bold
                                ? "bg-accent text-accent-foreground font-bold shadow-sm"
                                : "hover:bg-muted text-muted-foreground"
                        }`}
                        title="Negrito (Ctrl+B)"
                        aria-label="Negrito"
                        aria-pressed={activeStates.bold}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            saveSelection();
                        }}
                        onClick={() => exec("bold")}
                    >
                        <Bold className="h-4 w-4" />
                    </Button>

                    <Button
                        type="button"
                        variant={activeStates.italic ? "secondary" : "ghost"}
                        size="icon"
                        className={`h-8 w-8 rounded-md transition-colors ${
                            activeStates.italic
                                ? "bg-accent text-accent-foreground shadow-sm"
                                : "hover:bg-muted text-muted-foreground"
                        }`}
                        title="Itálico (Ctrl+I)"
                        aria-label="Itálico"
                        aria-pressed={activeStates.italic}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            saveSelection();
                        }}
                        onClick={() => exec("italic")}
                    >
                        <Italic className="h-4 w-4" />
                    </Button>

                    <Button
                        type="button"
                        variant={activeStates.underline ? "secondary" : "ghost"}
                        size="icon"
                        className={`h-8 w-8 rounded-md transition-colors ${
                            activeStates.underline
                                ? "bg-accent text-accent-foreground shadow-sm"
                                : "hover:bg-muted text-muted-foreground"
                        }`}
                        title="Sublinhado (Ctrl+U)"
                        aria-label="Sublinhado"
                        aria-pressed={activeStates.underline}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            saveSelection();
                        }}
                        onClick={() => exec("underline")}
                    >
                        <Underline className="h-4 w-4" />
                    </Button>

                    <Button
                        type="button"
                        variant={
                            activeStates.strikeThrough ? "secondary" : "ghost"
                        }
                        size="icon"
                        className={`h-8 w-8 rounded-md transition-colors ${
                            activeStates.strikeThrough
                                ? "bg-accent text-accent-foreground shadow-sm"
                                : "hover:bg-muted text-muted-foreground"
                        }`}
                        title="Tachado"
                        aria-label="Tachado"
                        aria-pressed={activeStates.strikeThrough}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            saveSelection();
                        }}
                        onClick={() => exec("strikeThrough")}
                    >
                        <Strikethrough className="h-4 w-4" />
                    </Button>

                    <ToolbarSeparator />

                    <Button
                        type="button"
                        variant={activeStates.alignLeft ? "secondary" : "ghost"}
                        size="icon"
                        className={`h-8 w-8 rounded-md transition-colors ${
                            activeStates.alignLeft
                                ? "bg-accent text-accent-foreground shadow-sm"
                                : "hover:bg-muted text-muted-foreground"
                        }`}
                        title="Alinhar à esquerda"
                        aria-label="Alinhar à esquerda"
                        aria-pressed={activeStates.alignLeft}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            saveSelection();
                        }}
                        onClick={() => exec("justifyLeft")}
                    >
                        <AlignLeft className="h-4 w-4" />
                    </Button>

                    <Button
                        type="button"
                        variant={
                            activeStates.alignCenter ? "secondary" : "ghost"
                        }
                        size="icon"
                        className={`h-8 w-8 rounded-md transition-colors ${
                            activeStates.alignCenter
                                ? "bg-accent text-accent-foreground shadow-sm"
                                : "hover:bg-muted text-muted-foreground"
                        }`}
                        title="Centralizar"
                        aria-label="Centralizar"
                        aria-pressed={activeStates.alignCenter}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            saveSelection();
                        }}
                        onClick={() => exec("justifyCenter")}
                    >
                        <AlignCenter className="h-4 w-4" />
                    </Button>

                    <Button
                        type="button"
                        variant={
                            activeStates.alignRight ? "secondary" : "ghost"
                        }
                        size="icon"
                        className={`h-8 w-8 rounded-md transition-colors ${
                            activeStates.alignRight
                                ? "bg-accent text-accent-foreground shadow-sm"
                                : "hover:bg-muted text-muted-foreground"
                        }`}
                        title="Alinhar à direita"
                        aria-label="Alinhar à direita"
                        aria-pressed={activeStates.alignRight}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            saveSelection();
                        }}
                        onClick={() => exec("justifyRight")}
                    >
                        <AlignRight className="h-4 w-4" />
                    </Button>

                    <Button
                        type="button"
                        variant={
                            activeStates.alignJustify ? "secondary" : "ghost"
                        }
                        size="icon"
                        className={`h-8 w-8 rounded-md transition-colors ${
                            activeStates.alignJustify
                                ? "bg-accent text-accent-foreground shadow-sm"
                                : "hover:bg-muted text-muted-foreground"
                        }`}
                        title="Justificar"
                        aria-label="Justificar"
                        aria-pressed={activeStates.alignJustify}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            saveSelection();
                        }}
                        onClick={() => exec("justifyFull")}
                    >
                        <AlignJustify className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-1 pl-1">
                    <ToolbarSeparator />
                    <Button
                        type="button"
                        variant={showMoreTools ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-muted"
                        title="Mais opções de formatação"
                        aria-label="Mais opções de formatação"
                        aria-expanded={showMoreTools}
                        onClick={() => setShowMoreTools(!showMoreTools)}
                    >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </div>
            </div>

            {showMoreTools && (
                <div
                    className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2 text-xs"
                    aria-label="Ferramentas secundárias"
                >
                    <div className="flex flex-wrap items-center gap-1.5">
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground font-medium">
                                Entrelinhas:
                            </span>
                            <select
                                value={lineHeight}
                                onChange={(e) =>
                                    applyLineSpacing(e.target.value)
                                }
                                className={`${TOOLBAR_SELECT_CLASS} w-16`}
                                title="Espaçamento entre linhas"
                            >
                                <option value="1.0">1,0</option>
                                <option value="1.15">1,15</option>
                                <option value="1.5">1,5</option>
                                <option value="2.0">2,0</option>
                            </select>
                        </div>

                        <ToolbarSeparator />

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            title="Recuo de primeira linha de 1,25 cm"
                            onClick={applyFirstLineIndent}
                        >
                            <Indent className="h-3.5 w-3.5 mr-1" />
                            Recuo 1,25 cm
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            title="Formatar citação longa (ABNT)"
                            onClick={formatAsLongCitation}
                        >
                            <Quote className="h-3.5 w-3.5 mr-1" />
                            Citação 4 cm
                        </Button>

                        <ToolbarSeparator />

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            title="Inserir tabela formatada"
                            onClick={insertTable}
                        >
                            <TableIcon className="h-3.5 w-3.5 mr-1" />
                            Tabela
                        </Button>

                        <select
                            value={marginPreset}
                            onChange={(e) => {
                                const value = e.target.value;

                                if (
                                    value === "abnt" ||
                                    value === "normal" ||
                                    value === "narrow"
                                ) {
                                    handleMarginPresetChange(value);
                                }
                            }}
                            className={`${TOOLBAR_SELECT_CLASS} w-36`}
                            title="Margens do documento"
                        >
                            <option value="abnt">ABNT Oficial</option>
                            <option value="normal">Padrão (2,5 cm)</option>
                            <option value="narrow">Estreita (1,5 cm)</option>
                        </select>

                        <Button
                            type="button"
                            variant={showVisualGuide ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 px-2 text-xs"
                            title={
                                showVisualGuide
                                    ? "Ocultar guia de margem"
                                    : "Exibir guia de margem"
                            }
                            onClick={() => setShowVisualGuide(!showVisualGuide)}
                        >
                            {showVisualGuide ? (
                                <Eye className="h-3.5 w-3.5 mr-1 text-sky-600" />
                            ) : (
                                <EyeOff className="h-3.5 w-3.5 mr-1" />
                            )}
                            Guia útil
                        </Button>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            title="Quebrar página no cursor"
                            onClick={insertPageBreakAtCursor}
                        >
                            <Scissors className="h-3.5 w-3.5 mr-1" />
                            Quebra
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-primary"
                            title="Adicionar nova página ao final"
                            onClick={() => insertNewBlankPage(activePageIndex)}
                        >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Nova folha
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
