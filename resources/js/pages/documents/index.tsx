import { Head, Link, router } from '@inertiajs/react';
import { Download, FileText, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';

type SavedDocument = {
    id: string;
    name: string;
    model_key: string;
    created_at: string;
};

type Props = {
    documents: SavedDocument[];
};

const breadcrumbs = [{ title: 'Meus documentos', href: '/documentos' }];

export default function DocumentsIndex({ documents }: Props) {
    const [documentToDelete, setDocumentToDelete] =
        useState<SavedDocument | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    function deleteDocument() {
        if (!documentToDelete || isDeleting) {
            return;
        }

        setIsDeleting(true);
        router.delete(`/documentos/${documentToDelete.id}`, {
            onSuccess: () => {
                toast.success('Documento excluído.');
                setDocumentToDelete(null);
            },
            onError: () => toast.error('Não foi possível excluir o documento.'),
            onFinish: () => setIsDeleting(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Meus documentos" />

            <Dialog
                open={documentToDelete !== null}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setDocumentToDelete(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir documento?</DialogTitle>
                        <DialogDescription>
                            {documentToDelete
                                ? `“${documentToDelete.name}” será removido permanentemente.`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isDeleting}
                            onClick={() => setDocumentToDelete(null)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={deleteDocument}
                        >
                            {isDeleting ? 'Excluindo...' : 'Excluir documento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="mx-auto w-full max-w-6xl p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Meus documentos</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Documentos gerados e salvos na sua conta.
                    </p>
                </div>

                {documents.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed py-12 text-center">
                        <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <h2 className="mb-2 text-lg font-medium">
                            Você ainda não tem documentos salvos
                        </h2>
                        <p className="mb-4 text-sm text-muted-foreground">
                            Gere um documento no dashboard para salvá-lo e
                            baixá-lo.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard">Ir para o dashboard</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-lg border bg-card">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="border-b text-left">
                                        <th className="px-4 py-3 font-medium">
                                            Documento
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Criado em
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documents.map((savedDocument) => (
                                        <tr
                                            key={savedDocument.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-4 font-medium">
                                                {savedDocument.name}
                                            </td>
                                            <td className="px-4 py-4 text-muted-foreground">
                                                {new Date(
                                                    savedDocument.created_at,
                                                ).toLocaleString('pt-BR')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <a
                                                            href={`/documentos/${savedDocument.id}/baixar`}
                                                        >
                                                            <Download className="mr-2 h-4 w-4" />
                                                            Baixar
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={`/documentos/${savedDocument.id}/editar`}
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() =>
                                                            setDocumentToDelete(
                                                                savedDocument,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Excluir
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
