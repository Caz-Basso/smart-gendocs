import { Head, Link, router } from "@inertiajs/react";
import {
    AlertCircle,
    CheckCircle2,
    Eye,
    Layers,
    Pencil,
    Plus,
    Search,
    Trash2,
    XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import AppLayout from "@/layouts/app-layout";
import documentElements from "@/routes/document-elements";
import type { DocumentElement } from "@/types/document-element";

interface Props {
    elements: DocumentElement[];
    filters?: {
        type?: string;
        search?: string;
    };
}

const breadcrumbs = [
    { title: "Cabeçalhos e Rodapés", href: "/elementos" },
];

export default function DocumentElementsIndex({ elements }: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedType, setSelectedType] = useState<"all" | "header" | "footer">("all");
    const [elementToDelete, setElementToDelete] = useState<DocumentElement | null>(null);
    const [previewElement, setPreviewElement] = useState<DocumentElement | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState<string | null>(null);

    const filteredElements = elements.filter((el) => {
        const matchesSearch =
            !searchTerm ||
            el.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType =
            selectedType === "all" || el.type === selectedType;
        return matchesSearch && matchesType;
    });

    const toggleActive = (element: DocumentElement) => {
        if (isToggling) return;
        setIsToggling(element.id);

        router.patch(
            documentElements.toggleActive.url({ element: element.id }),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        `Elemento "${element.name}" ${
                            element.is_active ? "desativado" : "ativado"
                        }.`,
                    );
                },
                onError: () => {
                    toast.error("Erro ao alterar status do elemento.");
                },
                onFinish: () => setIsToggling(null),
            },
        );
    };

    const handleDelete = () => {
        if (!elementToDelete || isDeleting) return;

        setIsDeleting(true);
        router.delete(
            documentElements.destroy.url({ element: elementToDelete.id }),
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(`Elemento "${elementToDelete.name}" excluído.`);
                    setElementToDelete(null);
                },
                onError: (errors) => {
                    const message =
                        errors.error ||
                        "Não foi possível excluir o elemento.";
                    toast.error(message);
                },
                onFinish: () => setIsDeleting(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cabeçalhos e Rodapés" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
                {/* Header Section */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                            Cabeçalhos e Rodapés
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Cadastre imagens reutilizáveis com dimensões e posicionamento visual em milímetros.
                        </p>
                    </div>

                    <Link href={documentElements.create()}>
                        <Button className="cursor-pointer gap-2">
                            <Plus className="h-4 w-4" />
                            Novo Elemento
                        </Button>
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                        <Input
                            placeholder="Buscar por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="flex gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setSelectedType("all")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                selectedType === "all"
                                    ? "bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white"
                                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                            }`}
                        >
                            Todos ({elements.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType("header")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                selectedType === "header"
                                    ? "bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white"
                                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                            }`}
                        >
                            Cabeçalhos (
                            {elements.filter((e) => e.type === "header").length}
                            )
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType("footer")}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                                selectedType === "footer"
                                    ? "bg-white dark:bg-neutral-900 shadow-sm text-neutral-900 dark:text-white"
                                    : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                            }`}
                        >
                            Rodapés (
                            {elements.filter((e) => e.type === "footer").length}
                            )
                        </button>
                    </div>
                </div>

                {/* Elements Grid */}
                {filteredElements.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
                            <Layers className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-lg">Nenhum elemento encontrado</CardTitle>
                        <CardDescription className="max-w-md mt-1 mb-6">
                            {elements.length === 0
                                ? "Você ainda não cadastrou nenhum cabeçalho ou rodapé reutilizável. Cadastre o primeiro para utilizar nos seus modelos."
                                : "Nenhum elemento corresponde aos filtros selecionados."}
                        </CardDescription>
                        {elements.length === 0 && (
                            <Link href={documentElements.create()}>
                                <Button className="gap-2 cursor-pointer">
                                    <Plus className="h-4 w-4" />
                                    Cadastrar Primeiro Elemento
                                </Button>
                            </Link>
                        )}
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredElements.map((el) => {
                            const inUseCount = el.model_elements_count ?? 0;
                            const isHeader = el.type === "header";

                            return (
                                <Card
                                    key={el.id}
                                    className={`overflow-hidden transition-all hover:shadow-md border ${
                                        !el.is_active ? "opacity-70 bg-neutral-50/50 dark:bg-neutral-900/50" : ""
                                    }`}
                                >
                                    <div className="relative h-40 bg-neutral-100 dark:bg-neutral-800 border-b flex items-center justify-center p-3 overflow-hidden group">
                                        <img
                                            src={el.image_url}
                                            alt={el.name}
                                            className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform group-hover:scale-105"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setPreviewElement(el)}
                                            className="absolute inset-0 bg-black/40 text-white flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer font-medium text-xs backdrop-blur-[1px]"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Visualizar
                                        </button>
                                        <div className="absolute top-2 left-2">
                                            <Badge
                                                variant={isHeader ? "default" : "secondary"}
                                                className="uppercase text-[10px] tracking-wide"
                                            >
                                                {isHeader ? "Cabeçalho" : "Rodapé"}
                                            </Badge>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleActive(el)}
                                                disabled={isToggling === el.id}
                                                className={`cursor-pointer inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
                                                    el.is_active
                                                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200"
                                                        : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400 hover:bg-neutral-300"
                                                }`}
                                            >
                                                {el.is_active ? (
                                                    <>
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        Ativo
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-3 h-3 text-neutral-500" />
                                                        Inativo
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="text-base font-semibold leading-snug line-clamp-1">
                                                {el.name}
                                            </CardTitle>
                                        </div>
                                        <CardDescription className="text-xs space-y-1">
                                            <div className="flex items-center justify-between text-neutral-500">
                                                <span>Dimensões:</span>
                                                <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                                                    {el.width}mm × {el.height}mm
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-neutral-500">
                                                <span>Posição inicial:</span>
                                                <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                                                    X: {el.position_x}mm | Y: {el.position_y}mm
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-neutral-500 pt-1">
                                                <span>Uso em modelos:</span>
                                                <span
                                                    className={`font-semibold ${
                                                        inUseCount > 0
                                                            ? "text-blue-600 dark:text-blue-400"
                                                            : "text-neutral-400"
                                                    }`}
                                                >
                                                    {inUseCount}{" "}
                                                    {inUseCount === 1 ? "modelo" : "modelos"}
                                                </span>
                                            </div>
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="p-4 pt-2 border-t flex items-center justify-end gap-2 bg-neutral-50/50 dark:bg-neutral-900/20">
                                        <Link
                                            href={documentElements.edit({ element: el.id })}
                                            className="cursor-pointer"
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-1.5 h-8 text-xs cursor-pointer"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Editar
                                            </Button>
                                        </Link>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={inUseCount > 0}
                                            onClick={() => setElementToDelete(el)}
                                            title={
                                                inUseCount > 0
                                                    ? `Em uso em ${inUseCount} modelo(s)`
                                                    : "Excluir elemento"
                                            }
                                            className={`gap-1.5 h-8 text-xs cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 ${
                                                inUseCount > 0 ? "opacity-40 cursor-not-allowed" : ""
                                            }`}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Excluir
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal de confirmação de exclusão */}
            <Dialog
                open={elementToDelete !== null}
                onOpenChange={(open) => {
                    if (!open && !isDeleting) {
                        setElementToDelete(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Elemento?</DialogTitle>
                        <DialogDescription>
                            {elementToDelete && (
                                <>
                                    Tem certeza de que deseja excluir o elemento{" "}
                                    <strong>"{elementToDelete.name}"</strong>?
                                    Essa ação removerá o arquivo de imagem e não poderá ser desfeita.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            disabled={isDeleting}
                            onClick={() => setElementToDelete(null)}
                            className="cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={isDeleting}
                            onClick={handleDelete}
                            className="cursor-pointer"
                        >
                            {isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal de Pré-visualização Ampliada */}
            <Dialog
                open={previewElement !== null}
                onOpenChange={(open) => !open && setPreviewElement(null)}
            >
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span>{previewElement?.name}</span>
                            {previewElement && (
                                <Badge variant={previewElement.type === "header" ? "default" : "secondary"}>
                                    {previewElement.type === "header" ? "Cabeçalho" : "Rodapé"}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Dimensões padrão: {previewElement?.width}mm × {previewElement?.height}mm | Posição: X: {previewElement?.position_x}mm, Y: {previewElement?.position_y}mm
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center min-h-[240px] max-h-[500px] overflow-auto">
                        {previewElement && (
                            <img
                                src={previewElement.image_url}
                                alt={previewElement.name}
                                className="max-w-full max-h-[450px] object-contain drop-shadow"
                            />
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPreviewElement(null)}
                            className="cursor-pointer"
                        >
                            Fechar
                        </Button>
                        {previewElement && (
                            <Link href={documentElements.edit({ element: previewElement.id })}>
                                <Button className="gap-2 cursor-pointer">
                                    <Pencil className="w-4 h-4" />
                                    Editar Elemento
                                </Button>
                            </Link>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

