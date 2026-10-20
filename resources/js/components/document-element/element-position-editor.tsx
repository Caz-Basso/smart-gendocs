import { AlignCenter, Maximize2, Move, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface ElementPositionValues {
    position_x: number;
    position_y: number;
    width: number;
    height: number;
}

interface Props {
    imageUrl: string | null;
    type: 'header' | 'footer';
    values: ElementPositionValues;
    onChange: (values: ElementPositionValues) => void;
    showSampleContent?: boolean;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export function ElementPositionEditor({
    imageUrl,
    type,
    values,
    onChange,
    showSampleContent = true,
}: Props) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const [canvasWidthPx, setCanvasWidthPx] = useState<number>(380);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState<'se' | 'e' | 's' | null>(null);
    const [dragStart, setDragStart] = useState<{
        mouseX: number;
        mouseY: number;
        initialX: number;
        initialY: number;
        initialW: number;
        initialH: number;
    }>({
        mouseX: 0,
        mouseY: 0,
        initialX: 0,
        initialY: 0,
        initialW: 0,
        initialH: 0,
    });
    const [showMargins, setShowMargins] = useState(true);

    // Update canvas scale according to container width
    useEffect(() => {
        const updateWidth = () => {
            if (canvasRef.current?.parentElement) {
                const parentW = canvasRef.current.parentElement.clientWidth;
                // keep reasonable width for A4 preview (around 380 - 460px)
                const targetW = Math.min(Math.max(parentW - 32, 280), 440);
                setCanvasWidthPx(targetW);
            }
        };

        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, []);

    const scale = canvasWidthPx / A4_WIDTH_MM;
    const canvasHeightPx = A4_HEIGHT_MM * scale;

    // Convert mm to px and px to mm
    const mmToPx = (mm: number) => mm * scale;
    const pxToMm = (px: number) => Math.round((px / scale) * 10) / 10;

    const handleMouseDownMove = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({
            mouseX: e.clientX,
            mouseY: e.clientY,
            initialX: values.position_x,
            initialY: values.position_y,
            initialW: values.width,
            initialH: values.height,
        });
    };

    const handleMouseDownResize = (
        e: React.MouseEvent,
        handle: 'se' | 'e' | 's',
    ) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(handle);
        setDragStart({
            mouseX: e.clientX,
            mouseY: e.clientY,
            initialX: values.position_x,
            initialY: values.position_y,
            initialW: values.width,
            initialH: values.height,
        });
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging && !isResizing) return;

            const deltaXmm = pxToMm(e.clientX - dragStart.mouseX);
            const deltaYmm = pxToMm(e.clientY - dragStart.mouseY);

            if (isDragging) {
                const newX = Math.max(
                    0,
                    Math.min(
                        A4_WIDTH_MM - values.width,
                        dragStart.initialX + deltaXmm,
                    ),
                );
                const newY = Math.max(
                    0,
                    Math.min(
                        A4_HEIGHT_MM - values.height,
                        dragStart.initialY + deltaYmm,
                    ),
                );
                onChange({
                    ...values,
                    position_x: Math.round(newX * 10) / 10,
                    position_y: Math.round(newY * 10) / 10,
                });
            } else if (isResizing) {
                let newW = values.width;
                let newH = values.height;

                if (isResizing === 'se' || isResizing === 'e') {
                    newW = Math.max(
                        10,
                        Math.min(
                            A4_WIDTH_MM - values.position_x,
                            dragStart.initialW + deltaXmm,
                        ),
                    );
                }
                if (isResizing === 'se' || isResizing === 's') {
                    newH = Math.max(
                        5,
                        Math.min(
                            A4_HEIGHT_MM - values.position_y,
                            dragStart.initialH + deltaYmm,
                        ),
                    );
                }

                onChange({
                    ...values,
                    width: Math.round(newW * 10) / 10,
                    height: Math.round(newH * 10) / 10,
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(null);
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragStart, values, scale, onChange]);

    // Presets
    const applyPreset = (
        preset:
            | 'fullHeader'
            | 'marginHeader'
            | 'fullFooter'
            | 'marginFooter'
            | 'centerH'
            | 'fullWidth',
    ) => {
        if (preset === 'fullHeader') {
            onChange({ position_x: 0, position_y: 0, width: 210, height: 35 });
        } else if (preset === 'marginHeader') {
            onChange({
                position_x: 15,
                position_y: 10,
                width: 180,
                height: 30,
            });
        } else if (preset === 'fullFooter') {
            onChange({
                position_x: 0,
                position_y: 262,
                width: 210,
                height: 35,
            });
        } else if (preset === 'marginFooter') {
            onChange({
                position_x: 15,
                position_y: 267,
                width: 180,
                height: 20,
            });
        } else if (preset === 'centerH') {
            const newX = Math.max(
                0,
                Math.round(((A4_WIDTH_MM - values.width) / 2) * 10) / 10,
            );
            onChange({ ...values, position_x: newX });
        } else if (preset === 'fullWidth') {
            onChange({ ...values, position_x: 0, width: 210 });
        }
    };

    return (
        <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
            {/* Visual Canvas A4 */}
            <div className="flex w-full flex-shrink-0 flex-col items-center lg:w-auto">
                <div className="mb-2 flex w-full max-w-[440px] items-center justify-between px-1 text-xs text-neutral-500">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                        Folha A4 (210 × 297 mm)
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowMargins(!showMargins)}
                        className="cursor-pointer text-[11px] underline hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                        {showMargins
                            ? 'Ocultar margens'
                            : 'Mostrar margens (15mm)'}
                    </button>
                </div>

                <div
                    ref={canvasRef}
                    style={{
                        width: `${canvasWidthPx}px`,
                        height: `${canvasHeightPx}px`,
                    }}
                    className="relative overflow-hidden rounded-sm border border-neutral-300 bg-white shadow-xl select-none dark:border-neutral-700 dark:bg-neutral-900"
                >
                    {/* Margins guide */}
                    {showMargins && (
                        <div
                            style={{
                                top: `${mmToPx(15)}px`,
                                left: `${mmToPx(15)}px`,
                                right: `${mmToPx(15)}px`,
                                bottom: `${mmToPx(15)}px`,
                            }}
                            className="pointer-events-none absolute z-0 border border-dashed border-sky-400/30"
                        />
                    )}

                    {/* Sample Document Content Simulation */}
                    {showSampleContent && (
                        <div
                            style={{
                                top: `${mmToPx(45)}px`,
                                left: `${mmToPx(20)}px`,
                                right: `${mmToPx(20)}px`,
                                bottom: `${mmToPx(40)}px`,
                            }}
                            className="pointer-events-none absolute z-0 space-y-3 overflow-hidden text-justify opacity-20 dark:opacity-10"
                        >
                            <div className="mx-auto mb-4 h-4 w-2/3 rounded bg-neutral-900 dark:bg-neutral-100" />
                            <div className="h-2.5 w-full rounded bg-neutral-700 dark:bg-neutral-300" />
                            <div className="h-2.5 w-full rounded bg-neutral-700 dark:bg-neutral-300" />
                            <div className="h-2.5 w-5/6 rounded bg-neutral-700 dark:bg-neutral-300" />
                            <div className="h-2.5 w-full rounded bg-neutral-700 dark:bg-neutral-300" />
                            <div className="h-2.5 w-4/5 rounded bg-neutral-700 dark:bg-neutral-300" />
                            <div className="mt-4 h-2.5 w-full rounded bg-neutral-700 dark:bg-neutral-300" />
                            <div className="h-2.5 w-3/4 rounded bg-neutral-700 dark:bg-neutral-300" />
                        </div>
                    )}

                    {/* Draggable & Resizable Element */}
                    <div
                        style={{
                            left: `${mmToPx(values.position_x)}px`,
                            top: `${mmToPx(values.position_y)}px`,
                            width: `${mmToPx(values.width)}px`,
                            height: `${mmToPx(values.height)}px`,
                        }}
                        onMouseDown={handleMouseDownMove}
                        className={`absolute z-10 cursor-move border-2 ${
                            isDragging || isResizing
                                ? 'border-blue-600 bg-blue-500/10 shadow-lg'
                                : 'border-blue-500/80 bg-blue-500/5 hover:border-blue-600'
                        } group flex items-center justify-center transition-shadow`}
                    >
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt="Elemento"
                                className="pointer-events-none h-full w-full object-contain select-none"
                                draggable={false}
                            />
                        ) : (
                            <div className="pointer-events-none p-2 text-center text-xs font-medium text-blue-600 select-none">
                                <Move className="mx-auto mb-1 h-4 w-4 opacity-70" />
                                {type === 'header'
                                    ? 'Área do Cabeçalho'
                                    : 'Área do Rodapé'}
                            </div>
                        )}

                        {/* Coordinates tooltip on hover/drag */}
                        <div className="pointer-events-none absolute -top-7 left-1/2 z-30 -translate-x-1/2 rounded bg-neutral-900 px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-white opacity-0 transition-opacity group-hover:opacity-100">
                            X: {values.position_x}mm | Y: {values.position_y}mm
                            ({values.width}×{values.height}mm)
                        </div>

                        {/* Resize Handles */}
                        {/* South-East (corner) */}
                        <div
                            onMouseDown={(e) => handleMouseDownResize(e, 'se')}
                            className="absolute -right-1.5 -bottom-1.5 z-20 h-3.5 w-3.5 cursor-se-resize rounded-xs border-2 border-blue-600 bg-white shadow"
                        />
                        {/* East (right edge) */}
                        <div
                            onMouseDown={(e) => handleMouseDownResize(e, 'e')}
                            className="absolute top-1/2 -right-1.5 z-20 h-4 w-2.5 -translate-y-1/2 cursor-e-resize rounded-xs border border-blue-600 bg-white shadow"
                        />
                        {/* South (bottom edge) */}
                        <div
                            onMouseDown={(e) => handleMouseDownResize(e, 's')}
                            className="absolute -bottom-1.5 left-1/2 z-20 h-2.5 w-4 -translate-x-1/2 cursor-s-resize rounded-xs border border-blue-600 bg-white shadow"
                        />
                    </div>
                </div>

                <p className="mt-2 text-center text-[11px] text-neutral-400">
                    Arraste o elemento para mover. Puxe os cantos/bordas para
                    redimensionar.
                </p>
            </div>

            {/* Numeric Inputs & Presets Control Panel */}
            <div className="w-full flex-1 space-y-5">
                {/* Quick Presets */}
                <div className="space-y-3 rounded-xl border bg-neutral-50 p-4 dark:bg-neutral-800/50">
                    <h3 className="text-xs font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-300">
                        Posicionamento Rápido (Presets)
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {type === 'header' ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyPreset('fullHeader')}
                                    className="cursor-pointer justify-start text-xs"
                                >
                                    Topo Total (210×35mm)
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyPreset('marginHeader')}
                                    className="cursor-pointer justify-start text-xs"
                                >
                                    Topo com Margem (180×30mm)
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyPreset('fullFooter')}
                                    className="cursor-pointer justify-start text-xs"
                                >
                                    Rodapé Total (210×35mm)
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyPreset('marginFooter')}
                                    className="cursor-pointer justify-start text-xs"
                                >
                                    Rodapé com Margem (180×20mm)
                                </Button>
                            </>
                        )}
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => applyPreset('centerH')}
                            className="cursor-pointer justify-start gap-1.5 text-xs"
                        >
                            <AlignCenter className="h-3.5 w-3.5" />
                            Centralizar Horizontalmente
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => applyPreset('fullWidth')}
                            className="cursor-pointer justify-start gap-1.5 text-xs"
                        >
                            <Maximize2 className="h-3.5 w-3.5" />
                            Largura Total (210mm)
                        </Button>
                    </div>
                </div>

                {/* Numeric Inputs in Millimeters */}
                <div className="space-y-4 rounded-xl border bg-white p-4 dark:bg-neutral-900">
                    <h3 className="text-xs font-semibold tracking-wider text-neutral-600 uppercase dark:text-neutral-300">
                        Coordenadas e Dimensões Exatas (em milímetros)
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label
                                htmlFor="position_x"
                                className="text-xs font-medium"
                            >
                                Posição Horizontal (X)
                            </Label>
                            <div className="relative">
                                <Input
                                    id="position_x"
                                    type="number"
                                    min={0}
                                    max={210}
                                    step="0.5"
                                    value={values.position_x}
                                    onChange={(e) =>
                                        onChange({
                                            ...values,
                                            position_x: Math.max(
                                                0,
                                                parseFloat(e.target.value) || 0,
                                            ),
                                        })
                                    }
                                    className="pr-9 font-mono"
                                />
                                <span className="pointer-events-none absolute top-2.5 right-3 text-xs text-neutral-400">
                                    mm
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="position_y"
                                className="text-xs font-medium"
                            >
                                Posição Vertical (Y)
                            </Label>
                            <div className="relative">
                                <Input
                                    id="position_y"
                                    type="number"
                                    min={0}
                                    max={297}
                                    step="0.5"
                                    value={values.position_y}
                                    onChange={(e) =>
                                        onChange({
                                            ...values,
                                            position_y: Math.max(
                                                0,
                                                parseFloat(e.target.value) || 0,
                                            ),
                                        })
                                    }
                                    className="pr-9 font-mono"
                                />
                                <span className="pointer-events-none absolute top-2.5 right-3 text-xs text-neutral-400">
                                    mm
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="width"
                                className="text-xs font-medium"
                            >
                                Largura
                            </Label>
                            <div className="relative">
                                <Input
                                    id="width"
                                    type="number"
                                    min={5}
                                    max={210}
                                    step="0.5"
                                    value={values.width}
                                    onChange={(e) =>
                                        onChange({
                                            ...values,
                                            width: Math.max(
                                                5,
                                                parseFloat(e.target.value) || 5,
                                            ),
                                        })
                                    }
                                    className="pr-9 font-mono"
                                />
                                <span className="pointer-events-none absolute top-2.5 right-3 text-xs text-neutral-400">
                                    mm
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="height"
                                className="text-xs font-medium"
                            >
                                Altura
                            </Label>
                            <div className="relative">
                                <Input
                                    id="height"
                                    type="number"
                                    min={5}
                                    max={297}
                                    step="0.5"
                                    value={values.height}
                                    onChange={(e) =>
                                        onChange({
                                            ...values,
                                            height: Math.max(
                                                5,
                                                parseFloat(e.target.value) || 5,
                                            ),
                                        })
                                    }
                                    className="pr-9 font-mono"
                                />
                                <span className="pointer-events-none absolute top-2.5 right-3 text-xs text-neutral-400">
                                    mm
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
