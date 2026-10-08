import { Head } from '@inertiajs/react';
import { ModelForm } from '@/components/model/model-form';
import AppLayout from '@/layouts/app-layout';
import { model_registration } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import type { DocumentElement } from '@/types/document-element';
import type { FieldTypeOption, ModelData } from '@/types/model-template';

interface Props {
    fieldTypeOptions: FieldTypeOption[];
    model: ModelData;
    templateUrl: string | null;
    templateIsPdf: boolean;
    availableElements?: DocumentElement[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Editar Modelo', href: model_registration() },
];

export default function ModelEdit({
    fieldTypeOptions = [],
    model,
    templateUrl,
    templateIsPdf,
    availableElements = [],
}: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Modelo" />

            <ModelForm
                mode="edit"
                fieldTypeOptions={fieldTypeOptions}
                model={model}
                templateUrl={templateUrl}
                templateIsPdf={templateIsPdf}
                availableElements={availableElements}
            />
        </AppLayout>
    );
}
