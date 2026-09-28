import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Download,
    Loader2,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { parsePdfBytes } from '@/lib/pdf-document';
import { index as generatedDocumentsIndex } from '@/routes/generated-documents';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Documentos Gerados',
        href: generatedDocumentsIndex(),
    },
    {
        title: 'Visualizar Documento',
        href: '',
    },
];

interface GeneratedDocument {
    id: string;
    name: string;
    html_content: string | null;
    created_at: string;
    document_model?: {
        id: string;
        name: string;
    };
}

interface Props {
    document: GeneratedDocument;
}

export default function GeneratedDocumentShow({ document }: Props) {
    const { delete: destroy, processing } = useForm();
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [pageImages, setPageImages] = useState<string[]>([]);
    const [isLoadingPdf, setIsLoadingPdf] = useState(false);
    const [pdfError, setPdfError] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function loadPdfPreview() {
            setIsLoadingPdf(true);
            setPdfError(false);

            try {
                const response = await fetch(
                    `/documentos-gerados/${document.id}/download`,
                );

                if (!response.ok) {
                    throw new Error('Não foi possível carregar o PDF.');
                }

                const buffer = await response.arrayBuffer();
                const parsed = await parsePdfBytes(buffer);

                if (!cancelled) {
                    setPageImages(parsed.pageImages);
                    setCurrentPage(0);
                }
            } catch (error) {
                console.error('Erro ao renderizar pré-visualização:', error);

                if (!cancelled) {
                    setPdfError(true);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingPdf(false);
                }
            }
        }

        void loadPdfPreview();

        return () => {
            cancelled = true;
        };
    }, [document.id]);

    const handleDelete = () => {
        destroy(`/documentos-gerados/${document.id}`, {
            onSuccess: () => {
                toast.success('Documento excluído com sucesso!');
                setShowDeleteDialog(false);
            },
            onError: () => {
                toast.error('Erro ao excluir documento.');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Visualizar: ${document.name}`} />

            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button asChild variant="ghost" size="icon">
                            <Link href={generatedDocumentsIndex()}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">
                                {document.name}
                            </h1>
                            {document.document_model && (
                                <p className="text-sm text-muted-foreground">
                                    Modelo: {document.document_model.name}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {pageImages.length > 1 && (
                            <div className="flex items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={currentPage === 0}
                                    onClick={() =>
                                        setCurrentPage((page) =>
                                            Math.max(0, page - 1),
                                        )
                                    }
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs text-muted-foreground">
                                    {currentPage + 1} / {pageImages.length}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={
                                        currentPage >= pageImages.length - 1
                                    }
                                    onClick={() =>
                                        setCurrentPage((page) =>
                                            Math.min(
                                                pageImages.length - 1,
                                                page + 1,
                                            ),
                                        )
                                    }
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <Button asChild variant="outline" disabled={processing}>
                            <Link
                                href={`/documentos-gerados/${document.id}/download`}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Baixar PDF
                            </Link>
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => setShowDeleteDialog(true)}
                            disabled={processing}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                        </Button>
                    </div>
                </div>

                <div className="rounded-lg border bg-white shadow-sm">
                    {isLoadingPdf ? (
                        <div className="flex min-h-[841px] flex-col items-center justify-center gap-3 text-muted-foreground">
                            <Loader2 className="h-7 w-7 animate-spin" />
                            <span className="text-sm">
                                Renderizando pré-visualização...
                            </span>
                        </div>
                    ) : pageImages.length > 0 ? (
                        <div className="flex justify-center p-6">
                            <img
                                src={pageImages[currentPage]}
                                alt={`Página ${currentPage + 1}`}
                                className="block h-auto w-full max-w-[850px] rounded-sm border select-none"
                                draggable={false}
                            />
                        </div>
                    ) : document.html_content && !pdfError ? (
                        <div
                            className="p-8"
                            dangerouslySetInnerHTML={{
                                __html: document.html_content,
                            }}
                        />
                    ) : (
                        <div className="flex min-h-[400px] flex-col items-center justify-center p-12 text-center text-muted-foreground">
                            <p className="text-sm">
                                Visualização em HTML não disponível para este
                                documento.
                            </p>
                            <Button asChild className="mt-4">
                                <Link
                                    href={`/documentos-gerados/${document.id}/download`}
                                >
                                    <Download className="mr-2 h-4 w-4" />
                                    Baixar PDF
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Exclusão</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir este documento? Esta
                            ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            disabled={processing}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={processing}
                        >
                            {processing ? 'Excluindo...' : 'Confirmar Exclusão'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
