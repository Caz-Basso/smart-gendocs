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
import FileUpload from "@/components/file-upload";
import DocumentPreview from "@/components/document-preview";
import SaveAndCancelBtn from "@/components/save-and-cancel-btn";

import { Plus, Loader2, Save, X } from "lucide-react";

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
    const editorRef = useRef<HTMLDivElement>(null);

    const [loading, setIsLoadingText] = useState(false);
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
    const [pageImages, setPageImages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [isPdf, setIsPdf] = useState(false);

    const [extractedContent, setExtractedContent] = useState<string>(
        model.extracted_text || "",
    );

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

    const previousPage = () => {
        setCurrentPage((page) => Math.max(page - 1, 0));
    };

    const nextPage = () => {
        setCurrentPage((page) => Math.min(page + 1, pageImages.length - 1));
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

                const fileIsPdf =
                    file.type === "application/pdf" ||
                    file.name.toLowerCase().endsWith(".pdf");

                setIsPdf(fileIsPdf);
                setCurrentPage(0);
                setPageImages([]);

                if (!isDocx && !fileIsPdf) {
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

                if (fileIsPdf) {
                    const pdf = await pdfjsLib.getDocument({
                        data: buffer,
                    }).promise;

                    const images: string[] = [];
                    let htmlBuilder = "";

                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);

                        const viewport = page.getViewport({
                            scale: 1.5,
                        });

                        const canvas = document.createElement("canvas");
                        const context = canvas.getContext("2d");

                        if (!context) {
                            continue;
                        }

                        canvas.width = viewport.width;
                        canvas.height = viewport.height;

                        await page.render({
                            canvas,
                            canvasContext: context,
                            viewport,
                        }).promise;

                        images.push(canvas.toDataURL("image/png"));

                        const textContent = await page.getTextContent();

                        const pageText = textContent.items
                            .filter((item): item is TextItem => "str" in item)
                            .map((item) => item.str)
                            .join(" ")
                            .replace(/\s+/g, " ")
                            .trim();

                        if (pageText) {
                            htmlBuilder += `<p>${pageText}</p>`;
                        }
                    }

                    setPageImages(images);

                    const cleanedHtml = cleanHtml(htmlBuilder);

                    setExtractedContent(cleanedHtml);
                    setData("extracted_text", cleanedHtml);

                    return;
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

                        <FileUpload
                            templateFile={templateFile}
                            handleFileChange={handleFileChange}
                            onClearFile={() => {
                                setTemplateFile(null);
                                setData("template", null);
                                setExtractedContent(model.extracted_text || "");
                                setIsPdf(false);
                                setPageImages([]);
                                setCurrentPage(0);
                            }}
                            error={errors.template}
                        />

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

                    <SaveAndCancelBtn processing={processing} />
                </div>

                <DocumentPreview
                    loading={loading}
                    isPdf={isPdf}
                    pageImages={pageImages}
                    currentPage={currentPage}
                    templateFile={templateFile}
                    documentHtml={extractedContent}
                    editorRef={editorRef}
                    handleDragOver={handleDragOver}
                    handleDrop={handleDrop}
                    previousPage={previousPage}
                    nextPage={nextPage}
                />
            </form>
        </AppLayout>
    );
}
