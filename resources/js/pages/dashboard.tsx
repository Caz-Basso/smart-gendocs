import { Head, useForm, Link } from '@inertiajs/react';
import { Download, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { dashboard, model_registration } from '@/routes';
import type { BreadcrumbItem } from '@/types';
import {
    MOCK_MODELS,
    type DocumentModel,
    type DynamicField,
} from '@/types/document';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gerador de Documentos',
        href: dashboard(),
    },
];

interface DashboardProps {
    customModels?: DocumentModel[];
    showMockModels?: boolean;
    isAdmin?: boolean;
}

function getInitialData(model?: DocumentModel): Record<string, string> {
    if (!model) return {};

    const result: Record<string, string> = {};

    model.fields.forEach((field) => {
        result[field.slug] = field.defaultValue ?? '';
    });

    Object.assign(result, model.defaultData ?? {});

    return result;
}

function formatValue(
    field: DynamicField | undefined,
    value: string | undefined,
): string {
    if (!value) return '';
    if (!field) return value;

    if (field.type === 'checkbox') {
        return value === 'true' ? 'Sim' : 'Não';
    }

    if (field.type === 'select' || field.type === 'radio') {
        const option = field.options?.find((item) => item.value === value);
        return option?.label ?? value;
    }

    if (field.type === 'currency') {
        const numericValue = Number(value.replace(/\D/g, '')) / 100;
        if (!Number.isNaN(numericValue)) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
            }).format(numericValue);
        }
    }

    if (field.type === 'date') {
        const parts = value.split('-');
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
    const models = showMockModels ? MOCK_MODELS : customModels;

    const [selectedModelId, setSelectedModelId] = useState<string>(
        models[0]?.id ?? '',
    );

    const selectedModel = useMemo(
        () => models.find((model) => model.id === selectedModelId) ?? models[0],
        [models, selectedModelId],
    );

    const { data, setData, post, processing } = useForm<Record<string, string>>(
        getInitialData(selectedModel),
    );

    useEffect(() => {
        if (selectedModel) {
            const initial = getInitialData(selectedModel);
            setData(initial);
        }
    }, [selectedModelId]);

    const sections = useMemo(() => {
        if (!selectedModel?.fields) return [];

        const grouped = new Map<string, DynamicField[]>();

        selectedModel.fields.forEach((field) => {
            const section = field.section ?? 'Dados do Documento';

            if (!grouped.has(section)) {
                grouped.set(section, []);
            }

            grouped.get(section)!.push(field);
        });

        return Array.from(grouped.entries());
    }, [selectedModel]);

    function renderField(field: DynamicField) {
        const value = data[field.slug] ?? '';

        const label = (
            <Label htmlFor={field.slug} className="text-xs font-medium">
                {field.name}
                {field.required && <span className="ml-1 text-red-500">*</span>}
            </Label>
        );

        if (field.type === 'textarea') {
            return (
                <div key={field.id} className="space-y-1.5">
                    {label}
                    <Textarea
                        id={field.slug}
                        value={value}
                        placeholder={field.placeholder}
                        onChange={(e) => setData(field.slug, e.target.value)}
                        className="min-h-[80px] bg-background"
                    />
                </div>
            );
        }

        if (field.type === 'select') {
            return (
                <div key={field.id} className="space-y-1.5">
                    {label}
                    <Select
                        value={value}
                        onValueChange={(newValue) =>
                            setData(field.slug, newValue)
                        }
                    >
                        <SelectTrigger
                            id={field.slug}
                            className="bg-background"
                        >
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            );
        }

        if (field.type === 'radio') {
            return (
                <div key={field.id} className="space-y-2">
                    {label}
                    <RadioGroup
                        value={value}
                        onValueChange={(newValue) =>
                            setData(field.slug, newValue)
                        }
                        className="flex flex-wrap gap-4"
                    >
                        {field.options?.map((option) => (
                            <div
                                key={option.value}
                                className="flex items-center gap-2"
                            >
                                <RadioGroupItem
                                    id={`${field.slug}-${option.value}`}
                                    value={option.value}
                                />
                                <Label
                                    htmlFor={`${field.slug}-${option.value}`}
                                    className="cursor-pointer text-sm font-normal"
                                >
                                    {option.label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>
            );
        }

        if (field.type === 'checkbox') {
            return (
                <div key={field.id} className="flex items-center gap-2 pt-1">
                    <Checkbox
                        id={field.slug}
                        checked={value === 'true'}
                        onCheckedChange={(checked) =>
                            setData(field.slug, checked ? 'true' : 'false')
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

        let inputType: 'text' | 'number' | 'date' | 'email' = 'text';

        if (field.type === 'number') inputType = 'number';
        if (field.type === 'date') inputType = 'date';
        if (field.type === 'email') inputType = 'email';

        return (
            <div key={field.id} className="space-y-1.5">
                {label}
                <Input
                    id={field.slug}
                    type={inputType}
                    value={value}
                    placeholder={field.placeholder}
                    onChange={(e) => setData(field.slug, e.target.value)}
                    className="bg-background"
                />
            </div>
        );
    }

    function renderPreviewText(text: string) {
        const parts = text.split(/(\{\{[^}]+\}\})/g);

        return parts.map((part, index) => {
            const match = part.match(/^\{\{(.+)\}\}$/);

            if (!match) {
                return <span key={index}>{part}</span>;
            }

            const slug = match[1];
            const field = selectedModel?.fields.find(
                (item) => item.slug === slug,
            );
            const value = formatValue(field, data[slug]);

            if (!value) {
                return (
                    <span
                        key={index}
                        className="rounded bg-amber-100 px-1 py-0.5 font-medium text-amber-800"
                    >
                        [{field?.name ?? slug}]
                    </span>
                );
            }

            return <strong key={index}>{value}</strong>;
        });
    }

    function handleDownload() {
        if (!selectedModel) return;

        // Enviar dados para o backend gerar o PDF
        const formData = new FormData();
        formData.append('model_id', selectedModel.id);

        Object.entries(data).forEach(([key, value]) => {
            formData.append(`data[${key}]`, value);
        });

        fetch('/modelos/gerar', {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN':
                    document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content') || '',
                Accept: 'application/pdf',
            },
            body: formData,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Erro ao gerar documento');
                }
                return response.blob();
            })
            .then((blob) => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selectedModel.name.replace(/\s+/g, '_').toLowerCase()}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            })
            .catch((error) => {
                console.error('Erro:', error);
                alert('Erro ao gerar documento. Tente novamente.');
            });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gerador de Documentos" />

            <div className="grid grid-cols-1 items-start gap-6 p-4 lg:grid-cols-12">
                <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col space-y-6 overflow-hidden rounded-xl border bg-card p-6 shadow-sm lg:col-span-4">
                    <div className="shrink-0 space-y-1.5">
                        <Label htmlFor="model-select">
                            Modelo de Documento
                        </Label>
                        <div className="flex w-full min-w-0 items-center gap-2">
                            <Select
                                value={selectedModel?.id ?? ''}
                                onValueChange={(value) =>
                                    setSelectedModelId(value)
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

                    <hr className="shrink-0 border-border" />

                    <div className="flex-1 space-y-6 overflow-y-auto pr-2">
                        {sections.map(([section, fields]) => (
                            <div key={section} className="space-y-4">
                                <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    {section}
                                </h2>
                                <div className="space-y-4">
                                    {fields.map((field) => renderField(field))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col items-center lg:col-span-8">
                    <div className="mb-4 flex w-full max-w-[700px] items-center justify-between gap-4">
                        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Pré-visualização do Documento
                        </span>

                        <Button
                            type="button"
                            disabled={processing}
                            className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
                            onClick={handleDownload}
                        >
                            <Download className="h-4 w-4" />
                            {processing ? 'Gerando...' : 'Baixar Documento'}
                        </Button>
                    </div>

                    <div className="min-h-[850px] w-full max-w-[700px] rounded-sm border bg-white p-10 text-black shadow-md">
                        {selectedModel?.preview?.map((paragraph, index) => {
                            if (paragraph === '') {
                                return <div key={index} className="h-4" />;
                            }

                            const isTitle = index === 0;
                            const isClause = paragraph.startsWith('CLÁUSULA');

                            return (
                                <p
                                    key={index}
                                    className={
                                        isTitle
                                            ? 'mb-8 text-center text-base font-bold tracking-wide uppercase'
                                            : isClause
                                              ? 'mt-5 mb-2 text-xs font-bold tracking-wide uppercase'
                                              : 'mb-3 text-justify text-xs leading-relaxed text-gray-800'
                                    }
                                >
                                    {renderPreviewText(paragraph)}
                                </p>
                            );
                        })}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
