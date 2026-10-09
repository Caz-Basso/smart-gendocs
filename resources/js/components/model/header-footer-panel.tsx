import { useState } from "react";
import { Link } from "@inertiajs/react";
import {
    ChevronUp,
    ExternalLink,
    Layers,
    Plus,
    RotateCcw,
    Settings2,
    Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import documentElements from "@/routes/document-elements";
import type {
    DocumentElement,
    ModelElementAttachment,
} from "@/types/document-element";

interface Props {
    availableElements: DocumentElement[];
    elements: ModelElementAttachment[];
    onChange: (elements: ModelElementAttachment[]) => void;
}

export function HeaderFooterPanel({
    availableElements = [],
    elements = [],
    onChange,
}: Props) {
    const [selectedIdToAdd, setSelectedIdToAdd] = useState<string>("");
    const [expandedElementId, setExpandedElementId] = useState<string | null>(null);
    const [rawPagesMap, setRawPagesMap] = useState<Record<string, string>>({});

    const handleAdd = () => {
        if (!selectedIdToAdd) return;
        const found = availableElements.find((e) => e.id === selectedIdToAdd);
        if (!found) return;

        const newAttachment: ModelElementAttachment = {
            _instanceKey: crypto.randomUUID(),
            element_id: found.id,
            element: found,
            name: found.name,
            type: found.type,
            image_url: found.image_url,
            position_x: Number(found.position_x),
            position_y: Number(found.position_y),
            width: Number(found.width),
            height: Number(found.height),
            repeat_all_pages: true,
            pages: [1],
            z_index: 10 + elements.length,
        };

        onChange([...elements, newAttachment]);
        setSelectedIdToAdd("");
    };

    const handleRemove = (instanceKey: string) => {
        onChange(elements.filter((el) => getKey(el) !== instanceKey));
    };

    const handleUpdate = (instanceKey: string, partial: Partial<ModelElementAttachment>) => {
        onChange(
            elements.map((el) =>
                getKey(el) === instanceKey ? { ...el, ...partial } : el,
            ),
        );
    };

    const handleResetToDefault = (instanceKey: string) => {
        const item = elements.find((el) => getKey(el) === instanceKey);
        if (!item) return;
        const original = availableElements.find((e) => e.id === item.element_id);
        if (!original) return;

        handleUpdate(instanceKey, {
            position_x: Number(original.position_x),
            position_y: Number(original.position_y),
            width: Number(original.width),
            height: Number(original.height),
        });
    };

    /** Returns a stable unique key per attachment instance. */
    const getKey = (item: ModelElementAttachment): string =>
        item._instanceKey ?? item.id ?? item.element_id;


    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                        Cabeçalho e Rodapé
                    </span>
                </div>
                {elements.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                        {elements.length} {elements.length === 1 ? "anexado" : "anexados"}
                    </Badge>
                )}
            </div>

            {/* If no elements registered in system */}
            {availableElements.length === 0 ? (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                    <p className="font-medium">Nenhum cabeçalho ou rodapé cadastrado.</p>
                    <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-400/80">
                        Cadastre imagens reutilizáveis no menu de administração para posicionar nos modelos.
                    </p>
                    <div className="mt-2.5">
                        <Link
                            href={documentElements.create()}
                            target="_blank"
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                        >
                            <span>Cadastrar Novo Elemento</span>
                            <ExternalLink className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    {/* Element Selector */}
                    {availableElements.length > 0 && (
                        <div className="flex gap-2">
                            <select
                                value={selectedIdToAdd}
                                onChange={(e) => setSelectedIdToAdd(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="" disabled>
                                    Selecionar cabeçalho ou rodapé...
                                </option>
                                {availableElements.map((el) => (
                                    <option key={el.id} value={el.id}>
                                        {el.type === "header" ? "🔝 [Cabeçalho]" : "🔻 [Rodapé]"}{" "}
                                        {el.name} ({el.width}×{el.height}mm)
                                    </option>
                                ))}
                            </select>
                            <Button
                                type="button"
                                size="sm"
                                disabled={!selectedIdToAdd}
                                onClick={handleAdd}
                                className="h-9 px-3 text-xs gap-1 cursor-pointer shrink-0"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Inserir
                            </Button>
                        </div>
                    )}

                    {/* Attached Elements List */}
                    {elements.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground italic">
                            Nenhum cabeçalho ou rodapé selecionado para este modelo.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {elements.map((item) => {
                                const instanceKey = getKey(item);
                                const isExpanded = expandedElementId === instanceKey;
                                const isHeader = item.type === "header";

                                return (
                                    <div
                                        key={instanceKey}
                                        className="rounded-lg border bg-card p-3 shadow-2xs space-y-3"
                                    >
                                        {/* Card Header */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                {item.image_url && (
                                                    <img
                                                        src={item.image_url}
                                                        alt={item.name}
                                                        className="h-8 w-12 object-contain rounded bg-neutral-100 dark:bg-neutral-800 p-0.5 border shrink-0"
                                                    />
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold truncate leading-tight">
                                                        {item.name || item.element?.name || "Elemento"}
                                                    </p>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {item.width}×{item.height}mm (X: {item.position_x}, Y: {item.position_y})
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0">
                                                <Badge
                                                    variant={isHeader ? "default" : "secondary"}
                                                    className="text-[9px] uppercase px-1.5 py-0"
                                                >
                                                    {isHeader ? "Cabeçalho" : "Rodapé"}
                                                </Badge>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        setExpandedElementId(
                                                            isExpanded ? null : instanceKey,
                                                        )
                                                    }
                                                    className="h-6 w-6 cursor-pointer text-muted-foreground hover:text-foreground"
                                                    title="Ajustar posição e repetição"
                                                >
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <Settings2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemove(instanceKey)}
                                                    className="h-6 w-6 cursor-pointer text-destructive hover:bg-destructive/10"
                                                    title="Remover deste modelo"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Repetition Options */}
                                        <div className="pt-1 border-t space-y-2">
                                            <Label className="text-[11px] font-medium text-muted-foreground">
                                                Repetição no Documento:
                                            </Label>
                                            <RadioGroup
                                                value={item.repeat_all_pages ? "all" : "specific"}
                                                onValueChange={(val) => {
                                                    handleUpdate(instanceKey, {
                                                        repeat_all_pages: val === "all",
                                                        pages: val === "all" ? undefined : (item.pages || [1]),
                                                    });
                                                    setRawPagesMap((prev) => {
                                                        const next = { ...prev };
                                                        delete next[instanceKey];
                                                        return next;
                                                    });
                                                }}
                                                className="flex flex-col gap-1.5"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem
                                                        value="all"
                                                        id={`rep-all-${instanceKey}`}
                                                        className="h-3.5 w-3.5"
                                                    />
                                                    <Label
                                                        htmlFor={`rep-all-${instanceKey}`}
                                                        className="text-xs cursor-pointer font-normal"
                                                    >
                                                        Todas as páginas
                                                    </Label>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <RadioGroupItem
                                                        value="specific"
                                                        id={`rep-spec-${instanceKey}`}
                                                        className="h-3.5 w-3.5"
                                                    />
                                                    <Label
                                                        htmlFor={`rep-spec-${instanceKey}`}
                                                        className="text-xs cursor-pointer font-normal"
                                                    >
                                                        Páginas específicas (ex: apenas pág. 1)
                                                    </Label>
                                                </div>
                                            </RadioGroup>

                                            {!item.repeat_all_pages && (
                                                <div className="pl-5 pt-1 space-y-1">
                                                    <Label
                                                        htmlFor={`pages-${instanceKey}`}
                                                        className="text-[10px] text-muted-foreground"
                                                    >
                                                        Números das páginas (separados por vírgula):
                                                    </Label>
                                                    <Input
                                                        id={`pages-${instanceKey}`}
                                                        type="text"
                                                        placeholder="Ex: 1 ou 1, 2"
                                                        value={
                                                            instanceKey in rawPagesMap
                                                                ? rawPagesMap[instanceKey]
                                                                : (item.pages || []).join(", ")
                                                        }
                                                        onChange={(e) => {
                                                            setRawPagesMap((prev) => ({
                                                                ...prev,
                                                                [instanceKey]: e.target.value,
                                                            }));
                                                        }}
                                                        onBlur={(e) => {
                                                            const raw = e.target.value;
                                                            const parsed = raw
                                                                .split(",")
                                                                .map((p) => parseInt(p.trim(), 10))
                                                                .filter((n) => !isNaN(n) && n > 0);
                                                            handleUpdate(instanceKey, { pages: parsed });
                                                            setRawPagesMap((prev) => {
                                                                const next = { ...prev };
                                                                delete next[instanceKey];
                                                                return next;
                                                            });
                                                        }}
                                                        className="h-7 text-xs font-mono"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Overrides Collapsible Accordion */}
                                        {isExpanded && (
                                            <div className="pt-2 border-t space-y-2 bg-neutral-50/70 dark:bg-neutral-900/40 -mx-3 -mb-3 p-3 rounded-b-lg">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                                                        Ajustes Específicos para Este Modelo (mm):
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResetToDefault(instanceKey)}
                                                        className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline cursor-pointer"
                                                        title="Restaurar dimensões originais do elemento"
                                                    >
                                                        <RotateCcw className="h-3 w-3" />
                                                        Padrão
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label className="text-[10px] text-muted-foreground">
                                                            Posição X (mm)
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            step="0.5"
                                                            value={item.position_x ?? 0}
                                                            onChange={(e) =>
                                                                handleUpdate(instanceKey, {
                                                                    position_x: parseFloat(e.target.value) || 0,
                                                                })
                                                            }
                                                            className="h-7 text-xs font-mono"
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label className="text-[10px] text-muted-foreground">
                                                            Posição Y (mm)
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            step="0.5"
                                                            value={item.position_y ?? 0}
                                                            onChange={(e) =>
                                                                handleUpdate(instanceKey, {
                                                                    position_y: parseFloat(e.target.value) || 0,
                                                                })
                                                            }
                                                            className="h-7 text-xs font-mono"
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label className="text-[10px] text-muted-foreground">
                                                            Largura (mm)
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            step="0.5"
                                                            value={item.width ?? 210}
                                                            onChange={(e) =>
                                                                handleUpdate(instanceKey, {
                                                                    width: parseFloat(e.target.value) || 10,
                                                                })
                                                            }
                                                            className="h-7 text-xs font-mono"
                                                        />
                                                    </div>

                                                    <div>
                                                        <Label className="text-[10px] text-muted-foreground">
                                                            Altura (mm)
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            step="0.5"
                                                            value={item.height ?? 35}
                                                            onChange={(e) =>
                                                                handleUpdate(instanceKey, {
                                                                    height: parseFloat(e.target.value) || 5,
                                                                })
                                                            }
                                                            className="h-7 text-xs font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

