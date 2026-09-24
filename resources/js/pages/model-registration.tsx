import { Head, useForm } from '@inertiajs/react';
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
} from 'lucide-react';
import mammoth from 'mammoth';
import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { model_registration } from '@/routes';
import { BreadcrumbItem } from '@/types';

/**
 * Imagens extraídas de PDFs/DOCX (ex.: logos) vêm em resolução nativa da
 * página; sem limite elas estouram a largura do editor. Injetamos estilo
 * inline (que vence qualquer CSS) limitando a largura de cada <img>.
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
        title: 'Cadastro de Modelos',
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

export default function ModelRegistration({ fieldTypeOptions = [] }: Props) {
    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [extractedContent, setExtractedContent] = useState<string>('');
    const [isLoadingText, setIsLoadingText] = useState(false);
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

    const editorRef = useRef<HTMLDivElement>(null);

    const { data, setData, post, processing, errors } = useForm<{
        name: string;
        template: File | null;
        fields: FieldItem[];
        extracted_text: string;
    }>({
        name: '',
        template: null,
        fields: [
            {
                id: '1',
                name: 'Nome do Cliente',
                slug: 'nome_do_cliente',
                type: 'text',
            },
        ],
        extracted_text: '',
    });

    const addField = () => {
        const newId = String(Date.now());
        setData('fields', [
            ...data.fields,
            { id: newId, name: '', slug: '', type: 'text' },
        ]);
    };

    const removeField = (id: string) => {
        if (data.fields.length === 1) return;
        setData(
            'fields',
            data.fields.filter((f) => f.id !== id),
        );
    };

    const updateFieldName = (id: string, name: string) => {
        setData(
            'fields',
            data.fields.map((f) =>
                f.id === id ? { ...f, name, slug: slugify(name) } : f,
            ),
        );
    };

    const updateFieldType = (id: string, type: string) => {
        setData(
            'fields',
            data.fields.map((f) => (f.id === id ? { ...f, type } : f)),
        );
    };

    const handleCopyTag = (slug: string) => {
        const tag = `{{${slug}}}`;
        navigator.clipboard.writeText(tag);
        setCopiedSlug(slug);
        setTimeout(() => setCopiedSlug(null), 2000);
    };

    const handleCancel = () => {
        if (
            window.confirm(
                'Tem certeza que deseja cancelar? As alterações não salvas serão perdidas.',
            )
        ) {
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

        // Limpar o HTML antes de salvar
        const cleanedHtml = updatedHtmlContent
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/>\s+</g, '><')
            .trim();

        setData('extracted_text', cleanedHtml);

        post('/modelos', {
            onSuccess: () => {
                alert('Modelo salvo com sucesso!');
            },
            onError: (errors) => {
                console.error('Erros de validação:', errors);
            },
        });
    };

    useEffect(() => {
        if (!templateFile) {
            setExtractedContent('');
            return;
        }

        async function processDocument() {
            setIsLoadingText(true);
            try {
                const buffer = await templateFile!.arrayBuffer();

                const isDocx =
                    templateFile!.type ===
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                    templateFile!.name.endsWith('.docx');
                const isPdf =
                    templateFile!.type === 'application/pdf' ||
                    templateFile!.name.endsWith('.pdf');

                if (!isDocx && !isPdf) {
                    setExtractedContent(
                        '<p class="text-red-500 font-medium">Tipo de arquivo não suportado. Por favor, selecione um arquivo .docx ou .pdf.</p>',
                    );
                    return;
                }

                if (isDocx) {
                    const result = await mammoth.convertToHtml({
                        arrayBuffer: buffer,
                        styleMap: [
                            "p[style-name='Heading 1'] => h1:fresh",
                            "p[style-name='Heading 2'] => h2:fresh",
                            "p[style-name='Heading 3'] => h3:fresh",
                        ],
                    });
                    // Limpar o HTML extraído
                    const cleanedHtml = constrainImages(
                        result.value
                            .replace(/&nbsp;/g, ' ')
                            .replace(/\s+/g, ' ')
                            .replace(/>\s+</g, '><')
                            .trim(),
                    );
                    setExtractedContent(cleanedHtml);
                } else if (isPdf) {
                    // Converte o PDF no servidor (pdf2docx) preservando a estrutura
                    // (parágrafos, títulos e tabelas) e renderiza o DOCX no editor.
                    const formData = new FormData();
                    formData.append('file', templateFile!);

                    const response = await fetch('/modelos/converter-pdf', {
                        method: 'POST',
                        headers: {
                            'X-CSRF-TOKEN':
                                document
                                    .querySelector('meta[name="csrf-token"]')
                                    ?.getAttribute('content') || '',
                            Accept: 'application/json',
                        },
                        body: formData,
                    });

                    if (!response.ok) {
                        const detail = await response.json().catch(() => null);
                        const reason =
                            detail?.error ?? `HTTP ${response.status}`;
                        setExtractedContent(
                            `<p class="text-red-500 font-medium">Não foi possível converter o PDF (${reason}). Verifique se o serviço de conversão está ativo.</p>`,
                        );
                        return;
                    }

                    // Respostas que não são DOCX (ex.: redirect de sessão expirada
                    // devolve HTML com 200) não podem ir para o mammoth.
                    const contentType =
                        response.headers.get('Content-Type') ?? '';
                    if (!contentType.includes('wordprocessingml')) {
                        setExtractedContent(
                            '<p class="text-red-500 font-medium">Sua sessão expirou. Recarregue a página e tente novamente.</p>',
                        );
                        return;
                    }

                    // O DOCX retornado (com a estrutura do PDF) segue o mesmo caminho
                    // do upload .docx: mammoth converte para HTML estruturado.
                    const docxBuffer = await response.arrayBuffer();
                    const result = await mammoth.convertToHtml({
                        arrayBuffer: docxBuffer,
                        styleMap: [
                            "p[style-name='Heading 1'] => h1:fresh",
                            "p[style-name='Heading 2'] => h2:fresh",
                            "p[style-name='Heading 3'] => h3:fresh",
                        ],
                    });
                    const cleanedHtml = constrainImages(result.value)
                        .replace(/&nbsp;/g, ' ')
                        .replace(/\s+/g, ' ')
                        .replace(/>\s+</g, '><')
                        .trim();
                    setExtractedContent(cleanedHtml);
                }
            } catch (err) {
                console.error('Erro na conversão:', err);
                const detail = err instanceof Error ? err.message : String(err);
                setExtractedContent(
                    `<p class="text-red-500 font-medium">Erro ao converter o arquivo: ${detail}</p>`,
                );
            } finally {
                setIsLoadingText(false);
            }
        }

        processDocument();
    }, [templateFile]);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setTemplateFile(file);
            setData('template', file);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cadastro de Modelos" />

            <form
                onSubmit={handleSubmit}
                className="mx-auto grid max-w-[1600px] grid-cols-1 gap-6 p-6 lg:grid-cols-12"
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
                                            Siga os passos abaixo para
                                            automatizar o preenchimento dos seus
                                            documentos.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 pt-2">
                                        <div className="space-y-1 rounded-lg border bg-muted/60 p-3 font-mono text-xs sm:p-4">
                                            <span className="block text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                                                Exemplo de uso no texto
                                            </span>
                                            <p className="font-semibold break-all text-primary">
                                                Contratante:{' '}
                                                <span className="rounded bg-primary/10 px-1 py-0.5 text-primary">
                                                    &#123;&#123;nome_do_cliente&#125;&#125;
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
                                                    Adicione os campos dinâmicos
                                                    na lista ao lado definindo
                                                    nome e tipo.
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
                                                    Copie a chave gerada
                                                    automaticamente (ex:{' '}
                                                    <code className="font-mono text-primary">
                                                        &#123;&#123;slug&#125;&#125;
                                                    </code>
                                                    ).
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
                                                    Cole no painel de preview ou
                                                    direto no seu arquivo
                                                    Word/PDF antes de enviar.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="model_name">Nome do Modelo</Label>
                            <Input
                                id="model_name"
                                name="model_name"
                                placeholder="Ex: Contrato de Prestação de Serviços"
                                value={data.name}
                                onChange={(e) =>
                                    setData('name', e.target.value)
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
                                    <div className="flex items-center gap-2.5 overflow-hidden">
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
                                            setData('template', null);
                                            setExtractedContent('');
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
                            <h2 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                Campos Dinâmicos
                            </h2>
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                                {data.fields.length}{' '}
                                {data.fields.length === 1 ? 'campo' : 'campos'}
                            </span>
                        </div>

                        <div className="-mr-2 max-h-[420px] space-y-3 overflow-y-auto pr-2">
                            {data.fields.map((field, index) => (
                                <div
                                    key={field.id}
                                    className="group relative space-y-3 rounded-xl border bg-card/60 p-3.5 shadow-xs transition-colors hover:bg-card"
                                >
                                    <div className="flex items-center justify-between border-b border-border/40 pb-1">
                                        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                            Campo #{index + 1}
                                        </span>
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-6 w-6 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() =>
                                                removeField(field.id)
                                            }
                                            disabled={data.fields.length === 1}
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
                                            value={field.name}
                                            onChange={(e) =>
                                                updateFieldName(
                                                    field.id,
                                                    e.target.value,
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

                                            <div className="relative flex items-center">
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
                                                value={field.type}
                                                onValueChange={(val) =>
                                                    updateFieldType(
                                                        field.id,
                                                        val,
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
                                                        (option) => (
                                                            <SelectItem
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                            >
                                                                {option.label}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div>
                            <Button
                                type="button"
                                onClick={addField}
                                variant="outline"
                                className="h-9 w-full border-dashed text-xs font-medium tracking-wide uppercase"
                            >
                                <Plus className="mr-1.5 h-4 w-4" /> Adicionar
                                novo campo
                            </Button>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center gap-3 border-t pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            className="h-10 w-1/2 text-xs font-semibold tracking-wider text-muted-foreground uppercase hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        >
                            <X className="mr-1.5 h-4 w-4" /> Cancelar
                        </Button>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-10 w-1/2 bg-emerald-700 text-xs font-semibold tracking-wider text-white uppercase shadow-sm hover:bg-emerald-800"
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

                <div className="flex flex-col items-center lg:col-span-8">
                    <div className="mb-4 flex w-full max-w-[700px] items-center justify-between gap-4">
                        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Pré-visualização e Edição
                        </span>

                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Edit3 className="h-3 w-3" /> Clique na folha
                                para editar o texto
                            </span>
                        </div>
                    </div>

                    <div className="min-h-[850px] w-full max-w-[700px] rounded-sm border border-border/80 bg-white px-[48px] py-[42px] text-gray-900 shadow-lg">
                        {isLoadingText ? (
                            <div className="flex min-h-[700px] items-center justify-center">
                                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span className="text-sm">
                                        Processando documento...
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div
                                ref={editorRef}
                                contentEditable
                                suppressContentEditableWarning
                                className="document-editor min-h-[800px] w-full font-sans text-[13px] leading-[1.7] text-[#333] outline-none focus:outline-none"
                                dangerouslySetInnerHTML={{
                                    __html:
                                        extractedContent ||
                                        `<p>Digite ou cole o texto do seu modelo diretamente aqui...</p>`,
                                }}
                            />
                        )}
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
