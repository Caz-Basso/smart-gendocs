import type { PdfDocumentStructure } from '@/lib/pdf-document';

export interface FieldItem {
    id: string;
    name: string;
    slug: string;
    type: string;
}

export interface FieldTypeOption {
    value: string;
    label: string;
}

export interface ModelData {
    id: string;
    name: string;
    fields: FieldItem[];
    extracted_text: string | null;
    document_structure: PdfDocumentStructure | null;
}

// `type` (e não `interface`) para ser compatível com o generic do useForm.
export type ModelFormData = {
    name: string;
    template: File | null;
    fields: FieldItem[];
    extracted_text: string;
    document_structure: PdfDocumentStructure | null;
};
