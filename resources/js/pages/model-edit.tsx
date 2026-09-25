import { useState, type DragEvent, SyntheticEvent } from "react";

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

import { useModelFields } from "@/hooks/use-model-fields";
import { useDocumentPreview } from "@/hooks/use-document-preview";

import { Plus } from "lucide-react";

import { ModelField } from "@/types/model-field";

interface FieldTypeOption {
    value: string;
    label: string;
}

interface Props {
    fieldTypeOptions: FieldTypeOption[];
    model: {
        id: string;
        name: string;
        fields: ModelField[];
        extracted_text: string | null;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Editar Modelo",
        href: model_registration(),
    },
];

export default function ModelEdit({ fieldTypeOptions = [], model }: Props) {
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

    const {
        templateFile,
        documentPages,
        currentPage,
        loading,
        editorRef,
        handleFileChange,
        clearTemplate,
        handleDragOver,
        handleDrop,
        previousPage,
        nextPage,
    } = useDocumentPreview({
        initialDocumentHtml: model.extracted_text || "",
    });

    const { data, setData, put, processing, errors } = useForm<{
        name: string;
        template: File | null;
        fields: ModelField[];
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

    const { addField, removeField, updateFieldName, updateFieldType } =
        useModelFields({
            fields: data.fields,
            setFields: (fields) => setData("fields", fields),
        });

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

    const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!data.name.trim()) {
            alert("Por favor, informe o nome do modelo.");
            return;
        }

        const updatedHtmlContent = editorRef.current?.innerHTML ?? "";

        setData("extracted_text", updatedHtmlContent);

        put(`/modelos/${model.id}`, {
            onSuccess: () => {
                alert("Modelo atualizado com sucesso!");
            },
            onError: (formErrors) => {
                console.error("Erros de validação:", formErrors);
            },
        });
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
                            handleFileChange={(event) => {
                                handleFileChange(event);
                                setData(
                                    "template",
                                    event.target.files?.[0] ?? null,
                                );
                            }}
                            onClearFile={() => {
                                clearTemplate();
                                setData("template", null);
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
                    documentPages={documentPages}
                    currentPage={currentPage}
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
