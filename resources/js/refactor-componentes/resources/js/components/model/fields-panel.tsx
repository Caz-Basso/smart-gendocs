import { Plus } from 'lucide-react';
import type { DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import type { FieldItem, FieldTypeOption } from '@/types/model-template';
import { FieldCard } from './field-card';

interface FieldsPanelProps {
    fields: FieldItem[];
    typeOptions: FieldTypeOption[];
    copiedSlug: string | null;
    onAdd: () => void;
    onRename: (id: string, name: string) => void;
    onTypeChange: (id: string, type: string) => void;
    onRemove: (id: string) => void;
    onCopy: (slug: string) => void;
    onDragStart: (event: DragEvent<HTMLDivElement>, slug: string) => void;
}

export function FieldsPanel({
    fields,
    typeOptions,
    copiedSlug,
    onAdd,
    onRename,
    onTypeChange,
    onRemove,
    onCopy,
    onDragStart,
}: FieldsPanelProps) {
    return (
        <>
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Campos Dinâmicos
                </h2>

                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                    {fields.length} {fields.length === 1 ? 'campo' : 'campos'}
                </span>
            </div>

            <div className="-mr-2 max-h-[420px] space-y-3 overflow-y-auto pr-2">
                {fields.map((field, index) => (
                    <FieldCard
                        key={field.id}
                        field={field}
                        index={index}
                        canRemove={fields.length > 1}
                        typeOptions={typeOptions}
                        copied={copiedSlug === field.slug}
                        onRename={(name) => onRename(field.id, name)}
                        onTypeChange={(type) => onTypeChange(field.id, type)}
                        onRemove={() => onRemove(field.id)}
                        onCopy={() => onCopy(field.slug)}
                        onDragStart={(event) => onDragStart(event, field.slug)}
                    />
                ))}
            </div>

            <Button
                type="button"
                onClick={onAdd}
                variant="outline"
                className="h-9 w-full border-dashed text-xs font-medium tracking-wide uppercase"
            >
                <Plus className="mr-1.5 h-4 w-4" />
                Adicionar novo campo
            </Button>
        </>
    );
}
