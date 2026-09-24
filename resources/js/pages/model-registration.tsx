import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
    type FormEvent,
} from "react";

import AppLayout from "@/layouts/app-layout";
import { BreadcrumbItem } from "@/types";
import { Head, useForm } from "@inertiajs/react";
import { model_registration } from "@/routes";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

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
    ChevronLeft,
    ChevronRight,
    Edit3,
} from "lucide-react";

import mammoth from "mammoth";
import {
    parsePdfDocument,
    sanitizePdfDocumentStructure,
    type PdfDocumentStructure,
} from "@/lib/pdf-document";

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
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Cadastro de Modelos",
        href: model_registration(),
    },
];

const slugify = (text: string) =>
    text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

export default function ModelRegistration({
    fieldTypeOptions = [],
}: Props) {
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    
    const [loading, setLoading] = useState(false);
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
    const [pageImages, setPageImages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [isPdf, setIsPdf] = useState(false);
    const [documentHtml, setDocumentHtml] = useState("");
    const [documentStructure, setDocumentStructure] = useState<PdfDocumentStructure | null>(null);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    const { data, setData, transform, post, processing, errors } =
        useForm({
            name: "",
            template: null as File | null,
            fields: [
                {
                    id: "1",
                    name: "Nome do Cliente",
                    slug: "nome_do_cliente",
                    type: "text",
                },
            ] as FieldItem[],
            extracted_text: "",
            document_structure: null as PdfDocumentStructure | null,
        });

    const addField = () => {
        setData("fields", [
            ...data.fields,
            {
                id: crypto.randomUUID(),
                name: "",
                slug: "",
                type: "text",
            },
        ]);
    };

    const removeField = (id: string) => {
        if (data.fields.length <= 1) return;

        setData(
            "fields",
            data.fields.filter((field) => field.id !== id),
        );
    };

    const updateField = (
        id: string,
        name: string,
    ) => {
        setData(
            "fields",
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

    const updateType = (
        id: string,
        type: string,
    ) => {
        setData(
            "fields",
            data.fields.map((field) =>
                field.id === id
                    ? { ...field, type }
                    : field,
            ),
        );
    };

    const copyTag = async (slug: string) => {
        try {
            await navigator.clipboard.writeText(
                `{{${slug}}}`,
            );

            setCopiedSlug(slug);

            setTimeout(
                () => setCopiedSlug(null),
                2000,
            );
        } catch (error) {
            console.error(
                "Erro ao copiar tag:",
                error,
            );
        }
    };

    const getCaretRange = (
        event: DragEvent<HTMLDivElement>,
    ): Range | null => {
        const { clientX, clientY } = event;

        if (
            typeof document.caretRangeFromPoint ===
            "function"
        ) {
            return document.caretRangeFromPoint(
                clientX,
                clientY,
            );
        }

        if (
            typeof document.caretPositionFromPoint ===
            "function"
        ) {
            const position =
                document.caretPositionFromPoint(
                    clientX,
                    clientY,
                );

            if (!position) return null;

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
        if (!slug) return;

        event.dataTransfer.setData(
            "text/plain",
            `{{${slug}}}`,
        );

        event.dataTransfer.effectAllowed = "copy";
    };

    const handleDragOver = (
        event: DragEvent<HTMLDivElement>,
    ) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = (
        event: DragEvent<HTMLDivElement>,
    ) => {
        event.preventDefault();

        const editor = editorRef.current;
        const text =
            event.dataTransfer.getData("text/plain");

        if (!editor || !text) return;

        const range = getCaretRange(event);

        if (
            !range ||
            !editor.contains(range.commonAncestorContainer)
        ) {
            return;
        }

        const node = document.createTextNode(text);

        range.insertNode(node);

        const cursor = document.createRange();

        cursor.setStartAfter(node);
        cursor.collapse(true);

        const selection = window.getSelection();

        selection?.removeAllRanges();
        selection?.addRange(cursor);

        if (isPdf && documentStructure) {
            const textBlock = node.parentElement?.closest<HTMLElement>("[data-element-index]");
            const elementIndex = Number(textBlock?.dataset.elementIndex);

            if (textBlock && Number.isInteger(elementIndex)) {
                const updatedStructure = structuredClone(documentStructure);
                updatedStructure.pages[currentPage].elements[elementIndex].text = textBlock.textContent ?? "";
                setDocumentStructure(updatedStructure);
                setData("document_structure", updatedStructure);
            }
        } else if (editorRef.current) {
            setData("extracted_text", editorRef.current.innerHTML);
        }
    };

    const updatePdfText = (elementIndex: number, text: string) => {
        if (!documentStructure) return;

        const updatedStructure = structuredClone(documentStructure);
        updatedStructure.pages[currentPage].elements[elementIndex].text = text;
        setDocumentStructure(updatedStructure);
        setData("document_structure", updatedStructure);
    };

    const handleFileChange = (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        setTemplateFile(file);
        setData("template", file);
    };

    const clearTemplate = () => {
        setTemplateFile(null);
        setData("template", null);
        setPageImages([]);
        setCurrentPage(0);
        setIsPdf(false);
        setDocumentHtml("");
        setDocumentStructure(null);
        setData("document_structure", null);

        if (editorRef.current) {
            editorRef.current.innerHTML = "";
        }
    };

    useEffect(() => {
        if (!templateFile) {
            if (editorRef.current) {
                editorRef.current.innerHTML = "";
            }

            setPageImages([]);
            setCurrentPage(0);
            setIsPdf(false);
            return;
        }

        let cancelled = false;

        const loadDocument = async () => {
            setLoading(true);

            try {
                const buffer =
                    await templateFile.arrayBuffer();

                const fileName =
                    templateFile.name.toLowerCase();

                const isDocx =
                    fileName.endsWith(".docx");

                const pdf =
                    fileName.endsWith(".pdf") ||
                    templateFile.type ===
                    "application/pdf";

                if (isDocx) {
                    const result = await mammoth.convertToHtml({
                        arrayBuffer: buffer,
                    });

                    if (cancelled) return;

                    setDocumentHtml(
                        constrainImages(
                            result.value || "<p>Documento vazio.</p>",
                        ),
                    );

                    setIsPdf(false);
                    setPageImages([]);
                    setCurrentPage(0);

                    return;
                }

                if (pdf) {
                    const parsedPdf = await parsePdfDocument(templateFile);

                    if (cancelled) return;

                    setPageImages(parsedPdf.pageImages);
                    setDocumentStructure(parsedPdf.structure);
                    setData("document_structure", parsedPdf.structure);
                    setData("extracted_text", "");
                    setCurrentPage(0);
                    setIsPdf(true);

                    return;
                }

                if (editorRef.current) {
                    editorRef.current.innerHTML =
                        `<p class="text-red-500 font-medium">
                            Tipo de arquivo não suportado.
                        </p>`;
                }
            } catch (error) {
                console.error(
                    "Erro ao carregar documento:",
                    error,
                );

                if (
                    !cancelled &&
                    editorRef.current
                ) {
                    editorRef.current.innerHTML =
                        `<p class="text-red-500 font-medium">
                            Não foi possível carregar o documento.
                        </p>`;
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadDocument();

        return () => {
            cancelled = true;
        };
    }, [templateFile]);

    const previousPage = () => {
        setCurrentPage((page) =>
            Math.max(0, page - 1),
        );
    };

    const nextPage = () => {
        setCurrentPage((page) =>
            Math.min(
                pageImages.length - 1,
                page + 1,
            ),
        );
    };

    const handleSubmit = (
        event: FormEvent,
    ) => {
        event.preventDefault();

        if (!data.name.trim()) {
            alert(
                "Por favor, informe o nome do modelo.",
            );
            return;
        }

        if (!data.template) {
            alert(
                "Selecione um arquivo para o modelo.",
            );
            return;
        }

        transform((formData) => ({
            ...formData,
            extracted_text: isPdf ? "" : editorRef.current?.innerHTML ?? documentHtml,
            document_structure: isPdf && documentStructure
                ? sanitizePdfDocumentStructure(documentStructure)
                : null,
        }));

        setSubmissionError(null);
        post("/modelos", {
            onSuccess: () => {
                setSubmissionError(null);
                alert(
                    "Modelo salvo com sucesso!",
                );
            },
            onError: (formErrors) => {
                const firstError = Object.values(formErrors).find(Boolean);
                setSubmissionError(
                    typeof firstError === "string"
                        ? `Não foi possível salvar: ${firstError}`
                        : "Não foi possível salvar. Confira os campos do formulário.",
                );
            },
            onHttpException: (response) => {
                setSubmissionError(`O servidor respondeu com erro HTTP ${response.status} ao salvar o modelo.`);
            },
            onNetworkError: () => {
                setSubmissionError("Não foi possível conectar ao servidor. Verifique a conexão e tente salvar novamente.");
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cadastro de Modelos" />

            <form
                onSubmit={handleSubmit}
                className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 p-6 lg:grid-cols-12"
            >
                <div className="flex flex-col justify-between space-y-5 rounded-xl border bg-card p-6 shadow-sm lg:col-span-4">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold">
                                Configuração do Modelo
                            </h2>

                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1.5 text-xs"
                                    >
                                        <HelpCircle className="h-3.5 w-3.5" />
                                        Como usar
                                    </Button>
                                </DialogTrigger>

                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Como criar e utilizar modelos
                                        </DialogTitle>

                                        <DialogDescription>
                                            Crie os campos e arraste as tags diretamente para o documento.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="rounded-lg border bg-muted/50 p-4 font-mono text-sm">
                                        Contratante:{" "}
                                        <span className="rounded bg-primary/10 px-1 text-primary">
                                            {"{{nome_do_cliente}}"}
                                        </span>
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
                                value={data.name}
                                onChange={(e) =>
                                    setData(
                                        "name",
                                        e.target.value,
                                    )
                                }
                                placeholder="Ex: Contrato de Prestação de Serviços"
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
                                <label className="flex min-h-[110px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 p-4 text-center hover:bg-muted/50">
                                    <Upload className="mb-2 h-6 w-6 text-muted-foreground" />

                                    <span className="text-xs font-medium">
                                        Clique ou arraste seu arquivo
                                    </span>

                                    <span className="text-[10px] text-muted-foreground">
                                        Suporta DOCX e PDF
                                    </span>

                                    <input
                                        id="template"
                                        type="file"
                                        accept=".docx,.pdf"
                                        className="hidden"
                                        onChange={
                                            handleFileChange
                                        }
                                    />
                                </label>
                            ) : (
                                <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <FileText className="h-5 w-5 text-primary" />

                                        <span className="truncate text-xs font-medium">
                                            {
                                                templateFile.name
                                            }
                                        </span>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={
                                            clearTemplate
                                        }
                                    >
                                        Trocar
                                    </Button>
                                </div>
                            )}
                        </div>

                        <hr />

                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Campos Dinâmicos
                            </h2>

                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                                {data.fields.length}
                            </span>
                        </div>

                        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
                            {data.fields.map(
                                (
                                    field,
                                    index,
                                ) => (
                                    <div
                                        key={
                                            field.id
                                        }
                                        className="space-y-3 rounded-xl border bg-card/60 p-3.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold uppercase text-muted-foreground">
                                                Campo #
                                                {index +
                                                    1}
                                            </span>

                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 text-destructive"
                                                onClick={() =>
                                                    removeField(
                                                        field.id,
                                                    )
                                                }
                                                disabled={
                                                    data
                                                        .fields
                                                        .length ===
                                                    1
                                                }
                                            >
                                                <Trash className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs">
                                                Nome do Campo
                                            </Label>

                                            <Input
                                                value={
                                                    field.name
                                                }
                                                onChange={(
                                                    e,
                                                ) =>
                                                    updateField(
                                                        field.id,
                                                        e
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Ex: Nome do Cliente"
                                                className="h-8 text-xs"
                                            />
                                        </div>

                                        <div className="grid grid-cols-12 gap-3">
                                            <div className="col-span-8 space-y-1.5">
                                                <Label className="text-xs">
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
                                                    className="relative cursor-grab select-none active:cursor-grabbing"
                                                >
                                                    <div className="flex h-8 items-center rounded-md border bg-muted/50 px-3 pr-8 font-mono text-xs text-muted-foreground">
                                                        {field.slug
                                                            ? `{{${field.slug}}}`
                                                            : "{{nome_do_campo}}"}
                                                    </div>

                                                    {field.slug && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                copyTag(
                                                                    field.slug,
                                                                )
                                                            }
                                                            className="absolute right-1.5 top-1 rounded p-1 hover:bg-background"
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

                                            <div className="col-span-4 space-y-1.5">
                                                <Label className="text-xs">
                                                    Tipo
                                                </Label>

                                                <Select
                                                    value={
                                                        field.type
                                                    }
                                                    onValueChange={(
                                                        value,
                                                    ) =>
                                                        updateType(
                                                            field.id,
                                                            value,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
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
                            variant="outline"
                            onClick={addField}
                            className="w-full border-dashed"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar novo campo
                        </Button>
                    </div>

                        <div className="flex gap-3 border-t pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                window.history.back()
                            }
                            className="w-1/2"
                        >
                            <X className="mr-2 h-4 w-4" />
                            Cancelar
                        </Button>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="w-1/2 bg-emerald-700 text-white hover:bg-emerald-800"
                        >
                            {processing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}

                            Salvar Modelo
                        </Button>
                    </div>
                    {!submissionError && Object.values(errors).some(Boolean) && (
                        <p role="alert" className="text-sm text-destructive">
                            Não foi possível salvar: {Object.values(errors).find(Boolean)}
                        </p>
                    )}
                    {submissionError && (
                        <p role="alert" className="text-sm text-destructive">
                            {submissionError}
                        </p>
                    )}
                </div>

                <div className="flex min-w-0 flex-col items-center lg:col-span-8">
                    <div className="mb-4 flex w-full max-w-[900px] items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Pré-visualização
                        </span>

                        {isPdf &&
                            pageImages.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={
                                            previousPage
                                        }
                                        disabled={
                                            currentPage ===
                                            0
                                        }
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>

                                    <span className="text-xs">
                                        {currentPage +
                                            1}{" "}
                                        /{" "}
                                        {
                                            pageImages.length
                                        }
                                    </span>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={
                                            nextPage
                                        }
                                        disabled={
                                            currentPage >=
                                            pageImages.length -
                                            1
                                        }
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}

                        {!isPdf &&
                            templateFile && (
                                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <Edit3 className="h-3.5 w-3.5" />
                                    Arraste a tag para o documento
                                </span>
                            )}
                    </div>

                    <div className="w-full max-w-[850px] overflow-hidden rounded-sm border bg-white shadow-xl">
                        {loading ? (
                            <div className="flex min-h-[841px] flex-col items-center justify-center gap-3 text-muted-foreground">
                                <Loader2 className="h-7 w-7 animate-spin" />
                                <span className="text-sm">
                                    Renderizando documento...
                                </span>
                            </div>
                        ) : isPdf &&
                            pageImages.length && documentStructure ? (
                            <div ref={editorRef} className="relative w-full [container-type:inline-size]">
                                <img
                                    src={pageImages[currentPage]}
                                    alt={`Página ${currentPage + 1}`}
                                    className="block h-auto w-full select-none"
                                    draggable={false}
                                />
                                <div className="absolute inset-0" onDragOver={handleDragOver} onDrop={handleDrop}>
                                    {documentStructure.pages[currentPage]?.elements.map((element, index) => (
                                        <div
                                            key={`${currentPage}-${index}`}
                                            data-element-index={index}
                                            contentEditable
                                            suppressContentEditableWarning
                                            onBlur={(event) => updatePdfText(index, event.currentTarget.textContent ?? "")}
                                            className="absolute overflow-hidden bg-white text-black outline-none focus:ring-1 focus:ring-blue-500"
                                            style={{
                                                left: `${element.x * 100}%`,
                                                top: `${element.y * 100}%`,
                                                width: `${Math.min(1 - element.x, Math.max(element.width, 0.04)) * 100}%`,
                                                height: `${Math.max(element.height * 1.5, 0.015) * 100}%`,
                                                fontSize: `${(element.fontSize / documentStructure.pages[currentPage].width) * 100}cqw`,
                                                lineHeight: 1,
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {element.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : templateFile ? (
                            <div className="min-h-[841px] px-[48px] py-[42px]">
                                <div
                                    ref={editorRef}
                                    contentEditable
                                    suppressContentEditableWarning
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onInput={(event) => setData("extracted_text", event.currentTarget.innerHTML)}
                                    dangerouslySetInnerHTML={{
                                        __html: documentHtml,
                                    }}
                                    className="document-editor min-h-[750px] w-full font-sans text-[13px] leading-[1.7] text-[#333] outline-none"
                                />
                            </div>
                        ) : (
                            <div className="flex min-h-[841px] flex-col items-center justify-center text-center text-muted-foreground">
                                <FileText className="mb-3 h-12 w-12 opacity-50" />

                                <p className="text-sm font-medium">
                                    Nenhum documento carregado
                                </p>

                                <p className="mt-1 max-w-xs text-xs">
                                    Faça upload de um PDF ou DOCX para visualizar o modelo.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
