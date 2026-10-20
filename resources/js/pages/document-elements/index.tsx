import { Head, Link, router } from '@inertiajs/react';
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
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import documentElements from '@/routes/document-elements';
import type { DocumentElement } from '@/types/document-element';

interface Props {
    elements: DocumentElement[];
    filters?: {
        type?: string;
        search?: string;
    };
}

const breadcrumbs = [{ title: 'Cabeçalhos e Rodapés', href: '/elementos' }];

export default function DocumentElementsIndex({ elements }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<
        'all' | 'header' | 'footer'
    >('all');
    const [elementToDelete, setElementToDelete] =
        useState<DocumentElement | null>(null);
    const [previewElement, setPreviewElement] =
        useState<DocumentElement | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isToggling, setIsToggling] = useState<string | null>(null);

    const filteredElements = elements.filter((el) => {
        const matchesSearch =
            !searchTerm ||
            el.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedType === 'all' || el.type === selectedType;
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
                            element.is_active ? 'desativado' : 'ativado'
                        }.`,
                    );
                },
                onError: () => {
                    toast.error('Erro ao alterar status do elemento.');
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
                    toast.success(
                        `Elemento "${elementToDelete.name}" excluído.`,
                    );
                    setElementToDelete(null);
                },
                onError: (errors) => {
                    const message =
                        errors.error || 'Não foi possível excluir o elemento.';
                    toast.error(message);
                },
                onFinish: () => setIsDeleting(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cabeçalhos e Rodapés" />

            <div className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header Section */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                            Cabeçalhos e Rodapés
                        </h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Cadastre imagens reutilizáveis com dimensões e
                            posicionamento visual em milímetros.
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
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute top-2.5 left-3 h-4 w-4 text-neutral-400" />
                        <Input
                            placeholder="Buscar por nome..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <div className="flex w-full gap-1.5 rounded-lg bg-neutral-100 p-1 sm:w-auto dark:bg-neutral-800">
                        <button
                            type="button"
                            onClick={() => setSelectedType('all')}
                            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                                selectedType === 'all'
                                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
                            }`}
                        >
                            Todos ({elements.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('header')}
                            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                                selectedType === 'header'
                                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
                            }`}
                        >
                            Cabeçalhos (
                            {elements.filter((e) => e.type === 'header').length}
                            )
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedType('footer')}
                            className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                                selectedType === 'footer'
                                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white'
                                    : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'
                            }`}
                        >
                            Rodapés (
                            {elements.filter((e) => e.type === 'footer').length}
                            )
                        </button>
                    </div>
                </div>

                {/* Elements Grid */}
                {filteredElements.length === 0 ? (
                    <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                            <Layers className="h-6 w-6" />
                        </div>
                        <CardTitle className="text-lg">
                            Nenhum elemento encontrado
                        </CardTitle>
                        <CardDescription className="mt-1 mb-6 max-w-md">
                            {elements.length === 0
                                ? 'Você ainda não cadastrou nenhum cabeçalho ou rodapé reutilizável. Cadastre o primeiro para utilizar nos seus modelos.'
                                : 'Nenhum elemento corresponde aos filtros selecionados.'}
                        </CardDescription>
                        {elements.length === 0 && (
                            <Link href={documentElements.create()}>
                                <Button className="cursor-pointer gap-2">
                                    <Plus className="h-4 w-4" />
                                    Cadastrar Primeiro Elemento
                                </Button>
                            </Link>
                        )}
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {filteredElements.map((el) => {
                            const inUseCount = el.model_elements_count ?? 0;
                            const isHeader = el.type === 'header';

                            return (
                                <Card
                                    key={el.id}
                                    className={`overflow-hidden border transition-all hover:shadow-md ${
                                        !el.is_active
                                            ? 'bg-neutral-50/50 opacity-70 dark:bg-neutral-900/50'
                                            : ''
                                    }`}
                                >
                                    <div className="group relative flex h-40 items-center justify-center overflow-hidden border-b bg-neutral-100 p-3 dark:bg-neutral-800">
                                        <img
                                            src={el.image_url}
                                            alt={el.name}
                                            className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform group-hover:scale-105"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPreviewElement(el)
                                            }
                                            className="absolute inset-0 flex cursor-pointer items-center justify-center gap-2 bg-black/40 text-xs font-medium text-white opacity-0 backdrop-blur-[1px] transition-opacity group-hover:opacity-100"
                                        >
                                            <Eye className="h-4 w-4" />
                                            Visualizar
                                        </button>
                                        <div className="absolute top-2 left-2">
                                            <Badge
                                                variant={
                                                    isHeader
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                                className="text-[10px] tracking-wide uppercase"
                                            >
                                                {isHeader
                                                    ? 'Cabeçalho'
                                                    : 'Rodapé'}
                                            </Badge>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            <button
                                                type="button"
                                                onClick={() => toggleActive(el)}
                                                disabled={isToggling === el.id}
                                                className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                                                    el.is_active
                                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : 'bg-neutral-200 text-neutral-600 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-400'
                                                }`}
                                            >
                                                {el.is_active ? (
                                                    <>
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                        Ativo
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="h-3 w-3 text-neutral-500" />
                                                        Inativo
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <CardTitle className="line-clamp-1 text-base leading-snug font-semibold">
                                                {el.name}
                                            </CardTitle>
                                        </div>
                                        <CardDescription className="space-y-1 text-xs">
                                            <div className="flex items-center justify-between text-neutral-500">
                                                <span>Dimensões:</span>
                                                <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                                                    {el.width}mm × {el.height}mm
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-neutral-500">
                                                <span>Posição inicial:</span>
                                                <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                                                    X: {el.position_x}mm | Y:{' '}
                                                    {el.position_y}mm
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-1 text-neutral-500">
                                                <span>Uso em modelos:</span>
                                                <span
                                                    className={`font-semibold ${
                                                        inUseCount > 0
                                                            ? 'text-blue-600 dark:text-blue-400'
                                                            : 'text-neutral-400'
                                                    }`}
                                                >
                                                    {inUseCount}{' '}
                                                    {inUseCount === 1
                                                        ? 'modelo'
                                                        : 'modelos'}
                                                </span>
                                            </div>
                                        </CardDescription>
                                    </CardHeader>

                                    <CardContent className="flex items-center justify-end gap-2 border-t bg-neutral-50/50 p-4 pt-2 dark:bg-neutral-900/20">
                                        <Link
                                            href={documentElements.edit({
                                                element: el.id,
                                            })}
                                            className="cursor-pointer"
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 cursor-pointer gap-1.5 text-xs"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Editar
                                            </Button>
                                        </Link>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={inUseCount > 0}
                                            onClick={() =>
                                                setElementToDelete(el)
                                            }
                                            title={
                                                inUseCount > 0
                                                    ? `Em uso em ${inUseCount} modelo(s)`
                                                    : 'Excluir elemento'
                                            }
                                            className={`h-8 cursor-pointer gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30 ${
                                                inUseCount > 0
                                                    ? 'cursor-not-allowed opacity-40'
                                                    : ''
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
                                    Tem certeza de que deseja excluir o elemento{' '}
                                    <strong>"{elementToDelete.name}"</strong>?
                                    Essa ação removerá o arquivo de imagem e não
                                    poderá ser desfeita.
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
                            {isDeleting
                                ? 'Excluindo...'
                                : 'Excluir Definitivamente'}
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
                                <Badge
                                    variant={
                                        previewElement.type === 'header'
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {previewElement.type === 'header'
                                        ? 'Cabeçalho'
                                        : 'Rodapé'}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            Dimensões padrão: {previewElement?.width}mm ×{' '}
                            {previewElement?.height}mm | Posição: X:{' '}
                            {previewElement?.position_x}mm, Y:{' '}
                            {previewElement?.position_y}mm
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex max-h-[500px] min-h-[240px] items-center justify-center overflow-auto rounded-lg bg-neutral-100 p-4 dark:bg-neutral-800">
                        {previewElement && (
                            <img
                                src={previewElement.image_url}
                                alt={previewElement.name}
                                className="max-h-[450px] max-w-full object-contain drop-shadow"
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
                            <Link
                                href={documentElements.edit({
                                    element: previewElement.id,
                                })}
                            >
                                <Button className="cursor-pointer gap-2">
                                    <Pencil className="h-4 w-4" />
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
