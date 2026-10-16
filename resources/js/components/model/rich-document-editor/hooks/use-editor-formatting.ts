import { useCallback } from "react";

interface UseEditorFormattingOptions {
    pageRefs: { current: (HTMLDivElement | null)[] };
    activePageIndex: number;
    margins: DocumentMargins;
    fontFamily: string;

    restoreSelection: () => void;
    saveSelection: () => void;
    handlePageInput: (pageIndex: number, html: string) => void;
    updateActiveStates: () => void;
    setFontFamily: (font: string) => void;
    setLineHeight: (spacing: string) => void;
    reflowFrom: (pageIndex: number) => void;
    repaginateAll: (
        margins: DocumentMargins,
        fontFamily: string,
        lineHeight: string,
    ) => void;
}

import type { DocumentMargins } from "../utils/editor-config";

export function useEditorFormatting({
    pageRefs,
    activePageIndex,
    margins,
    fontFamily,
    restoreSelection,
    saveSelection,
    handlePageInput,
    updateActiveStates,
    setFontFamily,
    setLineHeight,
    reflowFrom,
    repaginateAll,
}: UseEditorFormattingOptions) {
    const exec = useCallback(
        (command: string, value?: string) => {
            restoreSelection();

            const activeNode = pageRefs.current[activePageIndex];
            if (!activeNode) return;

            activeNode.focus();
            document.execCommand(command, false, value);

            handlePageInput(activePageIndex, activeNode.innerHTML);
            saveSelection();
            updateActiveStates();
        },
        [
            activePageIndex,
            handlePageInput,
            restoreSelection,
            saveSelection,
            updateActiveStates,
            pageRefs,
        ],
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
                    ["P", "H1", "H2", "H3", "DIV", "LI", "TD"].includes(
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

            exec("formatBlock", "<p>");
            if (activeNode) {
                handlePageInput(activePageIndex, activeNode.innerHTML);
            }
        },
        [activePageIndex, exec, handlePageInput],
    );

    const applyInlineStyle = useCallback(
        (cssProperty: string, value: string) => {
            const selection = window.getSelection();
            if (!selection || !selection.rangeCount || selection.isCollapsed)
                return;

            const range = selection.getRangeAt(0);
            const span = document.createElement("span");
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
        [activePageIndex, handlePageInput],
    );

    const applyFontFamily = (font: string) => {
        setFontFamily(font);
        restoreSelection();

        const selection = window.getSelection();

        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            applyInlineStyle("font-family", font);
        } else {
            applyBlockStyle("font-family", font);
        }
    };

    const applyFontSize = (sizePt: string) => {
        restoreSelection();

        const selection = window.getSelection();

        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            applyInlineStyle("font-size", sizePt);
        } else {
            applyBlockStyle("font-size", sizePt);
        }
    };

    const applyLineSpacing = (spacing: string) => {
        setLineHeight(spacing);
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
            applyBlockStyle("line-height", spacing);
            reflowFrom(activePageIndex);
        } else {
            applyBlockStyle("line-height", spacing);
            repaginateAll(margins, fontFamily, spacing);
        }
    };

    const applyFirstLineIndent = () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        let node: Node | null = selection.anchorNode;
        const activeNode = pageRefs.current[activePageIndex];

        while (node && node !== activeNode && node !== document.body) {
            if (
                node instanceof HTMLElement &&
                ["P", "DIV"].includes(node.tagName)
            ) {
                const current = node.style.textIndent;
                node.style.textIndent = current === "1.25cm" ? "0cm" : "1.25cm";
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
                ["P", "DIV"].includes(node.tagName)
            ) {
                node.style.marginLeft = "4.0cm";
                node.style.fontSize = "10pt";
                node.style.lineHeight = "1.0";
                node.style.textAlign = "justify";
                node.style.textIndent = "0cm";
                node.style.marginTop = "8pt";
                node.style.marginBottom = "8pt";
                if (activeNode) {
                    handlePageInput(activePageIndex, activeNode.innerHTML);
                }
                return;
            }
            node = node.parentNode;
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
            </table>`;
        exec("insertHTML", tableHtml);
    };

    return {
        exec,
        applyBlockStyle,
        applyInlineStyle,
        applyFontFamily,
        applyFontSize,
        applyLineSpacing,
        applyFirstLineIndent,
        formatAsLongCitation,
        insertTable,
    };
}
