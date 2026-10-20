import type { DocumentModel, DynamicField } from '@/types/document';

export function getInitialData(model?: DocumentModel): Record<string, string> {
    if (!model) return {};

    const result: Record<string, string> = {};

    model.fields.forEach((field) => {
        result[field.slug] = field.defaultValue ?? '';
    });

    Object.assign(result, model.defaultData ?? {});

    return result;
}

export function formatValue(
    field: DynamicField | undefined,
    value: string | undefined,
): string {
    if (!value) return '';
    if (!field) return value;

    if (field.type === 'checkbox') {
        return value === 'true' ? 'Sim' : 'Não';
    }

    if (field.type === 'select' || field.type === 'radio') {
        const option = field.options?.find((item) => item.value === value);

        return option?.label ?? value;
    }

    if (field.type === 'currency') {
        const numericValue = Number(value.replace(/\D/g, '')) / 100;

        if (!Number.isNaN(numericValue)) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
            }).format(numericValue);
        }
    }

    if (field.type === 'date') {
        const parts = value.split('-');

        if (parts.length === 3) {
            const [year, month, day] = parts;

            return `${day}/${month}/${year}`;
        }
    }

    return value;
}

export function groupFieldsBySection(
    fields: DynamicField[] | undefined,
): [string, DynamicField[]][] {
    if (!fields) return [];

    const grouped = new Map<string, DynamicField[]>();

    fields.forEach((field) => {
        const section = field.section ?? 'Dados do Documento';
        const list = grouped.get(section) ?? [];

        list.push(field);
        grouped.set(section, list);
    });

    return Array.from(grouped.entries());
}
