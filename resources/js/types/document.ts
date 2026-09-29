export type FieldType =
    | 'text'
    | 'textarea'
    | 'number'
    | 'date'
    | 'email'
    | 'phone'
    | 'cpf'
    | 'cnpj'
    | 'cep'
    | 'currency';

export interface FieldOption {
    value: string;
    label: string;
}

export interface DynamicField {
    id: string;
    name: string;
    slug: string;
    type: FieldType;
    section?: string;
    required?: boolean;
    placeholder?: string;
    helpText?: string;
    defaultValue?: string;
    options?: FieldOption[];
}

export interface DocumentModel {
    id: string;
    name: string;
    description?: string;
    fileName?: string;
    fields: DynamicField[];
    defaultData?: Record<string, string>;
    preview?: string[];
}

const option = (value: string, label: string): FieldOption => ({
    value,
    label,
});

