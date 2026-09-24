import {
    useState,
    useEffect,
    type ChangeEvent,
    type FormEvent,
    type DragEvent,
    useRef,
} from 'react';

import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { model_registration } from '@/routes';
import { sanitizePdfDocumentStructure } from '@/lib/pdf-document';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

import { Button } from '@/components/ui/button';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

import {
    Trash,
    Plus,
    Upload,
    FileText,
    Loader2,
    Save,
    X,
    HelpCircle,
    Copy,
    Check,
    Edit3,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

import mammoth from 'mammoth';
import {
    parsePdfBytes,
    sanitizePdfDocumentStructure,
    type PdfDocumentStructure,
} from '@/lib/pdf-document';

/**
 * Imagens extraídas de DOCX (ex.: logos) vêm em resolução nativa; sem limite
 * elas estouram a largura do editor. Injetamos estilo inline limitando a largura.
 */
function constrainImages(html: string): string {
    return html.replace(
        /<img(?![^>]*\bstyle=)/g,
        '<img style="max-width:180px;max-height:72px;width:auto;height:auto"',
    );
}

interface FieldItem {
    id: string;
    name: string;
    slug: string;
    type: string;
}

interface FieldTypeOption {
    value: string;
    label: string;
}

interface Props {
    fieldTypeOptions: FieldTypeOption[];
    model: {
        id: string;
        name: string;
        fields: FieldItem[];
        extracted_text: string | null;
        document_structure: PdfDocumentStructure | null;
    };
    templateUrl: string | null;
    templateIsPdf: boolean;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Editar Modelo',
        href: model_registration(),
    },
];

function slugify(text: string) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function cleanHtml(html: string) {
    return html
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/>\s+</g, '><')
        .trim();
}

