import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type DragEvent,
    type RefObject,
} from "react";
import {
    getPageDimensions,
    isManualPageBreak,
    joinPagesIntoHtml,
    MANUAL_PAGE_BREAK_HTML,
    paginateDocument,
} from "@/lib/document-pagination";
import {
    MARGIN_PRESETS,
    getPaginationOptions,
    parseConfigFromHtml,
    type DocumentMargins,
    type MarginPresetKey,
} from "./utils/editor-config";
import { EditorToolbar } from "./components/editor-toolbar";
import { DocumentPage } from "./components/document-page";
import { hasPageOverflow, measurePage } from "./utils/dom-pagination";
import { useDocumentPagination } from "./hooks/use-document-pagination";
import { useEditorSelection } from "./hooks/use-editor-selection";
import { useEditorFormatting } from "./hooks/use-editor-formatting";

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
    const initialConfig = parseConfigFromHtml(html);

    const [margins, setMargins] = useState<DocumentMargins>(
        initialConfig.margins,
    );
    const [marginPreset, setMarginPreset] = useState<MarginPresetKey>("abnt");
    const [fontFamily, setFontFamily] = useState<string>(
        initialConfig.fontFamily,
    );
    const [lineHeight, setLineHeight] = useState<string>(
        initialConfig.lineHeight,
    );
    const [showVisualGuide, setShowVisualGuide] = useState(true);

    const [activeStates, setActiveStates] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikeThrough: false,
        alignLeft: false,
        alignCenter: false,
        alignRight: false,
        alignJustify: false,
    });

    const [pages, setPages] = useState<string[]>(() => {
        return paginateDocument(
            html,
            initialConfig.margins,
            getPaginationOptions(
                initialConfig.fontFamily,
                initialConfig.lineHeight,
            ),
        );
    });
    const [activePageIndex, setActivePageIndex] = useState(0);
    const [showMoreTools, setShowMoreTools] = useState(false);

    const pagesRef = useRef<string[]>(pages);
    const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

    const [overflowPages, setOverflowPages] = useState<boolean[]>([]);

    const configRef = useRef({ margins, fontFamily, lineHeight });
    configRef.current = { margins, fontFamily, lineHeight };
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const updateActiveStates = useCallback(() => {
        const selection = window.getSelection();

        if (!selection?.anchorNode) return;

        const anchorElement =
            selection.anchorNode instanceof HTMLElement
                ? selection.anchorNode
                : selection.anchorNode.parentElement;

        if (!anchorElement) return;

        const activePage = pageRefs.current[activePageIndex];

        if (!activePage?.contains(anchorElement)) return;

        const styles = window.getComputedStyle(anchorElement);
        const tagNames = new Set<string>();

        let node: HTMLElement | null = anchorElement;

        while (node && activePage.contains(node)) {
            tagNames.add(node.tagName);
            if (node === activePage) break;
            node = node.parentElement;
        }

        const textDecoration = [
            styles.textDecorationLine,
            styles.textDecoration,
        ].join(" ");

        const textAlign = styles.textAlign;

        setActiveStates({
            bold:
                Number.parseInt(styles.fontWeight, 10) >= 600 ||
                tagNames.has("B") ||
                tagNames.has("STRONG"),
            italic:
                styles.fontStyle === "italic" ||
                tagNames.has("I") ||
                tagNames.has("EM"),
            underline:
                textDecoration.includes("underline") || tagNames.has("U"),
            strikeThrough:
                textDecoration.includes("line-through") ||
                tagNames.has("S") ||
                tagNames.has("STRIKE"),
            alignLeft: textAlign === "left" || textAlign === "start",
            alignCenter: textAlign === "center",
            alignRight: textAlign === "right" || textAlign === "end",
            alignJustify: textAlign === "justify",
        });
    }, [activePageIndex, pageRefs]);

    useEffect(() => {
        const handleSelectionChange = () => {
            updateActiveStates();
        };
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => {
            document.removeEventListener(
                "selectionchange",
                handleSelectionChange,
            );
        };
    }, [updateActiveStates]);

    const goToPreviousPage = () => {
        setActivePageIndex((current) => Math.max(0, current - 1));
    };

    const goToNextPage = () => {
        setActivePageIndex((current) =>
            Math.min(pagesRef.current.length - 1, current + 1),
        );
    };

    const dimensions = getPageDimensions(margins);

    const commitPages = useCallback((next: string[]) => {
        pagesRef.current = next;
        setPages(next);
    }, []);

    const setOverflowFlag = useCallback((pageIndex: number, flag: boolean) => {
        setOverflowPages((prev) => {
            if (!!prev[pageIndex] === flag) return prev;
            const next = [...prev];
            next[pageIndex] = flag;
            return next;
        });
    }, []);

    const emitChange = useCallback(
        (
            updatedPages: string[],
            curMargins: DocumentMargins = configRef.current.margins,
            curFont: string = configRef.current.fontFamily,
            curLineHeight: string = configRef.current.lineHeight,
        ) => {
            const configComment = `<!-- a4-config: top=${curMargins.top} left=${curMargins.left} right=${curMargins.right} bottom=${curMargins.bottom} font="${curFont}" lineHeight=${curLineHeight} -->`;
            const consolidatedHtml = joinPagesIntoHtml(
                updatedPages,
                configComment,
            );

            onChangeRef.current(consolidatedHtml);
        },
        [],
    );

    const suppressBlurSyncRef = useRef(false);
    const isComposingRef = useRef(false);

    const repaginateAll = useCallback(
        (
            newMargins: DocumentMargins = configRef.current.margins,
            newFont: string = configRef.current.fontFamily,
            newLineHeight: string = configRef.current.lineHeight,
        ) => {
            const fullHtml = joinPagesIntoHtml(pagesRef.current);
            const options = getPaginationOptions(newFont, newLineHeight);
            const newPages = paginateDocument(fullHtml, newMargins, options);

            pagesRef.current = newPages;
            setPages(newPages);
            setActivePageIndex((prev) => Math.min(prev, newPages.length - 1));
            emitChange(newPages, newMargins, newFont, newLineHeight);
        },
        [emitChange],
    );

    useEffect(() => {
        if (editorRef.current) {
            const configComment = `<!-- a4-config: top=${margins.top} left=${margins.left} right=${margins.right} bottom=${margins.bottom} font="${fontFamily}" lineHeight=${lineHeight} -->`;
            editorRef.current.innerHTML = joinPagesIntoHtml(
                pagesRef.current,
                configComment,
            );
        }
    }, []);

    const { saveSelection, restoreSelection } = useEditorSelection({
        pageRefs,
        activePageIndex,
    });

    const { reflowFrom } = useDocumentPagination({
        pagesRef,
        pageRefs,
        suppressBlurSyncRef,
        setPages,
        setActivePageIndex,
        emitChange,
        setOverflowFlag,
    });

    const handlePageInput = useCallback(
        (pageIndex: number, newHtml: string) => {
            const nextPages = [...pagesRef.current];
            nextPages[pageIndex] = newHtml;
            pagesRef.current = nextPages;
            emitChange(nextPages);

            const pageElement = pageRefs.current[pageIndex];
            if (pageElement) {
                const m = measurePage(pageElement);
                setOverflowFlag(pageIndex, m.overflowPx > 1);
            }

            if (!isComposingRef.current) reflowFrom(pageIndex);
            updateActiveStates();
        },
        [emitChange, setOverflowFlag, reflowFrom, updateActiveStates],
    );

    const {
        exec,
        applyBlockStyle,
        applyInlineStyle,
        applyFontFamily,
        applyFontSize,
        applyLineSpacing,
        applyFirstLineIndent,
        formatAsLongCitation,
        insertTable,
    } = useEditorFormatting({
        pageRefs,
        activePageIndex,
        restoreSelection,
        saveSelection,
        handlePageInput,
        updateActiveStates,
        setFontFamily,
        setLineHeight,
        reflowFrom,
        repaginateAll,
        margins,
        fontFamily,
    });

    useEffect(() => {
        const id = requestAnimationFrame(() => {
            const flags = pageRefs.current
                .slice(0, pages.length)
                .map((el) => (el ? hasPageOverflow(el) : false));
            setOverflowPages((prev) =>
                prev.length === flags.length &&
                prev.every((v, i) => v === flags[i])
                    ? prev
                    : flags,
            );
        });
        return () => cancelAnimationFrame(id);
    }, [pages, margins, fontFamily, lineHeight]);

    const handleMarginPresetChange = (presetKey: string) => {
        if (
            presetKey !== "abnt" &&
            presetKey !== "normal" &&
            presetKey !== "narrow"
        ) {
            return;
        }

        setMarginPreset(presetKey);

        const nextMargins = MARGIN_PRESETS[presetKey].margins;
        setMargins(nextMargins);
        repaginateAll(nextMargins, fontFamily, lineHeight);
    };

    const insertNewBlankPage = (afterIndex = pagesRef.current.length - 1) => {
        const nextPages = [...pagesRef.current];
        if (
            nextPages[afterIndex] &&
            !isManualPageBreak(nextPages[afterIndex])
        ) {
            nextPages[afterIndex] =
                `${nextPages[afterIndex]}\n${MANUAL_PAGE_BREAK_HTML}`;
        }
        const newPageHtml =
            '<p style="text-align: justify; line-height: 1.5; font-size: 12pt;"><br/></p>';
        nextPages.splice(afterIndex + 1, 0, newPageHtml);
        commitPages(nextPages);
        setActivePageIndex(afterIndex + 1);
        emitChange(nextPages);
    };

    const removePage = (indexToRemove: number) => {
        if (pagesRef.current.length <= 1) return;
        const nextPages = pagesRef.current.filter(
            (_, idx) => idx !== indexToRemove,
        );
        pageRefs.current.splice(indexToRemove, 1);
        commitPages(nextPages);
        const nextActive = Math.min(activePageIndex, nextPages.length - 1);
        setActivePageIndex(nextActive);
        emitChange(nextPages);
        setTimeout(() => {
            reflowFrom(Math.max(0, nextActive - 1));
        }, 50);
    };

    const insertPageBreakAtCursor = () => {
        const selection = window.getSelection();
        const activeNode = pageRefs.current[activePageIndex];

        if (!selection || !selection.rangeCount || !activeNode) {
            insertNewBlankPage(activePageIndex);
            return;
        }

        try {
            const range = selection.getRangeAt(0);
            const preRange = document.createRange();
            preRange.selectNodeContents(activeNode);
            preRange.setEnd(range.startContainer, range.startOffset);
            const preFragment = preRange.cloneContents();
            const preDiv = document.createElement("div");
            preDiv.appendChild(preFragment);
            const preHtml = preDiv.innerHTML.trim() || "<p><br/></p>";

            const postRange = document.createRange();
            postRange.selectNodeContents(activeNode);
            postRange.setStart(range.endContainer, range.endOffset);
            const postFragment = postRange.cloneContents();
            const postDiv = document.createElement("div");
            postDiv.appendChild(postFragment);
            const postHtml = postDiv.innerHTML.trim() || "<p><br/></p>";

            const nextPages = [...pagesRef.current];
            nextPages[activePageIndex] =
                `${preHtml}\n${MANUAL_PAGE_BREAK_HTML}`;
            nextPages.splice(activePageIndex + 1, 0, postHtml);
            commitPages(nextPages);
            setActivePageIndex(activePageIndex + 1);
            emitChange(nextPages);
        } catch {
            insertNewBlankPage(activePageIndex);
        }
    };

    return (
        <div className="flex w-full flex-col items-center">
            <div ref={editorRef} className="hidden" aria-hidden="true" />

            <EditorToolbar
                activePageIndex={activePageIndex}
                pagesCount={pages.length}
                fontFamily={fontFamily}
                lineHeight={lineHeight}
                marginPreset={marginPreset}
                showMoreTools={showMoreTools}
                showVisualGuide={showVisualGuide}
                activeStates={activeStates}
                saveSelection={saveSelection}
                exec={exec}
                goToPreviousPage={goToPreviousPage}
                goToNextPage={goToNextPage}
                applyFontFamily={applyFontFamily}
                applyFontSize={applyFontSize}
                applyLineSpacing={applyLineSpacing}
                applyFirstLineIndent={applyFirstLineIndent}
                formatAsLongCitation={formatAsLongCitation}
                insertTable={insertTable}
                handleMarginPresetChange={handleMarginPresetChange}
                setShowMoreTools={setShowMoreTools}
                setShowVisualGuide={setShowVisualGuide}
                insertPageBreakAtCursor={insertPageBreakAtCursor}
                insertNewBlankPage={insertNewBlankPage}
            />

            <DocumentPage
                pages={pages}
                activePageIndex={activePageIndex}
                showVisualGuide={showVisualGuide}
                overflowPages={overflowPages}
                pageRefs={pageRefs}
                pagesRef={pagesRef}
                isComposingRef={isComposingRef}
                suppressBlurSyncRef={suppressBlurSyncRef}
                margins={margins}
                dimensions={getPageDimensions(margins)}
                fontFamily={fontFamily}
                fontSize="12pt"
                lineHeight={lineHeight}
                setActivePageIndex={setActivePageIndex}
                insertNewBlankPage={insertNewBlankPage}
                removePage={removePage}
                insertPageBreakAtCursor={insertPageBreakAtCursor}
                updateActiveStates={updateActiveStates}
                handlePageInput={handlePageInput}
                setPages={setPages}
                onDragOver={onDragOver}
                onDrop={onDrop}
            />
        </div>
    );
}
