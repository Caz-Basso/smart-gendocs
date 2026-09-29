import { Head } from '@inertiajs/react';
import { ModelForm } from '@/components/model/model-form';
import AppLayout from '@/layouts/app-layout';
import { model_registration } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import type { FieldTypeOption } from '@/types/model-template';

interface Props {
    fieldTypeOptions: FieldTypeOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Cadastro de Modelos', href: model_registration() },
];

export default function ModelRegistration({ fieldTypeOptions = [] }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cadastro de Modelos" />

            <ModelForm mode="create" fieldTypeOptions={fieldTypeOptions} />
        </AppLayout>
    );
}
