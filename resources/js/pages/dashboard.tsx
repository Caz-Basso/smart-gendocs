import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Download, Plus, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DocumentPreview } from '@/components/document/document-preview';
import { DynamicFieldInput } from '@/components/document/dynamic-field-input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DocumentModel } from '@/types/document';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useGenerateDocument } from '@/hooks/use-generate-document';
import AppLayout from '@/layouts/app-layout';
import { getInitialData, groupFieldsBySection } from '@/lib/document-fields';
import { dashboard, model_registration } from '@/routes';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Gerador de Documentos', href: dashboard() },
];

interface DashboardProps {
    customModels?: DocumentModel[];
    showMockModels?: boolean;
    isAdmin?: boolean;
}

export default function Dashboard({
    customModels = [],
    isAdmin = false,
}: DashboardProps) {
    const { auth } = usePage().props;
    const models = customModels;

    const [selectedModelId, setSelectedModelId] = useState<string>(
        models[0]?.id ?? '',
    );

    const selectedModel = useMemo(
        () => models.find((model) => model.id === selectedModelId) ?? models[0],
        [models, selectedModelId],
    );

    const { data, setData, processing } = useForm<Record<string, string>>(
        getInitialData(selectedModel),
    );
    const { generate, isGenerating } = useGenerateDocument();

    useEffect(() => {
        if (selectedModel) setData(getInitialData(selectedModel));
    }, [selectedModelId]);

    const sections = useMemo(
        () => groupFieldsBySection(selectedModel?.fields),
        [selectedModel],
    );

    const handleDownload = () => {
        if (!selectedModel) return;

        generate({
            model: selectedModel,
            data,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gerador de Documentos" />

            <div className="grid grid-cols-1 items-start gap-6 p-6 lg:grid-cols-12">
                <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm lg:col-span-4">
                    <div className="shrink-0 space-y-4 p-6">
                        <h1 className="text-base font-semibold tracking-tight">
                            Configuração do Documento
                        </h1>

                        <div className="space-y-1.5">
                            <Label
                                htmlFor="model-select"
                                className="text-xs font-medium"
                            >
                                Modelo de Documento
                            </Label>

                            <div className="flex w-full min-w-0 items-center gap-2">
                                <Select
                                    value={selectedModel?.id ?? ''}
                                    onValueChange={setSelectedModelId}
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
                                        {models.map((model) => (
                                            <SelectItem
                                                key={model.id}
                                                value={model.id}
                                            >
                                                {model.name}
                                            </SelectItem>
                                        ))}
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
                        {sections.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border p-6 text-center">
                                <p className="text-sm text-muted-foreground">
                                    Nenhum campo disponível para este modelo.
                                </p>
                            </div>
                        ) : (
                            sections.map(([section, fields]) => (
                                <div key={section} className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                                            {section}
                                        </h2>

                                        <div className="h-px flex-1 bg-border/70" />
                                    </div>

                                    <div className="space-y-4">
                                        {fields.map((field) => (
                                            <DynamicFieldInput
                                                key={field.id}
                                                field={field}
                                                value={data[field.slug] ?? ''}
                                                onChange={(value) =>
                                                    setData(field.slug, value)
                                                }
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="flex min-w-0 flex-col items-center lg:col-span-8">
                    <div className="mb-4 flex w-full max-w-[900px] items-center justify-between gap-4">
                        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Pré-visualização do Documento
                        </span>

                        <Button
                            type="button"
                            className="shrink-0 gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
                            onClick={handleDownload}
                            disabled={isGenerating || processing}
                        >
                            <Download className="h-4 w-4" />
                            {isGenerating ? 'Salvando...' : 'Salvar e baixar'}
                        </Button>
                    </div>

                    <div className="relative w-full max-w-[980px]">
                        <DocumentPreview
                            preview={selectedModel?.preview}
                            extractedHtml={selectedModel?.extracted_text}
                            fields={selectedModel?.fields ?? []}
                            data={data}
                            elements={selectedModel?.elements}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
