import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
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
import * as pdfjsLib from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

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

function slugify(text: string) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

export default function ModelRegistration({
    fieldTypeOptions = [],
}: Props) {
    const [templateFile, setTemplateFile] = useState<File | null>(null);

    const [extractedContent, setExtractedContent] =
        useState<string>("");

    const [isLoadingText, setIsLoadingText] = useState(false);

    const [copiedSlug, setCopiedSlug] =
        useState<string | null>(null);

    /*
     * Preview de PDF
     */
    const [pageImages, setPageImages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [isPdfPreview, setIsPdfPreview] = useState(false);

    const editorRef = useRef<HTMLDivElement>(null);

    const { data, setData, post, processing, errors } =
        useForm<{
            name: string;
            template: File | null;
            fields: FieldItem[];
            extracted_text: string;
        }>({
            name: "",
            template: null,
            fields: [
                {
                    id: "1",
                    name: "Nome do Cliente",
                    slug: "nome_do_cliente",
                    type: "text",
                },
            ],
            extracted_text: "",
        });

    /*
     * ============================================================
     * CAMPOS
     * ============================================================
     */

    const addField = () => {
        const newId = String(Date.now());

        setData("fields", [
            ...data.fields,
            {
                id: newId,
                name: "",
                slug: "",
                type: "text",
            },
        ]);
    };

    const removeField = (id: string) => {
        if (data.fields.length === 1) return;

        setData(
            "fields",
            data.fields.filter((field) => field.id !== id),
        );
    };

    const updateFieldName = (
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

    const updateFieldType = (
        id: string,
        type: string,
    ) => {
        setData(
            "fields",
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
        if (!slug) return;

        const tag = `{{${slug}}}`;

        try {
            await navigator.clipboard.writeText(tag);

            setCopiedSlug(slug);

            window.setTimeout(() => {
                setCopiedSlug(null);
            }, 2000);
        } catch (error) {
            console.error(
                "Erro ao copiar a tag:",
                error,
            );
        }
    };

    /*
     * ============================================================
     * NAVEGAÇÃO DA PREVIEW
     * ============================================================
     */

    const goToPreviousPage = () => {
        setCurrentPage((page) =>
            Math.max(0, page - 1),
        );
    };

    const goToNextPage = () => {
        setCurrentPage((page) =>
            Math.min(
                pageImages.length - 1,
                page + 1,
            ),
        );
    };

    /*
     * Navegação por teclado.
     *
     * Não interfere quando o usuário está digitando
     * no editor ou em algum input.
     */
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target =
                event.target as HTMLElement | null;

            if (
                target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.tagName === "SELECT" ||
                target?.isContentEditable
            ) {
                return;
            }

            if (!isPdfPreview || pageImages.length === 0) {
                return;
            }

            if (event.key === "ArrowLeft") {
                goToPreviousPage();
            }

            if (event.key === "ArrowRight") {
                goToNextPage();
            }
        };

        window.addEventListener(
            "keydown",
            handleKeyDown,
        );

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown,
            );
        };
    }, [isPdfPreview, pageImages.length]);

    /*
     * ============================================================
     * CANCELAR
     * ============================================================
     */

    const handleCancel = () => {
        if (
            window.confirm(
                "Tem certeza que deseja cancelar? As alterações não salvas serão perdidas.",
            )
        ) {
            window.history.back();
        }
    };

    /*
     * ============================================================
     * ENVIO
     * ============================================================
     */

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

        const updatedContent =
            isPdfPreview
                ? extractedContent
                : editorRef.current?.innerHTML ??
                  extractedContent;

        const cleanedHtml = updatedContent
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .replace(/>\s+</g, "><")
            .trim();

        setData(
            "extracted_text",
            cleanedHtml,
        );

        post("/modelos", {
            onSuccess: () => {
                alert(
                    "Modelo salvo com sucesso!",
                );
            },

            onError: (validationErrors) => {
                console.error(
                    "Erros de validação:",
                    validationErrors,
                );
            },
        });
    };

    /*
     * ============================================================
     * PROCESSAMENTO DO ARQUIVO
     * ============================================================
     */

    useEffect(() => {
        if (!templateFile) {
            setExtractedContent("");
            setPageImages([]);
            setCurrentPage(0);
            setIsPdfPreview(false);
            return;
        }

        let cancelled = false;

        async function processDocument() {
            setIsLoadingText(true);

            try {
                const buffer =
                    await templateFile!.arrayBuffer();

                const fileName =
                    templateFile!.name.toLowerCase();

                const isDocx =
                    templateFile!.type ===
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                    fileName.endsWith(".docx");

                const isPdf =
                    templateFile!.type ===
                        "application/pdf" ||
                    fileName.endsWith(".pdf");

                if (!isDocx && !isPdf) {
                    setExtractedContent(
                        `<p class="text-red-500 font-medium">
                            Tipo de arquivo não suportado.
                            Por favor, selecione um arquivo .docx ou .pdf.
                        </p>`,
                    );

                    setPageImages([]);
                    setIsPdfPreview(false);

                    return;
                }

                /*
                 * ==================================================
                 * DOCX
                 * ==================================================
                 */

                if (isDocx) {
                    const result =
                        await mammoth.convertToHtml({
                            arrayBuffer: buffer,

                            styleMap: [
                                "p[style-name='Heading 1'] => h1:fresh",
                                "p[style-name='Heading 2'] => h2:fresh",
                                "p[style-name='Heading 3'] => h3:fresh",
                            ],
                        });

                    if (cancelled) return;

                    const cleanedHtml =
                        result.value
                            .replace(
                                /&nbsp;/g,
                                " ",
                            )
                            .replace(
                                /\s+/g,
                                " ",
                            )
                            .replace(
                                />\s+</g,
                                "><",
                            )
                            .trim();

                    setExtractedContent(
                        cleanedHtml,
                    );

                    setPageImages([]);
                    setCurrentPage(0);
                    setIsPdfPreview(false);

                    return;
                }

                /*
                 * ==================================================
                 * PDF
                 * ==================================================
                 */

                if (isPdf) {
                    const pdf =
                        await pdfjsLib.getDocument(
                            {
                                data: buffer,
                            },
                        ).promise;

                    const images: string[] = [];
                    let htmlBuilder = "";

                    for (
                        let i = 1;
                        i <= pdf.numPages;
                        i++
                    ) {
                        if (cancelled) return;

                        const page =
                            await pdf.getPage(i);

                        /*
                         * ------------------------------------------
                         * Texto do PDF
                         * ------------------------------------------
                         */

                        const textContent =
                            await page.getTextContent();

                        const pageText =
                            textContent.items
                                .filter(
                                    (
                                        item,
                                    ): item is TextItem =>
                                        "str" in item,
                                )
                                .map(
                                    (item) =>
                                        item.str,
                                )
                                .join(" ")
                                .replace(
                                    /\s+/g,
                                    " ",
                                )
                                .trim();

                        if (pageText) {
                            htmlBuilder += `
                                <p class="mb-3 text-justify leading-relaxed">
                                    ${pageText}
                                </p>
                            `;
                        }

                        /*
                         * ------------------------------------------
                         * Renderização visual da página
                         *
                         * Mantém a proporção original do PDF.
                         * A largura final é controlada pelo CSS
                         * da preview.
                         * ------------------------------------------
                         */

                        const viewport =
                            page.getViewport({
                                scale: 1.5,
                            });

                        const canvas =
                            document.createElement(
                                "canvas",
                            );

                        const context =
                            canvas.getContext(
                                "2d",
                            );

                        if (!context) {
                            continue;
                        }

                        canvas.width =
                            Math.ceil(
                                viewport.width,
                            );

                        canvas.height =
                            Math.ceil(
                                viewport.height,
                            );

                        await page.render({
                            canvasContext:
                                context,
                            viewport,
                        }).promise;

                        images.push(
                            canvas.toDataURL(
                                "image/png",
                            ),
                        );
                    }

                    if (cancelled) return;

                    setExtractedContent(
                        htmlBuilder,
                    );

                    setPageImages(images);
                    setCurrentPage(0);
                    setIsPdfPreview(true);
                }
            } catch (error) {
                console.error(
                    "Erro na conversão:",
                    error,
                );

                if (!cancelled) {
                    setExtractedContent(
                        `<p class="text-red-500 font-medium">
                            Erro ao converter o arquivo.
                            Certifique-se de que é um PDF ou DOCX válido.
                        </p>`,
                    );

                    setPageImages([]);
                    setCurrentPage(0);
                    setIsPdfPreview(false);
                }
            } finally {
                if (!cancelled) {
                    setIsLoadingText(false);
                }
            }
        }

        processDocument();

        return () => {
            cancelled = true;
        };
    }, [templateFile]);

    /*
     * ============================================================
     * UPLOAD
     * ============================================================
     */

    const handleFileChange = (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const file =
            event.target.files?.[0];

        if (!file) return;

        setTemplateFile(file);
        setData("template", file);
    };

    const clearTemplate = () => {
        setTemplateFile(null);
        setData("template", null);

        setExtractedContent("");
        setPageImages([]);
        setCurrentPage(0);
        setIsPdfPreview(false);

        if (editorRef.current) {
            editorRef.current.innerHTML = "";
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cadastro de Modelos" />

            <form
                onSubmit={handleSubmit}
                className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 p-6 lg:grid-cols-12"
            >
                {/* =====================================================
                    PAINEL ESQUERDO
                ====================================================== */}

                <div className="flex flex-col justify-between space-y-5 rounded-xl border bg-card p-6 text-card-foreground shadow-sm lg:col-span-4">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold">
                                Configuração do Modelo
                            </h2>

                            <Dialog>
                                <DialogTrigger
                                    asChild
                                >
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
                                                Contratante:{" "}
                                                <span className="rounded bg-primary/10 px-1 py-0.5">
                                                    {"{{nome_do_cliente}}"}
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
                                                    Copie a chave gerada automaticamente.
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
                                                    Cole a tag no documento antes de enviar.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* NOME */}

                        <div className="space-y-1.5">
                            <Label htmlFor="model_name">
                                Nome do Modelo
                            </Label>

                            <Input
                                id="model_name"
                                name="model_name"
                                placeholder="Ex: Contrato de Prestação de Serviços"
                                value={data.name}
                                onChange={(event) =>
                                    setData(
                                        "name",
                                        event.target.value,
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

                        {/* UPLOAD */}

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
                                        accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                        className="hidden"
                                        onChange={
                                            handleFileChange
                                        }
                                    />
                                </label>
                            ) : (
                                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <FileText className="h-5 w-5 shrink-0 text-primary" />

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
                                        className="h-7 shrink-0 text-xs text-destructive hover:bg-destructive/10"
                                        onClick={
                                            clearTemplate
                                        }
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

                        {/* CAMPOS */}

                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Campos Dinâmicos
                            </h2>

                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                                {
                                    data.fields
                                        .length
                                }{" "}
                                {data.fields
                                    .length === 1
                                    ? "campo"
                                    : "campos"}
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
                                        className="group relative space-y-3 rounded-xl border bg-card/60 p-3.5 shadow-xs transition-colors hover:bg-card"
                                    >
                                        <div className="flex items-center justify-between border-b border-border/40 pb-1">
                                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                Campo #
                                                {index +
                                                    1}
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
                                                    data
                                                        .fields
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
                                                    event,
                                                ) =>
                                                    updateFieldName(
                                                        field.id,
                                                        event
                                                            .target
                                                            .value,
                                                    )
                                                }
                                                placeholder="Ex: Nome do Cliente"
                                                className="h-8 bg-background text-xs"
                                            />
                                        </div>

                                        <div className="grid grid-cols-12 items-start gap-3">
                                            <div className="col-span-8 min-w-0 space-y-1.5">
                                                <Label className="text-xs font-medium">
                                                    Tag / Slug
                                                </Label>

                                                <div className="relative flex items-center">
                                                    <Input
                                                        value={
                                                            field.slug
                                                                ? `{{${field.slug}}}`
                                                                : ""
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
                                                        <SelectValue placeholder="Selecione" />
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
                            onClick={
                                addField
                            }
                            variant="outline"
                            className="h-9 w-full border-dashed text-xs font-medium uppercase tracking-wide"
                        >
                            <Plus className="mr-1.5 h-4 w-4" />
                            Adicionar novo campo
                        </Button>
                    </div>

                    {/* AÇÕES */}

                    <div className="mt-6 flex items-center gap-3 border-t pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={
                                handleCancel
                            }
                            className="h-10 w-1/2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        >
                            <X className="mr-1.5 h-4 w-4" />
                            Cancelar
                        </Button>

                        <Button
                            type="submit"
                            disabled={
                                processing
                            }
                            className="h-10 w-1/2 bg-emerald-700 text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-emerald-800"
                        >
                            {processing ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-1.5 h-4 w-4" />
                            )}

                            Salvar Modelo
                        </Button>
                    </div>
                </div>

                {/* =====================================================
                    PREVIEW
                ====================================================== */}

                <div className="flex min-w-0 flex-col items-center lg:col-span-8">
                    {/* CABEÇALHO */}

                    <div className="mb-4 flex w-full max-w-[900px] items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />

                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Pré-visualização
                            </span>
                        </div>

                        {isPdfPreview &&
                            pageImages.length >
                                0 && (
                                <div className="flex items-center gap-3">
                                    {/* Navegação */}

                                    <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={
                                                goToPreviousPage
                                            }
                                            disabled={
                                                currentPage ===
                                                0
                                            }
                                            className="h-7 w-7"
                                            title="Página anterior"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>

                                        <span className="min-w-[80px] text-center text-xs font-semibold tabular-nums text-muted-foreground">
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
                                                goToNextPage
                                            }
                                            disabled={
                                                currentPage >=
                                                pageImages.length -
                                                    1
                                            }
                                            className="h-7 w-7"
                                            title="Próxima página"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                        {!isPdfPreview &&
                            templateFile && (
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                    <Edit3 className="h-3.5 w-3.5" />
                                    Clique na folha para editar o texto
                                </div>
                            )}
                    </div>

                    {/* DOCUMENTO */}

                    <div className="relative w-full max-w-[900px]">
                        <div className="relative mx-auto w-full max-w-[850px] overflow-hidden rounded-sm border border-border/80 bg-white shadow-xl">
                            {isLoadingText ? (
                                <div className="flex aspect-[595.2/841.8] w-full flex-col items-center justify-center gap-3 text-muted-foreground">
                                    <Loader2 className="h-7 w-7 animate-spin" />

                                    <span className="text-sm">
                                        Renderizando documento...
                                    </span>
                                </div>
                            ) : isPdfPreview &&
                              pageImages.length >
                                  0 ? (
                                /*
                                 * =====================================
                                 * PDF
                                 *
                                 * A imagem ocupa 100% da largura
                                 * disponível e mantém a proporção
                                 * original da página.
                                 * =====================================
                                 */
                                <div className="relative w-full bg-white">
                                    <img
                                        src={
                                            pageImages[
                                                currentPage
                                            ]
                                        }
                                        alt={`Página ${
                                            currentPage +
                                            1
                                        }`}
                                        className="block h-auto w-full select-none"
                                        draggable={
                                            false
                                        }
                                    />
                                </div>
                            ) : templateFile ? (
                                /*
                                 * =====================================
                                 * DOCX
                                 *
                                 * Mantém o editor de texto original.
                                 * =====================================
                                 */
                                <div className="min-h-[841px] w-full px-[48px] py-[42px] text-gray-900">
                                    <div
                                        ref={
                                            editorRef
                                        }
                                        contentEditable
                                        suppressContentEditableWarning
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
                                                `<p>Digite ou cole o texto do seu modelo diretamente aqui...</p>`,
                                        }}
                                    />
                                </div>
                            ) : (
                                /*
                                 * =====================================
                                 * ESTADO VAZIO
                                 * =====================================
                                 */
                                <div className="flex aspect-[595.2/841.8] w-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                                    <FileText className="mb-3 h-12 w-12 stroke-[1.5] text-muted-foreground/60" />

                                    <p className="text-sm font-medium">
                                        Nenhum documento carregado
                                    </p>

                                    <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                                        Faça upload de um PDF ou DOCX para visualizar e editar o modelo.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
