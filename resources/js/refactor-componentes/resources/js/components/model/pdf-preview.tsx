import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DragEvent, RefObject } from 'react';
import { Button } from '@/components/ui/button';
import type { PdfDocumentStructure } from '@/lib/pdf-document';

type PdfPage = PdfDocumentStructure['pages'][number];

interface PdfPreviewProps {
    containerRef: RefObject<HTMLDivElement | null>;
    imageSrc: string;
    pageIndex: number;
    page: PdfPage | undefined;
    onTextChange: (elementIndex: number, text: string) => void;
    onDragOver: (event: DragEvent<HTMLDivElement>) => void;
    onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

export function PdfPreview({
    containerRef,
    imageSrc,
    pageIndex,
    page,
    onTextChange,
    onDragOver,
    onDrop,
}: PdfPreviewProps) {
    return (
        <div
            ref={containerRef}
            className="relative w-full [container-type:inline-size]"
        >
            <img
                src={imageSrc}
                alt={`Página ${pageIndex + 1}`}
                className="block h-auto w-full select-none"
                draggable={false}
            />

            <div
                className="absolute inset-0"
                onDragOver={onDragOver}
                onDrop={onDrop}
            >
                {page?.elements.map((element, index) => (
                    <div
                        key={`${pageIndex}-${index}`}
                        data-element-index={index}
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(event) =>
                            onTextChange(
                                index,
                                event.currentTarget.textContent ?? '',
                            )
                        }
                        className="absolute overflow-hidden bg-white text-black outline-none focus:ring-1 focus:ring-blue-500"
                        style={{
                            left: `${element.x * 100}%`,
                            top: `${element.y * 100}%`,
                            width: `${Math.min(1 - element.x, Math.max(element.width, 0.04)) * 100}%`,
                            height: `${Math.max(element.height * 1.5, 0.015) * 100}%`,
                            fontSize: `${(element.fontSize / (page?.width || 1)) * 100}cqw`,
                            lineHeight: 1,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {element.text}
                    </div>
                ))}
            </div>
        </div>
    );
}

interface PdfPaginationProps {
    current: number;
    total: number;
    onChange: (page: number) => void;
}

export function PdfPagination({ current, total, onChange }: PdfPaginationProps) {
    return (
        <div className="flex items-center gap-2">
            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Página anterior"
                disabled={current === 0}
                onClick={() => onChange(Math.max(0, current - 1))}
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            <span className="text-xs text-muted-foreground">
                {current + 1} / {total}
            </span>

            <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Próxima página"
                disabled={current >= total - 1}
                onClick={() => onChange(Math.min(total - 1, current + 1))}
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
