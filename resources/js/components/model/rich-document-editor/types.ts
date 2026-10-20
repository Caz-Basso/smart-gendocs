import type { DragEventHandler } from "react";
import type { ModelElementAttachment } from "@/types/document-element";
import type { DocumentMargins } from "./utils/editor-config";

export type RefWithCurrent<T> = {
    current: T;
};

export interface CaretPos {
    node: Node;
    offset: number;
}

export interface PageMetrics {
    usableHeight: number;
    contentHeight: number;
    overflowPx: number;
}

export interface DocumentPageProps {
    pages: string[];
    activePageIndex: number;
    showVisualGuide: boolean;
    overflowPages: boolean[];

    pageRefs: RefWithCurrent<(HTMLDivElement | null)[]>;
    pagesRef: RefWithCurrent<string[]>;
    isComposingRef: RefWithCurrent<boolean>;
    suppressBlurSyncRef: RefWithCurrent<boolean>;

    margins: DocumentMargins;
    dimensions: {
        usableWidthMm: number;
        usableHeightMm: number;
    };

    fontFamily: string;
    fontSize: string;
    lineHeight: number | string;

    setActivePageIndex: (index: number) => void;
    insertNewBlankPage: (pageIndex: number) => void;
    removePage: (pageIndex: number) => void;
    insertPageBreakAtCursor: () => void;
    updateActiveStates: () => void;
    handlePageInput: (pageIndex: number, html: string) => void;
    setPages: (pages: string[]) => void;

    onDragOver?: DragEventHandler<HTMLDivElement>;
    onDrop?: DragEventHandler<HTMLDivElement>;
    elements?: ModelElementAttachment[];
}