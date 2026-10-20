import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Download, Save } from 'lucide-react';
import { toast } from 'sonner';
import { DocumentPreview } from '@/components/document/document-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { DynamicField } from '@/types/document';

type SavedField = Omit<DynamicField, 'id' | 'type'> & {
    id?: string;
    type?: DynamicField['type'] | 'select';
};

type SavedDocument = {
    id: string;
    name: string;
    data?: Record<string, string | null> | null;
    fields?: SavedField[] | null;
    preview?: (string | null)[] | null;
    extracted_html?: string | null;
    created_at: string;
};

type Props = {
    document: SavedDocument;
};

export default function EditSavedDocument({ document: savedDocument }: Props) {
    const initialData = Object.fromEntries(
        Object.entries(savedDocument.data ?? {}).map(([slug, value]) => [
            slug,
            value ?? '',
        ]),
    );
    const { data, setData, put, processing, errors } = useForm({
        data: initialData,
    });
    const fields: SavedField[] = savedDocument.fields?.length
        ? savedDocument.fields
        : Object.keys(initialData).map((slug) => ({ name: slug, slug }));
    const previewFields: DynamicField[] = fields.map((field) => ({
        ...field,
        id: field.id ?? field.slug,
        type: field.type === 'select' ? 'text' : (field.type ?? 'text'),
    }));
    const documentError = (errors as unknown as Record<string, string>)
        .document;

    function saveDocument(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        put(`/documentos/${savedDocument.id}`, {
            onSuccess: () => toast.success('Documento atualizado.'),
            onError: () =>
                toast.error('Não foi possível atualizar o documento.'),
        });
    }

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Meus documentos', href: '/documentos' },
                {
                    title: 'Editar documento',
                    href: `/documentos/${savedDocument.id}/editar`,
                },
            ]}
        >
            <Head title={`Editar ${savedDocument.name}`} />

            <div className="mx-auto w-full max-w-[1600px] p-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">Editar documento</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {savedDocument.name}
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <a href={`/documentos/${savedDocument.id}/baixar`}>
                            <Download className="mr-2 h-4 w-4" />
                            Baixar PDF atual
                        </a>
                    </Button>
                </div>

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                    <form
                        onSubmit={saveDocument}
                        className="space-y-6 rounded-lg border bg-card p-6 lg:col-span-4"
                    >
                        <div>
                            <h2 className="text-base font-semibold">
                                Campos do documento
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                As alterações aparecem na pré-visualização.
                            </p>
                        </div>

                        {documentError && (
                            <p
                                role="alert"
                                className="text-sm text-destructive"
                            >
                                {documentError}
                            </p>
                        )}
                        <div className="grid gap-5">
                            {fields.map((field) => {
                                const value = data.data[field.slug] ?? '';
                                const fieldId = field.id ?? field.slug;

                                return (
                                    <div key={fieldId} className="space-y-2">
                                        <Label htmlFor={fieldId}>
                                            {field.name}
                                        </Label>
                                        {field.type === 'textarea' ? (
                                            <Textarea
                                                id={fieldId}
                                                value={value}
                                                placeholder={field.placeholder}
                                                onChange={(event) =>
                                                    setData('data', {
                                                        ...data.data,
                                                        [field.slug]:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        ) : field.type === 'select' &&
                                          field.options?.length ? (
                                            <select
                                                id={fieldId}
                                                value={value}
                                                onChange={(event) =>
                                                    setData('data', {
                                                        ...data.data,
                                                        [field.slug]:
                                                            event.target.value,
                                                    })
                                                }
                                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                            >
                                                <option value="">
                                                    Selecione
                                                </option>
                                                {field.options.map((option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <Input
                                                id={fieldId}
                                                type={
                                                    field.type === 'date' ||
                                                    field.type === 'number'
                                                        ? field.type
                                                        : 'text'
                                                }
                                                value={value}
                                                placeholder={field.placeholder}
                                                onChange={(event) =>
                                                    setData('data', {
                                                        ...data.data,
                                                        [field.slug]:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex flex-wrap justify-between gap-3 border-t pt-4">
                            <Button type="button" variant="outline" asChild>
                                <Link href="/documentos">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Voltar
                                </Link>
                            </Button>
                            <Button type="submit" disabled={processing}>
                                <Save className="mr-2 h-4 w-4" />
                                {processing
                                    ? 'Salvando...'
                                    : 'Salvar alterações'}
                            </Button>
                        </div>
                    </form>

                    <section className="min-w-0 lg:col-span-8">
                        <h2 className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Pré-visualização do documento
                        </h2>
                        <DocumentPreview
                            preview={savedDocument.preview ?? undefined}
                            extractedHtml={savedDocument.extracted_html}
                            fields={previewFields}
                            data={data.data}
                        />
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
