import { useEffect, useMemo, useState } from "react";

import { Head, Link, useForm } from "@inertiajs/react";

import { Download, FileText, Plus } from "lucide-react";

import AppLayout from "@/layouts/app-layout";

import { dashboard, model_registration } from "@/routes";

import type { BreadcrumbItem } from "@/types";

import {
    MOCK_MODELS,
    type DocumentModel,
    type DynamicField,
} from "@/types/document";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: "Gerador de Documentos",
        href: dashboard(),
    },
];

interface DashboardProps {
    customModels?: DocumentModel[];
    showMockModels?: boolean;
    isAdmin?: boolean;
}

function getInitialData(
    model?: DocumentModel,
): Record<string, string> {
    if (!model) return {};

    const result: Record<string, string> = {};

    model.fields.forEach((field) => {
        result[field.slug] = field.defaultValue ?? "";
    });

    Object.assign(result, model.defaultData ?? {});

    return result;
}

function formatValue(
    field: DynamicField | undefined,
    value: string | undefined,
): string {
    if (!value) return "";
    if (!field) return value;

    if (field.type === "checkbox") {
        return value === "true" ? "Sim" : "Não";
    }

    if (
        field.type === "select" ||
        field.type === "radio"
    ) {
        const option = field.options?.find(
            (item) => item.value === value,
        );

        return option?.label ?? value;
    }

    if (field.type === "currency") {
        const numericValue =
            Number(value.replace(/\D/g, "")) / 100;

        if (!Number.isNaN(numericValue)) {
            return new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
            }).format(numericValue);
        }
    }

    if (field.type === "date") {
        const parts = value.split("-");

        if (parts.length === 3) {
            const [year, month, day] = parts;

            return `${day}/${month}/${year}`;
        }
    }

    return value;
}

