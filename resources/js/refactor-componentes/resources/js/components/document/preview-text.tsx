import { formatValue } from '@/lib/document-fields';
import type { DynamicField } from '@/types/document';

interface PreviewTextProps {
    text: string;
    fields: DynamicField[];
    data: Record<string, string>;
}

export function PreviewText({ text, fields, data }: PreviewTextProps) {
    const parts = text.split(/(\{\{[^}]+\}\})/g);

    return (
        <>
            {parts.map((part, index) => {
                const match = part.match(/^\{\{(.+)\}\}$/);

                if (!match) return <span key={index}>{part}</span>;

                const slug = match[1];
                const field = fields.find((item) => item.slug === slug);
                const value = formatValue(field, data[slug]);

                if (!value) {
                    return (
                        <span
                            key={index}
                            className="rounded bg-amber-100 px-1 py-0.5 font-medium text-amber-800"
                        >
                            [{field?.name ?? slug}]
                        </span>
                    );
                }

                return <strong key={index}>{value}</strong>;
            })}
        </>
    );
}
