import { Check, Copy, Trash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Field = {
    id: string;
    name: string;
    slug: string;
    type: string;
};

type FieldTypeOption = {
    value: string;
    label: string;
};

interface DynamicFieldProps {
    fields: Field[];
    fieldTypeOptions: FieldTypeOption[];
    copiedSlug: string | null;
    removeField: (id: string) => void;
    updateFieldName: (id: string, name: string) => void;
    updateFieldType: (id: string, type: string) => void;
    handleDragStart: (
        event: React.DragEvent<HTMLDivElement>,
        slug: string,
    ) => void;
    handleCopyTag: (slug: string) => void;
}

export default function DynamicField({
    fields,
    fieldTypeOptions,
    copiedSlug,
    removeField,
    updateFieldName,
    updateFieldType,
    handleDragStart,
    handleCopyTag,
}: DynamicFieldProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Campos Dinâmicos
                </h2>

                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                    {fields.length} {fields.length === 1 ? "campo" : "campos"}
                </span>
            </div>

            <div className="-mr-2 max-h-[420px] space-y-3 overflow-y-auto pr-2">
                {fields.map((field, index) => (
                    <div
                        key={field.id}
                        className="group relative space-y-3 rounded-xl border bg-card/60 p-3.5 shadow-xs transition-colors hover:bg-card"
                    >
                        <div className="flex items-center justify-between border-b border-border/40 pb-1">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Campo #{index + 1}
                            </span>

                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => removeField(field.id)}
                                disabled={fields.length === 1}
                                title="Excluir campo"
                            >
                                <Trash className="h-3.5 w-3.5" />
                            </Button>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">
                                Nome do Campo
                            </Label>

                            <Input
                                value={field.name}
                                onChange={(e) =>
                                    updateFieldName(field.id, e.target.value)
                                }
                                placeholder="Ex: Nome do Cliente"
                                className="h-8 bg-background text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-12 items-start gap-3">
                            <div className="col-span-8 space-y-1.5">
                                <Label className="text-xs font-medium">
                                    Tag / Slug
                                </Label>

                                <div
                                    draggable={!!field.slug}
                                    onDragStart={(e) =>
                                        handleDragStart(e, field.slug)
                                    }
                                    className="relative flex cursor-grab select-none items-center active:cursor-grabbing"
                                >
                                    <Input
                                        value={
                                            field.slug
                                                ? `{{${field.slug}}}`
                                                : ""
                                        }
                                        disabled
                                        placeholder="{{nome_do_campo}}"
                                        className="h-8 w-full bg-muted/50 pr-8 font-mono text-xs text-muted-foreground"
                                    />

                                    {field.slug && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleCopyTag(field.slug)
                                            }
                                            title="Copiar Tag"
                                            className="absolute right-1.5 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                                        >
                                            {copiedSlug === field.slug ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            ) : (
                                                <Copy className="h-3.5 w-3.5" />
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="col-span-4 min-w-0 space-y-1.5">
                                <Label className="text-xs font-medium">
                                    Tipo
                                </Label>

                                <Select
                                    value={field.type}
                                    onValueChange={(value) =>
                                        updateFieldType(field.id, value)
                                    }
                                >
                                    <SelectTrigger className="h-8 w-full overflow-hidden bg-background text-xs">
                                        <SelectValue
                                            placeholder="Selecione"
                                            className="truncate"
                                        />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {fieldTypeOptions.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
