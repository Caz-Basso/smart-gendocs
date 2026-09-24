import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { Plus, FileText, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { model_registration } from '@/routes';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface Model {
    id: string;
    name: string;
    created_at: string;
    user?: {
        name: string;
    };
}

interface Props {
    models: Model[];
}

const breadcrumbs = [{ title: 'Modelos', href: '/modelos' }];

export default function ModelsIndex({ models }: Props) {
    const [modelToDelete, setModelToDelete] = useState<Model | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteModel = () => {
        if (!modelToDelete || isDeleting) {
            return;
        }

        const modelName = modelToDelete.name;

        router.delete(`/modelos/${modelToDelete.id}`, {
            onSuccess: () => {
                toast.success(`Modelo "${modelName}" excluído.`);
                setModelToDelete(null);
            },
            onError: () => {
                toast.error('Não foi possível excluir o modelo. Tente novamente.');
            },
            onFinish: () => setIsDeleting(false),
        });

        setIsDeleting(true);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Modelos" />

            <Dialog
                open={modelToDelete !== null}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setModelToDelete(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir modelo?</DialogTitle>
                        <DialogDescription>
                            {modelToDelete
                                ? `O modelo "${modelToDelete.name}" e o arquivo PDF/DOCX associado serão excluídos permanentemente. Essa ação não pode ser desfeita.`
                                : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isDeleting}
                            onClick={() => setModelToDelete(null)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={deleteModel}
                        >
                            {isDeleting ? 'Excluindo...' : 'Excluir modelo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="mx-auto max-w-[1600px] p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Modelos Cadastrados</h1>
                    <Button asChild>
                        <a href={model_registration.url()}>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Modelo
                        </a>
                    </Button>
                </div>

                {models.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed py-12 text-center">
                        <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <h3 className="mb-2 text-lg font-medium">
                            Nenhum modelo encontrado
                        </h3>
                        <p className="mb-4 text-muted-foreground">
                            Comece criando seu primeiro modelo de documento.
                        </p>
                        <Button asChild>
                            <a href={model_registration.url()}>
                                <Plus className="mr-2 h-4 w-4" />
                                Criar Modelo
                            </a>
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-md border bg-card text-card-foreground shadow-sm">
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="bg-muted/50 [&_tr]:border-b">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                            Nome do Modelo
                                        </th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                            Criado por
                                        </th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                                            Data de Criação
                                        </th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {models.map((model) => (
                                        <tr
                                            key={model.id}
                                            className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                                        >
                                            <td className="p-4 align-middle font-medium">
                                                {model.name}
                                            </td>
                                            <td className="p-4 align-middle">
                                                {model.user?.name ||
                                                    'Desconhecido'}
                                            </td>
                                            <td className="p-4 align-middle">
                                                {new Date(
                                                    model.created_at,
                                                ).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="p-4 text-right align-middle">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <a
                                                            href={`/modelos/${model.id}/editar`}
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => setModelToDelete(model)}
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
