import { Head, Link } from '@inertiajs/react';
import { FileText, Download, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { index as generatedDocumentsIndex } from '@/routes/generated-documents';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Documentos Gerados',
        href: generatedDocumentsIndex(),
    },
];

interface GeneratedDocument {
    id: string;
    name: string;
    created_at: string;
    document_model?: {
        id: string;
        name: string;
    };
}

interface Props {
    documents: GeneratedDocument[];
}

export default function GeneratedDocumentsIndex({ documents }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Documentos Gerados" />

            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Documentos Gerados
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Visualize e baixe seus documentos gerados
                        </p>
                    </div>
                </div>

                {documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                        <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                        <h3 className="mb-2 text-lg font-semibold">
                            Nenhum documento gerado
                        </h3>
                        <p className="mb-4 text-sm text-muted-foreground">
                            Comece gerando documentos a partir dos modelos
                            disponíveis no dashboard.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard">
                                <Plus className="mr-2 h-4 w-4" />
                                Ir para Dashboard
                            </Link>
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-lg border">
                        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3">
                            {documents.map((document) => (
                                <div
                                    key={document.id}
                                    className="flex flex-col space-y-3 rounded-lg border p-4"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="font-semibold">
                                                {document.name}
                                            </h3>
                                            {document.document_model && (
                                                <p className="text-xs text-muted-foreground">
                                                    Modelo:{' '}
                                                    {
                                                        document.document_model
                                                            .name
                                                    }
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(
                                                    document.created_at,
                                                ).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                        >
                                            <Link
                                                href={`/documentos-gerados/${document.id}`}
                                            >
                                                <FileText className="mr-2 h-4 w-4" />
                                                Visualizar
                                            </Link>
                                        </Button>
                                        <Button
                                            asChild
                                            variant="default"
                                            size="sm"
                                            className="flex-1"
                                        >
                                            <Link
                                                href={`/documentos-gerados/${document.id}/download`}
                                            >
                                                <Download className="mr-2 h-4 w-4" />
                                                Baixar
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
