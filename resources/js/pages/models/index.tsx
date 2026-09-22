import AppLayout from "@/layouts/app-layout";
import { Head } from "@inertiajs/react";
import { model_registration } from "@/routes";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Pencil } from 'lucide-react';

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

const breadcrumbs = [
    { title: 'Modelos', href: '/modelos' },
];

export default function ModelsIndex({ models }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Modelos" />

            <div className="p-6 max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold">Modelos Cadastrados</h1>
                    <Button asChild>
                        <a href={model_registration.url()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Novo Modelo
                        </a>
                    </Button>
                </div>

                {models.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Nenhum modelo encontrado</h3>
                        <p className="text-muted-foreground mb-4">Comece criando seu primeiro modelo de documento.</p>
                        <Button asChild>
                            <a href={model_registration.url()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Criar Modelo
                            </a>
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-md border bg-card text-card-foreground shadow-sm">
                        <div className="relative w-full overflow-auto">
                            <table className="w-full caption-bottom text-sm">
                                <thead className="[&_tr]:border-b bg-muted/50">
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Nome do Modelo</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Criado por</th>
                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Data de Criação</th>
                                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="[&_tr:last-child]:border-0">
                                    {models.map((model) => (
                                        <tr key={model.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <td className="p-4 align-middle font-medium">{model.name}</td>
                                            <td className="p-4 align-middle">{model.user?.name || 'Desconhecido'}</td>
                                            <td className="p-4 align-middle">{new Date(model.created_at).toLocaleDateString('pt-BR')}</td>
                                            <td className="p-4 align-middle text-right">
                                                <Button variant="outline" size="sm" asChild>
                                                    <a href={`/modelos/${model.id}/editar`}>
                                                        <Pencil className="h-4 w-4 mr-2" />
                                                        Editar
                                                    </a>
                                                </Button>
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
