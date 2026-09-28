import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Download, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';

type SavedField = {
    id?: string;
    name: string;
    slug: string;
    type?: string;
    placeholder?: string;
    section?: string;
    options?: { value: string; label: string }[];
};

type SavedDocument = {
    id: string;
    name: string;
    data: Record<string, string>;
    fields: SavedField[];
    created_at: string;
};

type Props = {
    document: SavedDocument;
};

export default function EditSavedDocument({ document: savedDocument }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        data: savedDocument.data,
    });
    const fields: SavedField[] = savedDocument.fields.length
        ? savedDocument.fields
        : Object.keys(savedDocument.data).map((slug) => ({ name: slug, slug }));
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

            <div className="mx-auto w-full max-w-3xl p-6">
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

                <form
                    onSubmit={saveDocument}
                    className="space-y-6 rounded-lg border bg-card p-6"
                >
                    {documentError && (
                        <p role="alert" className="text-sm text-destructive">
                            {documentError}
                        </p>
                    )}
                    <div className="grid gap-5 sm:grid-cols-2">
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
                                            <option value="">Selecione</option>
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
                            {processing ? 'Salvando...' : 'Salvar alterações'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
