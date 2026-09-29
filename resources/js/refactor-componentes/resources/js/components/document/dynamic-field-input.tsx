import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DynamicField } from '@/types/document';

interface DynamicFieldInputProps {
    field: DynamicField;
    value: string;
    onChange: (value: string) => void;
}

const INPUT_TYPES: Record<string, string> = {
    number: 'number',
    currency: 'number',
    date: 'date',
};

export function DynamicFieldInput({
    field,
    value,
    onChange,
}: DynamicFieldInputProps) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={field.slug} className="text-xs font-medium">
                {field.name}

                {field.required && <span className="ml-1 text-red-500">*</span>}
            </Label>

            {field.type === 'textarea' ? (
                <Textarea
                    id={field.slug}
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(event) => onChange(event.target.value)}
                    className="min-h-[90px] resize-y bg-background"
                />
            ) : (
                <Input
                    id={field.slug}
                    type={INPUT_TYPES[field.type] ?? 'text'}
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(event) => onChange(event.target.value)}
                    className="bg-background"
                />
            )}
        </div>
    );
}