export default function ModelEdit({
    fieldTypeOptions = [],
    model,
    templateUrl,
    templateIsPdf,
}: Props) {
    const [templateFile, setTemplateFile] = useState<File | null>(null);

    const [extractedContent, setExtractedContent] = useState<string>(
        model.extracted_text || '',
    );

    const [isLoadingText, setIsLoadingText] = useState(false);
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
    const [documentStructure, setDocumentStructure] = useState<PdfDocumentStructure | null>(
        model.document_structure
            ? sanitizePdfDocumentStructure(model.document_structure)
            : null,
    );
    const [pageImages, setPageImages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);

    const editorRef = useRef<HTMLDivElement>(null);

    const { data, setData, transform, put, processing, errors } = useForm<{
        name: string;
        template: File | null;
        fields: FieldItem[];
        extracted_text: string;
        document_structure: PdfDocumentStructure | null;
    }>({
        name: model.name || '',
        template: null,
        fields:
            model.fields?.length > 0
                ? model.fields
                : [
                      {
                          id: '1',
                          name: 'Nome do Cliente',
                          slug: 'nome_do_cliente',
                          type: 'text',
                      },
                  ],
        extracted_text: model.extracted_text || '',
        document_structure: model.document_structure,
    });

    const addField = () => {
        const newId = String(Date.now());

        setData('fields', [
            ...data.fields,
            {
                id: newId,
                name: '',
                slug: '',
                type: 'text',
            },
        ]);
    };

    const removeField = (id: string) => {
        if (data.fields.length === 1) {
            return;
        }

        setData(
            'fields',
            data.fields.filter((field) => field.id !== id),
        );
    };

    const updateFieldName = (id: string, name: string) => {
        setData(
            'fields',
            data.fields.map((field) =>
                field.id === id
                    ? {
                          ...field,
                          name,
                          slug: slugify(name),
                      }
                    : field,
            ),
        );
    };

    const updateFieldType = (id: string, type: string) => {
        setData(
            'fields',
            data.fields.map((field) =>
                field.id === id
                    ? {
                          ...field,
                          type,
                      }
                    : field,
            ),
        );
    };

    const handleCopyTag = async (slug: string) => {
        const tag = `{{${slug}}}`;

        try {
            await navigator.clipboard.writeText(tag);

            setCopiedSlug(slug);

            setTimeout(() => {
                setCopiedSlug(null);
            }, 2000);
        } catch (error) {
            console.error('Erro ao copiar tag:', error);
        }
    };

    const getCaretRange = (
        event: DragEvent<HTMLDivElement>,
    ): Range | null => {
        const { clientX, clientY } = event;

        if (typeof document.caretRangeFromPoint === 'function') {
            return document.caretRangeFromPoint(
                clientX,
                clientY,
            );
        }

        if (typeof document.caretPositionFromPoint === 'function') {
            const position = document.caretPositionFromPoint(
                clientX,
                clientY,
            );

            if (!position) {
                return null;
            }

            const range = document.createRange();

            range.setStart(
                position.offsetNode,
                position.offset,
            );

            range.collapse(true);

            return range;
        }

        return null;
    };

    const handleDragStart = (
        event: DragEvent<HTMLDivElement>,
        slug: string,
    ) => {
        if (!slug) {
            return;
        }

        event.dataTransfer.setData(
            'text/plain',
            `{{${slug}}}`,
        );

        event.dataTransfer.effectAllowed = 'copy';
    };

    const handleDragOver = (
        event: DragEvent<HTMLDivElement>,
    ) => {
        event.preventDefault();

        event.dataTransfer.dropEffect = 'copy';
    };

    const updatePdfText = (elementIndex: number, text: string) => {
        if (!documentStructure) {
            return;
        }

        const updatedStructure = structuredClone(documentStructure);
        updatedStructure.pages[currentPage].elements[elementIndex].text = text;
        setDocumentStructure(updatedStructure);
        setData('document_structure', updatedStructure);
    };

    const handleDrop = (
        event: DragEvent<HTMLDivElement>,
    ) => {
        event.preventDefault();

        const editor = editorRef.current;

        const text = event.dataTransfer.getData(
            'text/plain',
        );

        if (!editor || !text) {
            return;
        }

        const range = getCaretRange(event);

        if (
            !range ||
            !editor.contains(range.commonAncestorContainer)
        ) {
            return;
        }

        const node = document.createTextNode(text);

        range.deleteContents();

        range.insertNode(node);

        const cursor = document.createRange();

        cursor.setStartAfter(node);

        cursor.collapse(true);

        const selection = window.getSelection();

        selection?.removeAllRanges();

        selection?.addRange(cursor);

        const textBlock = node.parentElement?.closest<HTMLElement>('[data-element-index]');
        const elementIndex = Number(textBlock?.dataset.elementIndex);

        if (textBlock && Number.isInteger(elementIndex) && documentStructure) {
            updatePdfText(elementIndex, textBlock.textContent ?? '');
            return;
        }

        const updatedHtml = editor.innerHTML;

        setExtractedContent(updatedHtml);

        setData('extracted_text', updatedHtml);
    };

    const handleCancel = () => {
        const confirmed = window.confirm(
            'Tem certeza que deseja cancelar? As alterações não salvas serão perdidas.',
        );

        if (confirmed) {
            window.history.back();
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!data.name.trim()) {
            alert('Por favor, informe o nome do modelo.');
            return;
        }

        const updatedHtmlContent = editorRef.current
            ? editorRef.current.innerHTML
            : extractedContent;

        const cleanedHtml = cleanHtml(updatedHtmlContent);

        transform((formData) => ({
            ...formData,
            extracted_text: documentStructure ? '' : cleanedHtml,
            document_structure: documentStructure
                ? sanitizePdfDocumentStructure(documentStructure)
                : null,
        }));

        put(`/modelos/${model.id}`, {
            onSuccess: () => {
                alert('Modelo atualizado com sucesso!');
            },
            onError: (formErrors) => {
                console.error(
                    'Erros de validação:',
                    formErrors,
                );
            },
        });
    };

    useEffect(() => {
        if (!templateFile) {
            return;
        }

        async function processDocument() {
            setIsLoadingText(true);

            try {
                const buffer = await templateFile.arrayBuffer();

                const isDocx =
                    templateFile.type ===
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                    templateFile.name
                        .toLowerCase()
                        .endsWith('.docx');

                const isPdf =
                    templateFile.type === 'application/pdf' ||
                    templateFile.name.toLowerCase().endsWith('.pdf');

                if (!isDocx && !isPdf) {
                    setExtractedContent(`
                        <p class="text-red-500 font-medium">
                            Tipo de arquivo não suportado. Por favor, selecione um arquivo .docx ou .pdf.
                        </p>
                    `);

                    return;
                }

                if (isDocx) {
                    setDocumentStructure(null);
                    setPageImages([]);
                    const result = await mammoth.convertToHtml({
                            arrayBuffer: buffer,
                            styleMap: [
                                "p[style-name='Heading 1'] => h1:fresh",
                                "p[style-name='Heading 2'] => h2:fresh",
                                "p[style-name='Heading 3'] => h3:fresh",
                            ],
                        });

                    const cleanedHtml = constrainImages(cleanHtml(result.value));

                    setExtractedContent(cleanedHtml);
                    setData('extracted_text', cleanedHtml);
                    setData('document_structure', null);

                    return;
                }

                if (isPdf) {
                    const parsedPdf = await parsePdfBytes(buffer);
                    setDocumentStructure(parsedPdf.structure);
                    setPageImages(parsedPdf.pageImages);
                    setCurrentPage(0);
                    setData('document_structure', parsedPdf.structure);
                    setData('extracted_text', '');
                }
            } catch (error) {
                console.error(
                    'Erro na conversão:',
                    error,
                );

                const errorHtml = `
                    <p class="text-red-500 font-medium">
                        Não foi possível ler o documento. Confira se o arquivo PDF ou DOCX é válido.
                    </p>
                `;

                setExtractedContent(errorHtml);
                setData('extracted_text', errorHtml);
            } finally {
                setIsLoadingText(false);
            }
        }

        processDocument();
    }, [templateFile]);

    useEffect(() => {
        if (templateFile || !templateUrl || !templateIsPdf) {
            return;
        }

        let cancelled = false;

        fetch(templateUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Não foi possível carregar o PDF original.');
                }

                return response.arrayBuffer();
            })
            .then(parsePdfBytes)
            .then((parsedPdf) => {
                if (!cancelled) {
                    setDocumentStructure(parsedPdf.structure);
                    setData('document_structure', parsedPdf.structure);
                    setPageImages(parsedPdf.pageImages);
                    setCurrentPage(0);
                }
            })
            .catch((error: unknown) => console.error('Erro ao carregar PDF do modelo:', error));

        return () => {
            cancelled = true;
        };
    }, [setData, templateFile, templateIsPdf, templateUrl]);

    const handleFileChange = (
        e: ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        setTemplateFile(file);
        setData('template', file);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Modelo" />

            <form
                onSubmit={handleSubmit}
                className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 p-6 lg:grid-cols-12"
            >
                <div className="flex flex-col justify-between space-y-5 rounded-xl border bg-card p-6 text-card-foreground shadow-sm lg:col-span-4">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-semibold">
                                    Configuração do Modelo
                                </h2>
                            </div>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1.5 text-xs"
                                    >
                                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                        Como usar
                                    </Button>
                                </DialogTrigger>

                                <DialogContent className="max-h-[85vh] w-[92vw] overflow-y-auto rounded-xl p-4 sm:p-6 md:max-w-3xl">
                                    <DialogHeader className="pb-2">
                                        <DialogTitle className="text-base font-bold sm:text-xl">
                                            Como criar e utilizar modelos
                                        </DialogTitle>

                                        <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                                            Siga os passos abaixo para automatizar o preenchimento dos seus documentos.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-1 rounded-lg border bg-muted/60 p-3 font-mono text-xs sm:p-4">
                                            <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                Exemplo de uso no texto
                                            </span>

                                            <p className="break-all font-semibold text-primary">
                                                Contratante:{' '}
                                                <span className="rounded bg-primary/10 px-1 py-0.5 text-primary">
                                                    {'{{nome_do_cliente}}'}
                                                </span>
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                            <div className="space-y-1 rounded-lg border bg-card p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                        1
                                                    </span>

                                                    <h4 className="text-xs font-semibold">
                                                        Crie os Campos
                                                    </h4>
                                                </div>

                                                <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                                                    Adicione os campos dinâmicos na lista ao lado definindo nome e tipo.
                                                </p>
                                            </div>

                                            <div className="space-y-1 rounded-lg border bg-card p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                        2
                                                    </span>

                                                    <h4 className="text-xs font-semibold">
                                                        Copie a Tag
                                                    </h4>
                                                </div>

                                                <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                                                    Copie a chave gerada automaticamente, como{' '}
                                                    <code className="font-mono text-primary">
                                                        {'{{slug}}'}
                                                    </code>
                                                    .
                                                </p>
                                            </div>

                                            <div className="space-y-1 rounded-lg border bg-card p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                        3
                                                    </span>

                                                    <h4 className="text-xs font-semibold">
                                                        Insira no Texto
                                                    </h4>
                                                </div>

                                                <p className="text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                                                    Cole no painel de preview ou diretamente no arquivo Word/PDF.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="model_name">
                                Nome do Modelo
                            </Label>

                            <Input
                                id="model_name"
                                name="model_name"
                                placeholder="Ex: Contrato de Prestação de Serviços"
                                value={data.name}
                                onChange={(e) =>
                                    setData(
                                        'name',
                                        e.target.value,
                                    )
                                }
                                required
                            />

                            {errors.name && (
                                <span className="text-xs text-destructive">
                                    {errors.name}
                                </span>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="template">
                                Arquivo Base (.docx ou .pdf)
                            </Label>

                            {!templateFile ? (
                                <label className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/20 p-4 text-center transition-colors hover:bg-muted/50">
                                    <Upload className="mb-1.5 h-6 w-6 text-muted-foreground" />

                                    <span className="text-xs font-medium">
                                        Clique ou arraste seu arquivo
                                    </span>

                                    <span className="mt-0.5 text-[10px] text-muted-foreground">
                                        Suporta DOCX e PDF
                                    </span>

                                    <input
                                        type="file"
                                        id="template"
                                        name="template"
                                        accept=".docx,.pdf"
                                        className="hidden"
                                        onChange={
                                            handleFileChange
                                        }
                                    />
                                </label>
                            ) : (
                                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <FileText className="h-5 w-5 shrink-0 text-primary" />

                                        <span className="truncate text-xs font-medium">
                                            {templateFile.name}
                                        </span>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                        onClick={() => {
                                            setTemplateFile(
                                                null,
                                            );

                                            setData(
                                                'template',
                                                null,
                                            );

                                            setExtractedContent(
                                                model.extracted_text ||
                                                    '',
                                            );
                                        }}
                                    >
                                        Trocar
                                    </Button>
                                </div>
                            )}

                            {errors.template && (
                                <span className="text-xs text-destructive">
                                    {errors.template}
                                </span>
                            )}
                        </div>

                        <hr className="my-4 border-border" />

                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Campos Dinâmicos
                            </h2>

                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                                {data.fields.length}{' '}
                                {data.fields.length === 1
                                    ? 'campo'
                                    : 'campos'}
                            </span>
                        </div>

                        <div className="-mr-2 max-h-[420px] space-y-3 overflow-y-auto pr-2">
                            {data.fields.map(
                                (field, index) => (
                                    <div
                                        key={field.id}
                                        className="group relative space-y-3 rounded-xl border bg-card/60 p-3.5 shadow-xs transition-colors hover:bg-card"
                                    >
                                        <div className="flex items-center justify-between border-b border-border/40 pb-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                Campo #
                                                {index + 1}
                                            </span>

                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() =>
                                                    removeField(
                                                        field.id,
                                                    )
                                                }
                                                disabled={
                                                    data.fields
                                                        .length ===
                                                    1
                                                }
                                                title="Excluir campo"
                                            >
                                                <Trash className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">
                                                Nome do Campo
                                            </Label>

                                            <Input
                                                value={
                                                    field.name
                                                }
                                                onChange={(
                                                    e,
                                                ) =>
                                                    updateFieldName(
                                                        field.id,
                                                        e
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Ex: Nome do Cliente"
                                                className="h-8 bg-background text-xs"
                                            />
                                        </div>

                                        <div className="grid grid-cols-12 items-start gap-3">
                                            <div className="col-span-8 space-y-1.5">
                                                <Label className="text-xs font-medium">
                                                    Tag / Slug
                                                </Label>

                                                <div
                                                    draggable={
                                                        !!field.slug
                                                    }
                                                    onDragStart={(
                                                        e,
                                                    ) =>
                                                        handleDragStart(
                                                            e,
                                                            field.slug,
                                                        )
                                                    }
                                                    className="relative flex cursor-grab select-none items-center active:cursor-grabbing"
                                                >
                                                    <Input
                                                        value={
                                                            field.slug
                                                                ? `{{${field.slug}}}`
                                                                : ''
                                                        }
                                                        disabled
                                                        placeholder="{{nome_do_campo}}"
                                                        className="h-8 w-full bg-muted/50 pr-8 font-mono text-xs text-muted-foreground"
                                                    />

                                                    {field.slug && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleCopyTag(
                                                                    field.slug,
                                                                )
                                                            }
                                                            title="Copiar Tag"
                                                            className="absolute right-1.5 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                                                        >
                                                            {copiedSlug ===
                                                            field.slug ? (
                                                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="h-3.5 w-3.5" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="col-span-4 min-w-0 space-y-1.5">
                                                <Label className="text-xs font-medium">
                                                    Tipo
                                                </Label>

                                                <Select
                                                    value={
                                                        field.type
                                                    }
                                                    onValueChange={(
                                                        value,
                                                    ) =>
                                                        updateFieldType(
                                                            field.id,
                                                            value,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 w-full overflow-hidden bg-background text-xs">
                                                        <SelectValue
                                                            placeholder="Selecione"
                                                            className="truncate"
                                                        />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        {fieldTypeOptions.map(
                                                            (
                                                                option,
                                                            ) => (
                                                                <SelectItem
                                                                    key={
                                                                        option.value
                                                                    }
                                                                    value={
                                                                        option.value
                                                                    }
                                                                >
                                                                    {
                                                                        option.label
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                ),
                            )}
                        </div>

                        <Button
                            type="button"
                            onClick={addField}
                            variant="outline"
                            className="h-9 w-full border-dashed text-xs font-medium uppercase tracking-wide"
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Adicionar novo campo
                        </Button>
                    </div>

                    <div className="mt-6 flex items-center gap-3 border-t pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            className="h-10 w-1/2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        >
                            <X className="mr-1.5 h-4 w-4" />
                            Cancelar
                        </Button>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-10 w-1/2 bg-emerald-700 text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-emerald-800"
                        >
                            {processing ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-1.5 h-4 w-4" />
                            )}

                            {processing
                                ? 'Salvando...'
                                : 'Salvar Alterações'}
                        </Button>
                    </div>
                    {Object.values(errors).some(Boolean) && (
                        <p role="alert" className="text-sm text-destructive">
                            Não foi possível salvar: {Object.values(errors).find(Boolean)}
                        </p>
                    )}
                </div>

                <div className="flex min-w-0 flex-col items-center lg:col-span-8">
                    <div className="mb-4 flex w-full max-w-[900px] items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />

                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Pré-visualização
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {documentStructure && pageImages.length > 0 ? (
                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="ghost" size="icon" aria-label="Página anterior" disabled={currentPage === 0} onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-xs text-muted-foreground">{currentPage + 1} / {pageImages.length}</span>
                                    <Button type="button" variant="ghost" size="icon" aria-label="Próxima página" disabled={currentPage >= pageImages.length - 1} onClick={() => setCurrentPage((page) => Math.min(pageImages.length - 1, page + 1))}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                    <Edit3 className="h-3 w-3" />
                                    Arraste a tag para o documento
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="relative w-full max-w-[900px]">
                        <div className="relative mx-auto w-full max-w-[850px] overflow-hidden rounded-sm border border-border/80 bg-white shadow-xl">
                            {isLoadingText ? (
                                <div className="flex min-h-[841px] w-full items-center justify-center">
                                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                        <Loader2 className="h-6 w-6 animate-spin" />

                                        <span className="text-sm">
                                            Processando documento...
                                        </span>
                                    </div>
                                </div>
                            ) : documentStructure && pageImages[currentPage] ? (
                                <div ref={editorRef} className="relative w-full [container-type:inline-size]">
                                    <img src={pageImages[currentPage]} alt={`Página ${currentPage + 1}`} className="block h-auto w-full select-none" draggable={false} />
                                    <div className="absolute inset-0" onDragOver={handleDragOver} onDrop={handleDrop}>
                                        {documentStructure.pages[currentPage]?.elements.map((element, index) => (
                                            <div
                                                key={`${currentPage}-${index}`}
                                                data-element-index={index}
                                                contentEditable
                                                suppressContentEditableWarning
                                                onBlur={(event) => updatePdfText(index, event.currentTarget.textContent ?? '')}
                                                className="absolute overflow-hidden bg-white text-black outline-none focus:ring-1 focus:ring-blue-500"
                                                style={{
                                                    left: `${element.x * 100}%`,
                                                    top: `${element.y * 100}%`,
                                                    width: `${Math.min(1 - element.x, Math.max(element.width, 0.04)) * 100}%`,
                                                    height: `${Math.max(element.height * 1.5, 0.015) * 100}%`,
                                                    fontSize: `${(element.fontSize / documentStructure.pages[currentPage].width) * 100}cqw`,
                                                    lineHeight: 1,
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {element.text}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="min-h-[841px] w-full px-[48px] py-[42px] text-gray-900">
                                    <div
                                        ref={editorRef}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onInput={(event) => setData('extracted_text', event.currentTarget.innerHTML)}
                                        onDragOver={
                                            handleDragOver
                                        }
                                        onDrop={handleDrop}
                                        className="
                                            document-editor
                                            min-h-[750px]
                                            w-full
                                            outline-none
                                            font-sans
                                            text-[13px]
                                            leading-[1.7]
                                            text-[#333]
                                            focus:outline-none
                                        "
                                        dangerouslySetInnerHTML={{
                                            __html:
                                                extractedContent ||
                                                '<p>Digite ou cole o texto do seu modelo diretamente aqui...</p>',
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
