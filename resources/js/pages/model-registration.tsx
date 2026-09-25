import { useState, type DragEvent, type FormEvent } from "react";

import AppLayout from "@/layouts/app-layout";
import { BreadcrumbItem } from "@/types";
import { Head, useForm } from "@inertiajs/react";
import { model_registration } from "@/routes";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Plus } from "lucide-react";

import HowToUseDialog from "@/components/how-to-use-dialog";
import DynamicField from "@/components/dynamic-field";
import FileUpload from "@/components/file-upload";
import DocumentPreview from "@/components/document-preview";
import SaveAndCancelBtn from "@/components/save-and-cancel-btn";

import { useModelFields } from "@/hooks/use-model-fields";
import { useDocumentPreview } from "@/hooks/use-document-preview";
import type { ModelField } from "@/types/model-field";

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

export default function ModelRegistration({ fieldTypeOptions = [] }: Props) {
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
    } = useDocumentPreview();

    const { data, setData, post, processing, errors } = useForm({
        name: "",
        template: null as File | null,
        fields: [
            {
                id: "1",
                name: "Nome do Cliente",
                slug: "nome_do_cliente",
                type: "text",
            },
        ] as ModelField[],
        extracted_text: "",
    });

    const { addField, removeField, updateFieldName, updateFieldType } =
        useModelFields({
            fields: data.fields,
            setFields: (fields) => setData("fields", fields),
        });

    const handleDragStart = (event: DragEvent<HTMLDivElement>, tag: string) => {
        event.dataTransfer.setData("text/plain", tag);
        event.dataTransfer.effectAllowed = "copy";
    };

    const handleCopyTag = async (slug: string) => {
        try {
            await navigator.clipboard.writeText(`{{${slug}}}`);

            setCopiedSlug(slug);

            setTimeout(() => setCopiedSlug(null), 2000);
        } catch (error) {
            console.error("Erro ao copiar tag:", error);
        }
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!data.name.trim()) {
            alert("Por favor, informe o nome do modelo.");
            return;
        }

        if (!data.template) {
            alert("Selecione um arquivo para o modelo.");
            return;
        }

        const html = editorRef.current?.innerHTML ?? "";

        setData("extracted_text", html);

        post("/modelos", {
            onSuccess: () => {
                alert("Modelo salvo com sucesso!");
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

                            <HowToUseDialog />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="model_name">Nome do Modelo</Label>

                            <Input
                                id="model_name"
                                value={data.name}
                                onChange={(e) =>
                                    setData("name", e.target.value)
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

                        <FileUpload
                            templateFile={templateFile}
                            handleFileChange={(event) => {
                                handleFileChange(event);
                                const file = event.target.files?.[0] ?? null;
                                setData("template", file);
                            }}
                            onClearFile={() => {
                                clearTemplate();
                                setData("template", null);
                            }}
                            error={errors.template}
                        />

                        <hr />

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
                            variant="outline"
                            onClick={addField}
                            className="w-full border-dashed"
                        >
                            <Plus className="mr-2 h-4 w-4" />
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
