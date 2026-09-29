import { Head, router } from "@inertiajs/react";
import { FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import AppLayout from "@/layouts/app-layout";

import { model_registration } from "@/routes";

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

const breadcrumbs = [{ title: "Modelos", href: "/modelos" }];

export default function ModelsIndex({ models }: Props) {
    const [modelToDelete, setModelToDelete] = useState<Model | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const deleteModel = () => {
        if (!modelToDelete || isDeleting) {
            return;
        }

        const modelName = modelToDelete.name;

        setIsDeleting(true);

        router.delete(`/modelos/${modelToDelete.id}`, {
            onSuccess: () => {
                toast.success(`Modelo "${modelName}" excluído.`);
                setModelToDelete(null);
            },
            onError: () => {
                toast.error(
                    "Não foi possível excluir o modelo. Tente novamente.",
                );
            },
            onFinish: () => setIsDeleting(false),
        });
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
                                : ""}
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
                            {isDeleting ? "Excluindo..." : "Excluir modelo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="mx-auto w-full max-w-6xl p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Modelos Cadastrados
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Gerencie os modelos de documentos disponíveis.
                        </p>
                    </div>

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

                        <h2 className="mb-2 text-lg font-medium">
                            Nenhum modelo encontrado
                        </h2>

                        <p className="mb-4 text-sm text-muted-foreground">
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
                    <div className="overflow-hidden rounded-lg border bg-card">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="border-b text-left">
                                        <th className="px-4 py-3 font-medium">
                                            Modelo
                                        </th>

                                        <th className="px-4 py-3 font-medium">
                                            Criado por
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
                                    {models.map((model) => (
                                        <tr
                                            key={model.id}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-4 font-medium">
                                                {model.name}
                                            </td>

                                            <td className="px-4 py-4 text-muted-foreground">
                                                {model.user?.name ||
                                                    "Desconhecido"}
                                            </td>

                                            <td className="px-4 py-4 text-muted-foreground">
                                                {new Date(
                                                    model.created_at,
                                                ).toLocaleDateString("pt-BR")}
                                            </td>

                                            <td className="px-4 py-3">
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
                                                        onClick={() =>
                                                            setModelToDelete(
                                                                model,
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
