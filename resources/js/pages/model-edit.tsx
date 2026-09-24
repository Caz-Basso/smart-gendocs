import {
    useState,
    useEffect,
    type ChangeEvent,
    type FormEvent,
    type DragEvent,
    useRef,
} from "react";

import AppLayout from "@/layouts/app-layout";
import type { BreadcrumbItem } from "@/types";
import { Head, useForm } from "@inertiajs/react";
import { model_registration } from "@/routes";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import HowToUseDialog from "@/components/how-to-use-dialog";
import DynamicField from "@/components/dynamic-field";

import {
    Plus,
    Upload,
    FileText,
    Loader2,
    Save,
    X,
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
    model: {
        id: string;
        name: string;
        fields: FieldItem[];
        extracted_text: string | null;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Editar Modelo",
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

function cleanHtml(html: string) {
    return html
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .replace(/>\s+</g, "><")
        .trim();
}

export default function ModelEdit({ fieldTypeOptions = [], model }: Props) {
    const [templateFile, setTemplateFile] = useState<File | null>(null);

    const [extractedContent, setExtractedContent] = useState<string>(
        model.extracted_text || "",
    );

    const [isLoadingText, setIsLoadingText] = useState(false);
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

    const editorRef = useRef<HTMLDivElement>(null);

    const { data, setData, put, processing, errors } = useForm<{
        name: string;
        template: File | null;
        fields: FieldItem[];
        extracted_text: string;
    }>({
        name: model.name || "",
        template: null,
        fields:
            model.fields?.length > 0
                ? model.fields
                : [
                      {
                          id: "1",
                          name: "Nome do Cliente",
                          slug: "nome_do_cliente",
                          type: "text",
                      },
                  ],
        extracted_text: model.extracted_text || "",
    });

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
        if (data.fields.length === 1) {
            return;
        }

        setData(
            "fields",
            data.fields.filter((field) => field.id !== id),
        );
    };

    const updateFieldName = (id: string, name: string) => {
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

    const updateFieldType = (id: string, type: string) => {
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
        const tag = `{{${slug}}}`;

        try {
            await navigator.clipboard.writeText(tag);

            setCopiedSlug(slug);

            setTimeout(() => {
                setCopiedSlug(null);
            }, 2000);
        } catch (error) {
            console.error("Erro ao copiar tag:", error);
        }
    };

    const getCaretRange = (event: DragEvent<HTMLDivElement>): Range | null => {
        const { clientX, clientY } = event;

        if (typeof document.caretPositionFromPoint === "function") {
            const position = document.caretPositionFromPoint(clientX, clientY);

            if (!position || !position.offsetNode) {
                return null;
            }

            const range = document.createRange();
            range.setStart(position.offsetNode, position.offset);
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

        event.dataTransfer.setData("text/plain", `{{${slug}}}`);

        event.dataTransfer.effectAllowed = "copy";
    };

    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        event.dataTransfer.dropEffect = "copy";
    };

    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();

        const editor = editorRef.current;

        const text = event.dataTransfer.getData("text/plain");

        if (!editor || !text) {
            return;
        }

        const range = getCaretRange(event);

        if (!range || !editor.contains(range.commonAncestorContainer)) {
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

        const updatedHtml = editor.innerHTML;

        setExtractedContent(updatedHtml);
        setData("extracted_text", updatedHtml);
    };

    const handleCancel = () => {
        const confirmed = window.confirm(
            "Tem certeza que deseja cancelar? As alterações não salvas serão perdidas.",
        );

        if (confirmed) {
            window.history.back();
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (!data.name.trim()) {
            alert("Por favor, informe o nome do modelo.");
            return;
        }

        const updatedHtmlContent = editorRef.current
            ? editorRef.current.innerHTML
            : extractedContent;

        const cleanedHtml = cleanHtml(updatedHtmlContent);

        put(`/modelos/${model.id}`, {
            onSuccess: () => {
                alert("Modelo atualizado com sucesso!");
            },
            onError: (formErrors) => {
                console.error("Erros de validação:", formErrors);
            },
        });
    };

    useEffect(() => {
        if (!templateFile) {
            return;
        }

        const file = templateFile;

        async function processDocument() {
            setIsLoadingText(true);

            try {
                const buffer = await file.arrayBuffer();

                const isDocx =
                    file.type ===
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                    file.name.toLowerCase().endsWith(".docx");

                const isPdf =
                    file.type === "application/pdf" ||
                    file.name.toLowerCase().endsWith(".pdf");

                if (!isDocx && !isPdf) {
                    setExtractedContent(`
                        <p class="text-red-500 font-medium">
                            Tipo de arquivo não suportado. Por favor, selecione um arquivo .docx ou .pdf.
                        </p>
                    `);

                    return;
                }

                if (isDocx) {
                    const result = await mammoth.convertToHtml(
                        { arrayBuffer: buffer },
                        {
                            styleMap: [
                                "p[style-name='Heading 1'] => h1:fresh",
                                "p[style-name='Heading 2'] => h2:fresh",
                                "p[style-name='Heading 3'] => h3:fresh",
                            ],
                        },
                    );

                    const cleanedHtml = cleanHtml(result.value);

                    setExtractedContent(cleanedHtml);
                    setData("extracted_text", cleanedHtml);

                    return;
                }

                if (isPdf) {
                    const pdf = await pdfjsLib.getDocument({
                        data: buffer,
                    }).promise;

                    let htmlBuilder = "";

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();

                        const pageText = textContent.items
                            .filter((item): item is TextItem => "str" in item)
                            .map((item) => item.str)
                            .join(" ")
                            .replace(/\s+/g, " ")
                            .trim();

                        if (pageText) {
                            htmlBuilder += `
                                <p>
                                    ${pageText}
                                </p>
                            `;
                        }
                    }

                    const cleanedHtml = cleanHtml(htmlBuilder);

                    setExtractedContent(cleanedHtml);
                    setData("extracted_text", cleanedHtml);
                }
            } catch (error) {
                console.error("Erro na conversão:", error);

                const errorHtml = `
                    <p class="text-red-500 font-medium">
                        Erro ao converter o arquivo. Certifique-se de que é um PDF ou DOCX válido.
                    </p>
                `;

                setExtractedContent(errorHtml);
                setData("extracted_text", errorHtml);
            } finally {
                setIsLoadingText(false);
            }
        }

        processDocument();
    }, [templateFile]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        setTemplateFile(file);
        setData("template", file);
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

                            <HowToUseDialog />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="model_name">Nome do Modelo</Label>

                            <Input
                                id="model_name"
                                name="model_name"
                                placeholder="Ex: Contrato de Prestação de Serviços"
                                value={data.name}
                                onChange={(e) =>
                                    setData("name", e.target.value)
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
                                        onChange={handleFileChange}
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
                                            setTemplateFile(null);

                                            setData("template", null);

                                            setExtractedContent(
                                                model.extracted_text || "",
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

                        <DynamicField
                            fields={data.fields}
                            fieldTypeOptions={fieldTypeOptions}
                            copiedSlug={copiedSlug}
                            removeField={removeField}
                            updateFieldName={updateFieldName}
                            updateFieldType={updateFieldType}
                            handleDragStart={handleDragStart}
                            handleCopyTag={handleCopyTag}
                        />

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

                            {processing ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>
                </div>

                <div className="flex min-w-0 flex-col items-center lg:col-span-8">
                    <div className="mb-4 flex w-full max-w-[900px] items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Pré-visualização
                            </span>
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
                            ) : (
                                <div className="min-h-[841px] w-full px-[48px] py-[42px] text-gray-900">
                                    <div
                                        ref={editorRef}
                                        contentEditable
                                        suppressContentEditableWarning
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                        className=" document-editor min-h-[750px] w-full outline-none font-sans text-[13px] leading-[1.7] text-[#333] focus:outline-none"
                                        dangerouslySetInnerHTML={{
                                            __html:
                                                extractedContent ||
                                                "<p>Digite ou cole o texto do seu modelo diretamente aqui...</p>",
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