export default function Dashboard({
    customModels = [],
    showMockModels = false,
    isAdmin = false,
}: DashboardProps) {
    const models = showMockModels
        ? MOCK_MODELS
        : customModels;

    const [selectedModelId, setSelectedModelId] =
        useState<string>(models[0]?.id ?? "");

    const selectedModel = useMemo(
        () =>
            models.find(
                (model) =>
                    model.id === selectedModelId,
            ) ?? models[0],
        [models, selectedModelId],
    );

    const {
        data,
        setData,
        processing,
    } = useForm<Record<string, string>>(
        getInitialData(selectedModel),
    );

    useEffect(() => {
        if (selectedModel) {
            setData(
                getInitialData(selectedModel),
            );
        }
    }, [selectedModelId]);

    const sections = useMemo(() => {
        if (!selectedModel?.fields) return [];

        const grouped = new Map<
            string,
            DynamicField[]
        >();

        selectedModel.fields.forEach((field) => {
            const section =
                field.section ??
                "Dados do Documento";

            if (!grouped.has(section)) {
                grouped.set(section, []);
            }

            grouped
                .get(section)!
                .push(field);
        });

        return Array.from(
            grouped.entries(),
        );
    }, [selectedModel]);

    function renderField(
        field: DynamicField,
    ) {
        const value =
            data[field.slug] ?? "";

        const label = (
            <Label
                htmlFor={field.slug}
                className="text-xs font-medium"
            >
                {field.name}

                {field.required && (
                    <span className="ml-1 text-red-500">
                        *
                    </span>
                )}
            </Label>
        );

        if (field.type === "textarea") {
            return (
                <div
                    key={field.id}
                    className="space-y-1.5"
                >
                    {label}

                    <Textarea
                        id={field.slug}
                        value={value}
                        placeholder={
                            field.placeholder
                        }
                        onChange={(event) =>
                            setData(
                                field.slug,
                                event.target
                                    .value,
                            )
                        }
                        className="min-h-[90px] resize-y bg-background"
                    />
                </div>
            );
        }

        if (field.type === "select") {
            return (
                <div
                    key={field.id}
                    className="space-y-1.5"
                >
                    {label}

                    <Select
                        value={value}
                        onValueChange={(
                            newValue,
                        ) =>
                            setData(
                                field.slug,
                                newValue,
                            )
                        }
                    >
                        <SelectTrigger
                            id={field.slug}
                            className="bg-background"
                        >
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>

                        <SelectContent>
                            {field.options?.map(
                                (option) => (
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
            );
        }

        if (field.type === "radio") {
            return (
                <div
                    key={field.id}
                    className="space-y-2"
                >
                    {label}

                    <RadioGroup
                        value={value}
                        onValueChange={(
                            newValue,
                        ) =>
                            setData(
                                field.slug,
                                newValue,
                            )
                        }
                        className="flex flex-wrap gap-4 pt-1"
                    >
                        {field.options?.map(
                            (option) => (
                                <div
                                    key={
                                        option.value
                                    }
                                    className="flex items-center gap-2"
                                >
                                    <RadioGroupItem
                                        id={`${field.slug}-${option.value}`}
                                        value={
                                            option.value
                                        }
                                    />

                                    <Label
                                        htmlFor={`${field.slug}-${option.value}`}
                                        className="cursor-pointer text-sm font-normal"
                                    >
                                        {
                                            option.label
                                        }
                                    </Label>
                                </div>
                            ),
                        )}
                    </RadioGroup>
                </div>
            );
        }

        if (field.type === "checkbox") {
            return (
                <div
                    key={field.id}
                    className="flex items-center gap-2 pt-1"
                >
                    <Checkbox
                        id={field.slug}
                        checked={
                            value === "true"
                        }
                        onCheckedChange={(
                            checked,
                        ) =>
                            setData(
                                field.slug,
                                checked
                                    ? "true"
                                    : "false",
                            )
                        }
                    />

                    <Label
                        htmlFor={field.slug}
                        className="cursor-pointer text-sm font-normal"
                    >
                        {field.name}
                    </Label>
                </div>
            );
        }

        let inputType:
            | "text"
            | "number"
            | "date"
            | "email" = "text";

        if (field.type === "number") {
            inputType = "number";
        }

        if (field.type === "date") {
            inputType = "date";
        }

        if (field.type === "email") {
            inputType = "email";
        }

        return (
            <div
                key={field.id}
                className="space-y-1.5"
            >
                {label}

                <Input
                    id={field.slug}
                    type={inputType}
                    value={value}
                    placeholder={
                        field.placeholder
                    }
                    onChange={(event) =>
                        setData(
                            field.slug,
                            event.target
                                .value,
                        )
                    }
                    className="bg-background"
                />
            </div>
        );
    }

    function renderPreviewText(
        text: string,
    ) {
        const parts = text.split(
            /(\{\{[^}]+\}\})/g,
        );

        return parts.map(
            (part, index) => {
                const match =
                    part.match(
                        /^\{\{(.+)\}\}$/,
                    );

                if (!match) {
                    return (
                        <span key={index}>
                            {part}
                        </span>
                    );
                }

                const slug = match[1];

                const field =
                    selectedModel?.fields.find(
                        (item) =>
                            item.slug ===
                            slug,
                    );

                const value =
                    formatValue(
                        field,
                        data[slug],
                    );

                if (!value) {
                    return (
                        <span
                            key={index}
                            className="rounded bg-amber-100 px-1 py-0.5 font-medium text-amber-800"
                        >
                            [
                            {
                                field?.name ??
                                slug
                            }
                            ]
                        </span>
                    );
                }

                return (
                    <strong key={index}>
                        {value}
                    </strong>
                );
            },
        );
    }

    function handleDownload() {
        if (!selectedModel) return;

        const formData =
            new FormData();

        formData.append(
            "model_id",
            selectedModel.id,
        );

        Object.entries(data).forEach(
            ([key, value]) => {
                formData.append(
                    `data[${key}]`,
                    value,
                );
            },
        );

        fetch("/modelos/gerar", {
            method: "POST",

            headers: {
                "X-CSRF-TOKEN":
                    document
                        .querySelector(
                            'meta[name="csrf-token"]',
                        )
                        ?.getAttribute(
                            "content",
                        ) || "",

                Accept:
                    "application/pdf",
            },

            body: formData,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        "Erro ao gerar documento",
                    );
                }

                return response.blob();
            })
            .then((blob) => {
                const url =
                    window.URL.createObjectURL(
                        blob,
                    );

                const a =
                    document.createElement(
                        "a",
                    );

                a.href = url;

                a.download = `${selectedModel.name
                    .replace(/\s+/g, "_")
                    .toLowerCase()}.pdf`;

                document.body.appendChild(
                    a,
                );

                a.click();

                window.URL.revokeObjectURL(
                    url,
                );

                document.body.removeChild(
                    a,
                );
            })
            .catch((error) => {
                console.error(
                    "Erro:",
                    error,
                );

                alert(
                    "Erro ao gerar documento. Tente novamente.",
                );
            });
    }

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
        >
            <Head title="Gerador de Documentos" />

            <div className="grid grid-cols-1 items-start gap-6 p-6 lg:grid-cols-12">
                {/* =====================================================
                    CONFIGURAÇÃO
                ====================================================== */}

                <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm lg:col-span-4">
                    <div className="shrink-0 space-y-4 p-6">
                        <div className="space-y-1">
                            <h1 className="text-base font-semibold tracking-tight">
                                Configuração do Documento
                            </h1>

                            <p className="text-xs leading-relaxed text-muted-foreground">
                                Preencha os campos abaixo para gerar o documento.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="model-select"
                                className="text-xs font-medium"
                            >
                                Modelo de Documento
                            </Label>

                            <div className="flex w-full min-w-0 items-center gap-2">
                                <Select
                                    value={
                                        selectedModel?.id ??
                                        ""
                                    }
                                    onValueChange={(
                                        value,
                                    ) =>
                                        setSelectedModelId(
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        id="model-select"
                                        className="min-w-0 flex-1 bg-background"
                                    >
                                        <SelectValue
                                            placeholder="Selecione o modelo"
                                            className="truncate"
                                        />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {models.map(
                                            (
                                                model,
                                            ) => (
                                                <SelectItem
                                                    key={
                                                        model.id
                                                    }
                                                    value={
                                                        model.id
                                                    }
                                                >
                                                    {
                                                        model.name
                                                    }
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>

                                {isAdmin && (
                                    <Link
                                        href={model_registration()}
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-white transition-colors hover:bg-emerald-800"
                                        title="Cadastrar Novo Modelo"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0 border-t border-border/80" />

                    <div className="flex-1 space-y-6 overflow-y-auto p-6 pr-4">
                        {sections.length ===
                        0 ? (
                            <div className="rounded-lg border border-dashed border-border p-6 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Nenhum campo disponível para este modelo.
                                </p>
                            </div>
                        ) : (
                            sections.map(
                                ([
                                    section,
                                    fields,
                                ]) => (
                                    <div
                                        key={
                                            section
                                        }
                                        className="space-y-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                                                {
                                                    section
                                                }
                                            </h2>

                                            <div className="h-px flex-1 bg-border/70" />
                                        </div>

                                        <div className="space-y-4">
                                            {fields.map(
                                                (
                                                    field,
                                                ) =>
                                                    renderField(
                                                        field,
                                                    ),
                                            )}
                                        </div>
                                    </div>
                                ),
                            )
                        )}
                    </div>
                </div>

                {/* =====================================================
                    PREVIEW
                ====================================================== */}

                <div className="flex min-w-0 flex-col items-center lg:col-span-8">
                    {/* Cabeçalho igual ao ModelRegistration */}

                    <div className="mb-4 flex w-full max-w-[900px] items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />

                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Pré-visualização do Documento
                            </span>
                        </div>

                        <Button
                            type="button"
                            disabled={
                                processing ||
                                !selectedModel
                            }
                            className="shrink-0 gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
                            onClick={
                                handleDownload
                            }
                        >
                            <Download className="h-4 w-4" />

                            {processing
                                ? "Gerando..."
                                : "Baixar Documento"}
                        </Button>
                    </div>

                    {/* =================================================
                        FOLHA

                        Esta é a parte importante:
                        mesma estrutura visual do ModelRegistration.
                    ================================================== */}

                    <div className="relative w-full max-w-[900px]">
                        <div className="relative mx-auto w-full max-w-[850px] overflow-hidden rounded-sm border border-border/80 bg-white shadow-xl">
                            <div
                                className="
                                    min-h-[841px]
                                    w-full
                                    px-[48px]
                                    py-[42px]
                                    text-gray-900
                                "
                            >
                                {selectedModel?.preview
                                    ?.length ? (
                                    selectedModel.preview.map(
                                        (
                                            paragraph,
                                            index,
                                        ) => {
                                            /*
                                             * Espaçamento vazio
                                             * exatamente como uma
                                             * quebra de documento.
                                             */

                                            if (
                                                paragraph ===
                                                ""
                                            ) {
                                                return (
                                                    <div
                                                        key={
                                                            index
                                                        }
                                                        className="h-4"
                                                    />
                                                );
                                            }

                                            /*
                                             * Primeiro parágrafo:
                                             * título do documento.
                                             */

                                            const isTitle =
                                                index ===
                                                0;

                                            /*
                                             * Identifica cláusulas
                                             * de forma independente
                                             * de maiúsculas/minúsculas.
                                             */

                                            const isClause =
                                                paragraph
                                                    .trim()
                                                    .toUpperCase()
                                                    .startsWith(
                                                        "CLÁUSULA",
                                                    );

                                            /*
                                             * O visual agora segue
                                             * diretamente o editor
                                             * do ModelRegistration.
                                             */

                                            return (
                                                <p
                                                    key={
                                                        index
                                                    }
                                                    className={
                                                        isTitle
                                                            ? "mb-8 text-center text-base font-bold uppercase tracking-wide"
                                                            : isClause
                                                              ? "mb-2 mt-5 text-xs font-bold uppercase tracking-wide"
                                                              : "mb-3 text-justify text-[13px] leading-[1.7] font-sans text-[#333]"
                                                    }
                                                >
                                                    {renderPreviewText(
                                                        paragraph,
                                                    )}
                                                </p>
                                            );
                                        },
                                    )
                                ) : (
                                    <div className="flex min-h-[750px] items-center justify-center text-center">
                                        <div className="max-w-sm">
                                            <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />

                                            <p className="text-sm font-medium text-muted-foreground">
                                                Nenhum documento disponível
                                            </p>

                                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground/70">
                                                Selecione um modelo para visualizar o conteúdo do documento.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}