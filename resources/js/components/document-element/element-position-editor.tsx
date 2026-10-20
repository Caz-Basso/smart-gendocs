import { useCallback, useEffect, useRef, useState } from "react";
import { AlignCenter, Maximize2, Move, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ElementPositionValues {
    position_x: number;
    position_y: number;
    width: number;
    height: number;
}

interface Props {
    imageUrl: string | null;
    type: "header" | "footer";
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
    const [isResizing, setIsResizing] = useState<"se" | "e" | "s" | null>(null);
    const [dragStart, setDragStart] = useState<{ mouseX: number; mouseY: number; initialX: number; initialY: number; initialW: number; initialH: number }>({
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
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
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

    const handleMouseDownResize = (e: React.MouseEvent, handle: "se" | "e" | "s") => {
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
                const newX = Math.max(0, Math.min(A4_WIDTH_MM - values.width, dragStart.initialX + deltaXmm));
                const newY = Math.max(0, Math.min(A4_HEIGHT_MM - values.height, dragStart.initialY + deltaYmm));
                onChange({
                    ...values,
                    position_x: Math.round(newX * 10) / 10,
                    position_y: Math.round(newY * 10) / 10,
                });
            } else if (isResizing) {
                let newW = values.width;
                let newH = values.height;

                if (isResizing === "se" || isResizing === "e") {
                    newW = Math.max(10, Math.min(A4_WIDTH_MM - values.position_x, dragStart.initialW + deltaXmm));
                }
                if (isResizing === "se" || isResizing === "s") {
                    newH = Math.max(5, Math.min(A4_HEIGHT_MM - values.position_y, dragStart.initialH + deltaYmm));
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
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, isResizing, dragStart, values, scale, onChange]);

    // Presets
    const applyPreset = (preset: "fullHeader" | "marginHeader" | "fullFooter" | "marginFooter" | "centerH" | "fullWidth") => {
        if (preset === "fullHeader") {
            onChange({ position_x: 0, position_y: 0, width: 210, height: 35 });
        } else if (preset === "marginHeader") {
            onChange({ position_x: 15, position_y: 10, width: 180, height: 30 });
        } else if (preset === "fullFooter") {
            onChange({ position_x: 0, position_y: 262, width: 210, height: 35 });
        } else if (preset === "marginFooter") {
            onChange({ position_x: 15, position_y: 267, width: 180, height: 20 });
        } else if (preset === "centerH") {
            const newX = Math.max(0, Math.round(((A4_WIDTH_MM - values.width) / 2) * 10) / 10);
            onChange({ ...values, position_x: newX });
        } else if (preset === "fullWidth") {
            onChange({ ...values, position_x: 0, width: 210 });
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
            {/* Visual Canvas A4 */}
            <div className="flex flex-col items-center w-full lg:w-auto flex-shrink-0">
                <div className="flex items-center justify-between w-full max-w-[440px] mb-2 px-1 text-xs text-neutral-500">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                        Folha A4 (210 × 297 mm)
                    </span>
                    <button
                        type="button"
                        onClick={() => setShowMargins(!showMargins)}
                        className="hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer underline text-[11px]"
                    >
                        {showMargins ? "Ocultar margens" : "Mostrar margens (15mm)"}
                    </button>
                </div>

                <div
                    ref={canvasRef}
                    style={{
                        width: `${canvasWidthPx}px`,
                        height: `${canvasHeightPx}px`,
                    }}
                    className="relative bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 shadow-xl rounded-sm overflow-hidden select-none"
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
                            className="absolute border border-dashed border-sky-400/30 pointer-events-none z-0"
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
                            className="absolute pointer-events-none opacity-20 dark:opacity-10 space-y-3 z-0 overflow-hidden text-justify"
                        >
                            <div className="h-4 bg-neutral-900 dark:bg-neutral-100 rounded w-2/3 mx-auto mb-4" />
                            <div className="h-2.5 bg-neutral-700 dark:bg-neutral-300 rounded w-full" />
                            <div className="h-2.5 bg-neutral-700 dark:bg-neutral-300 rounded w-full" />
                            <div className="h-2.5 bg-neutral-700 dark:bg-neutral-300 rounded w-5/6" />
                            <div className="h-2.5 bg-neutral-700 dark:bg-neutral-300 rounded w-full" />
                            <div className="h-2.5 bg-neutral-700 dark:bg-neutral-300 rounded w-4/5" />
                            <div className="h-2.5 bg-neutral-700 dark:bg-neutral-300 rounded w-full mt-4" />
                            <div className="h-2.5 bg-neutral-700 dark:bg-neutral-300 rounded w-3/4" />
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
                                ? "border-blue-600 bg-blue-500/10 shadow-lg"
                                : "border-blue-500/80 hover:border-blue-600 bg-blue-500/5"
                        } group flex items-center justify-center transition-shadow`}
                    >
                        {imageUrl ? (
                            <img
                                src={imageUrl}
                                alt="Elemento"
                                className="w-full h-full object-contain pointer-events-none select-none"
                                draggable={false}
                            />
                        ) : (
                            <div className="text-center p-2 text-xs text-blue-600 font-medium select-none pointer-events-none">
                                <Move className="w-4 h-4 mx-auto mb-1 opacity-70" />
                                {type === "header" ? "Área do Cabeçalho" : "Área do Rodapé"}
                            </div>
                        )}

                        {/* Coordinates tooltip on hover/drag */}
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-30">
                            X: {values.position_x}mm | Y: {values.position_y}mm ({values.width}×{values.height}mm)
                        </div>

                        {/* Resize Handles */}
                        {/* South-East (corner) */}
                        <div
                            onMouseDown={(e) => handleMouseDownResize(e, "se")}
                            className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 bg-white border-2 border-blue-600 rounded-xs cursor-se-resize shadow z-20"
                        />
                        {/* East (right edge) */}
                        <div
                            onMouseDown={(e) => handleMouseDownResize(e, "e")}
                            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-4 bg-white border border-blue-600 rounded-xs cursor-e-resize shadow z-20"
                        />
                        {/* South (bottom edge) */}
                        <div
                            onMouseDown={(e) => handleMouseDownResize(e, "s")}
                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-2.5 bg-white border border-blue-600 rounded-xs cursor-s-resize shadow z-20"
                        />
                    </div>
                </div>

                <p className="text-[11px] text-neutral-400 mt-2 text-center">
                    Arraste o elemento para mover. Puxe os cantos/bordas para redimensionar.
                </p>
            </div>

            {/* Numeric Inputs & Presets Control Panel */}
            <div className="flex-1 w-full space-y-5">
                {/* Quick Presets */}
                <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border space-y-3">
                    <h3 className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                        Posicionamento Rápido (Presets)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {type === "header" ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyPreset("fullHeader")}
                                    className="text-xs cursor-pointer justify-start"
                                >
                                    Topo Total (210×35mm)
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyPreset("marginHeader")}
                                    className="text-xs cursor-pointer justify-start"
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
                                    onClick={() => applyPreset("fullFooter")}
                                    className="text-xs cursor-pointer justify-start"
                                >
                                    Rodapé Total (210×35mm)
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyPreset("marginFooter")}
                                    className="text-xs cursor-pointer justify-start"
                                >
                                    Rodapé com Margem (180×20mm)
                                </Button>
                            </>
                        )}
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => applyPreset("centerH")}
                            className="text-xs cursor-pointer justify-start gap-1.5"
                        >
                            <AlignCenter className="w-3.5 h-3.5" />
                            Centralizar Horizontalmente
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => applyPreset("fullWidth")}
                            className="text-xs cursor-pointer justify-start gap-1.5"
                        >
                            <Maximize2 className="w-3.5 h-3.5" />
                            Largura Total (210mm)
                        </Button>
                    </div>
                </div>

                {/* Numeric Inputs in Millimeters */}
                <div className="p-4 bg-white dark:bg-neutral-900 rounded-xl border space-y-4">
                    <h3 className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 uppercase tracking-wider">
                        Coordenadas e Dimensões Exatas (em milímetros)
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="position_x" className="text-xs font-medium">
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
                                            position_x: Math.max(0, parseFloat(e.target.value) || 0),
                                        })
                                    }
                                    className="pr-9 font-mono"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-neutral-400 pointer-events-none">
                                    mm
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="position_y" className="text-xs font-medium">
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
                                            position_y: Math.max(0, parseFloat(e.target.value) || 0),
                                        })
                                    }
                                    className="pr-9 font-mono"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-neutral-400 pointer-events-none">
                                    mm
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="width" className="text-xs font-medium">
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
                                            width: Math.max(5, parseFloat(e.target.value) || 5),
                                        })
                                    }
                                    className="pr-9 font-mono"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-neutral-400 pointer-events-none">
                                    mm
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="height" className="text-xs font-medium">
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
                                            height: Math.max(5, parseFloat(e.target.value) || 5),
                                        })
                                    }
                                    className="pr-9 font-mono"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-neutral-400 pointer-events-none">
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

