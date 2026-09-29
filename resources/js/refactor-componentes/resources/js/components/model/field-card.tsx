import { Check, Copy, Trash } from 'lucide-react';
import type { DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { FieldItem, FieldTypeOption } from '@/types/model-template';

interface FieldCardProps {
    field: FieldItem;
    index: number;
    canRemove: boolean;
    typeOptions: FieldTypeOption[];
    copied: boolean;
    onRename: (name: string) => void;
    onTypeChange: (type: string) => void;
    onRemove: () => void;
    onCopy: () => void;
    onDragStart: (event: DragEvent<HTMLDivElement>) => void;
}

export function FieldCard({
    field,
    index,
    canRemove,
    typeOptions,
    copied,
    onRename,
    onTypeChange,
    onRemove,
    onCopy,
    onDragStart,
}: FieldCardProps) {
    return (
        <div className="group relative space-y-3 rounded-xl border bg-card/60 p-3.5 shadow-xs transition-colors hover:bg-card">
            <div className="flex items-center justify-between border-b border-border/40 pb-1">
                <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Campo #{index + 1}
                </span>

                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={onRemove}
                    disabled={!canRemove}
                    title="Excluir campo"
                >
                    <Trash className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nome do Campo</Label>

                <Input
                    value={field.name}
                    onChange={(e) => onRename(e.target.value)}
                    placeholder="Ex: Nome do Cliente"
                    className="h-8 bg-background text-xs"
                />
            </div>

            <div className="grid grid-cols-12 items-start gap-3">
                <div className="col-span-8 space-y-1.5">
                    <Label className="text-xs font-medium">Tag / Slug</Label>

                    <div
                        draggable={!!field.slug}
                        onDragStart={onDragStart}
                        className="relative flex cursor-grab items-center select-none active:cursor-grabbing"
                    >
                        <Input
                            value={field.slug ? `{{${field.slug}}}` : ''}
                            disabled
                            placeholder="{{nome_do_campo}}"
                            className="h-8 w-full bg-muted/50 pr-8 font-mono text-xs text-muted-foreground"
                        />

                        {field.slug && (
                            <button
                                type="button"
                                onClick={onCopy}
                                title="Copiar Tag"
                                className="absolute right-1.5 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                            >
                                {copied ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <div className="col-span-4 min-w-0 space-y-1.5">
                    <Label className="text-xs font-medium">Tipo</Label>

                    <Select value={field.type} onValueChange={onTypeChange}>
                        <SelectTrigger className="h-8 w-full overflow-hidden bg-background text-xs">
                            <SelectValue
                                placeholder="Selecione"
                                className="truncate"
                            />
                        </SelectTrigger>

                        <SelectContent>
                            {typeOptions.map((option) => (
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
    );
}
