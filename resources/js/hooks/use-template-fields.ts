import { slugify } from '@/lib/template-utils';
import type { FieldItem } from '@/types/model-template';

export function useTemplateFields(
    fields: FieldItem[],
    setFields: (fields: FieldItem[]) => void,
) {
    const add = () =>
        setFields([
            ...fields,
            { id: crypto.randomUUID(), name: '', slug: '', type: 'text' },
        ]);

    const remove = (id: string) => {
        if (fields.length <= 1) return;

        setFields(fields.filter((field) => field.id !== id));
    };

    const patch = (id: string, changes: Partial<FieldItem>) =>
        setFields(
            fields.map((field) =>
                field.id === id ? { ...field, ...changes } : field,
            ),
        );

    const rename = (id: string, name: string) =>
        patch(id, { name, slug: slugify(name) });

    const setType = (id: string, type: string) => patch(id, { type });

    return { add, remove, rename, setType };
}
