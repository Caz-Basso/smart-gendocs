import { useForm } from '@inertiajs/react';
import { Edit3, FileText, Loader2, Save, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCopyTag } from '@/hooks/use-copy-tag';
import { useTagDrop } from '@/hooks/use-tag-drop';
import { useTemplateFields } from '@/hooks/use-template-fields';
import { useTemplateLoader } from '@/hooks/use-template-loader';
import {
    pdfDocumentStructureToHtml,
    sanitizePdfDocumentStructure,
    type PdfDocumentStructure,
} from '@/lib/pdf-document';
import { cleanHtml } from '@/lib/template-utils';
import type {
    FieldItem,
    FieldTypeOption,
    ModelData,
    ModelFormData,
} from '@/types/model-template';
import { ConfirmDialog } from './confirm-dialog';
import { FieldsPanel } from './fields-panel';
import { HelpDialog } from './help-dialog';
import { HtmlEditor } from './html-editor';
import { PdfPagination, PdfPreview } from './pdf-preview';
import { RichDocumentEditor } from './rich-document-editor';
import { TemplateDropzone } from './template-dropzone';

interface ModelFormProps {
    mode: 'create' | 'edit';
    fieldTypeOptions: FieldTypeOption[];
    /** Obrigatório no modo `edit` */
    model?: ModelData;
    templateUrl?: string | null;
    templateIsPdf?: boolean;
}

const createDefaultField = (): FieldItem => ({
    id: crypto.randomUUID(),
    name: 'Nome do Cliente',
    slug: 'nome_do_cliente',
    type: 'text',
});

export function ModelForm({
    mode,
    fieldTypeOptions,
    model,
    templateUrl = null,
    templateIsPdf = false,
}: ModelFormProps) {
    const isEdit = mode === 'edit';
    const editorRef = useRef<HTMLDivElement>(null);

    const initialStructure = useMemo(
        () =>
            model?.document_structure
                ? sanitizePdfDocumentStructure(model.document_structure)
                : null,
        [model],
    );
    const initialHtml = model?.extracted_text ?? '';

    const [templateFile, setTemplateFile] = useState<File | null>(null);
    const [documentStructure, setDocumentStructure] =
        useState<PdfDocumentStructure | null>(initialStructure);
    const [htmlContent, setHtmlContent] = useState(initialHtml);
    const [docVersion, setDocVersion] = useState(0);
    const [pageImages, setPageImages] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [isCancelOpen, setIsCancelOpen] = useState(false);
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);

    const { data, setData, transform, post, put, processing, errors, isDirty } =
        useForm<ModelFormData>({
            name: model?.name ?? '',
            template: null,
            fields: model?.fields?.length
                ? model.fields
                : [createDefaultField()],
            extracted_text: initialHtml,
            document_structure: model?.document_structure ?? null,
        });

    const { loading, loaded } = useTemplateLoader(
        templateFile,
        isEdit && templateIsPdf ? templateUrl : null,
    );
    const { copiedSlug, copy } = useCopyTag();
    const fieldsApi = useTemplateFields(data.fields, (fields) =>
        setData('fields', fields),
    );

    // ---------- Sincroniza o resultado do loader com o estado do editor ----------
    useEffect(() => {
        if (!loaded) return;

        if (loaded.kind === 'error') {
            toast.error(loaded.message);

            return;
        }

        if (loaded.kind === 'rich_document') {
            setDocumentStructure(null);
            setPageImages([]);
            setHtmlContent(loaded.html);
            setDocVersion((version) => version + 1);
            setData((previous) => ({
                ...previous,
                extracted_text: loaded.html,
                document_structure: null,
            }));

            if (loaded.fieldsDetected && loaded.fieldsDetected.length > 0) {
                const existingSlugs = new Set(data.fields.map((f) => f.slug));
                const fieldsToAdd: FieldItem[] = [];

                for (const slug of loaded.fieldsDetected) {
                    if (!existingSlugs.has(slug)) {
                        const name = slug
                            .split('_')
                            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');
                        fieldsToAdd.push({
                            id: crypto.randomUUID(),
                            name,
                            slug,
                            type: 'text',
                        });
                        existingSlugs.add(slug);
                    }
                }

                if (fieldsToAdd.length > 0) {
                    setData('fields', [...data.fields, ...fieldsToAdd]);
                }
            }

            return;
        }

        if (loaded.kind === 'docx') {
            setDocumentStructure(null);
            setPageImages([]);
            setHtmlContent(loaded.html);
            setDocVersion((version) => version + 1);
            setData((previous) => ({
                ...previous,
                extracted_text: loaded.html,
                document_structure: null,
            }));

            return;
        }

        setPageImages(loaded.pageImages);
        setCurrentPage(0);

        // PDF original já salvo: mantém a estrutura editada do modelo
        if (loaded.source === 'file' || !initialStructure) {
            setDocumentStructure(loaded.structure);
            setData((previous) => ({
                ...previous,
                document_structure: loaded.structure,
                extracted_text: pdfDocumentStructureToHtml(loaded.structure),
            }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded]);

    // ---------- Edição de conteúdo ----------
    const updatePdfText = (elementIndex: number, text: string) => {
        if (!documentStructure) return;

        const updated = structuredClone(documentStructure);

        updated.pages[currentPage].elements[elementIndex].text = text;
        setDocumentStructure(updated);
        setData('document_structure', updated);
    };

    const handleInserted = (node: Text) => {
        const block = node.parentElement?.closest<HTMLElement>(
            '[data-element-index]',
        );
        const elementIndex = Number(block?.dataset.elementIndex);

        if (block && documentStructure && Number.isInteger(elementIndex)) {
            updatePdfText(elementIndex, block.textContent ?? '');

            return;
        }

        setData('extracted_text', editorRef.current?.innerHTML ?? '');
    };

    const { handleDragStart, handleDragOver, handleDrop } = useTagDrop(
        editorRef,
        handleInserted,
    );

    // ---------- Arquivo ----------
    const handleFileSelect = (file: File) => {
        setTemplateFile(file);
        setData('template', file);
    };

    const handleFileClear = () => {
        setTemplateFile(null);
        setPageImages([]);
        setCurrentPage(0);
        setDocumentStructure(initialStructure);
        setHtmlContent(initialHtml);
        setDocVersion((version) => version + 1);
        setData((previous) => ({
            ...previous,
            template: null,
            extracted_text: initialHtml,
            document_structure: model?.document_structure ?? null,
        }));
    };

    // ---------- Envio ----------
    const save = () => {
        setIsUpdateOpen(false);

        const html =
            data.extracted_text ||
            editorRef.current?.innerHTML ||
            htmlContent;

        transform((formData) => ({
            ...formData,
            extracted_text: html,
            document_structure: null,
        }));

        const options: Parameters<typeof post>[1] = {
            onSuccess: () =>
                toast.success(
                    isEdit
                        ? 'Modelo atualizado com sucesso!'
                        : 'Modelo salvo com sucesso!',
                ),
            onError: (formErrors) => {
                const firstError = Object.values(formErrors).find(Boolean);

                toast.error(
                    typeof firstError === 'string'
                        ? `Não foi possível salvar: ${firstError}`
                        : 'Não foi possível salvar. Confira os campos do formulário.',
                );
            },
            onHttpException: (response) => {
                toast.error(
                    `O servidor respondeu com erro HTTP ${response.status} ao salvar o modelo.`,
                );
            },
            onNetworkError: () => {
                toast.error(
                    'Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.',
                );
            },
        };

        if (isEdit && model) {
            put(`/modelos/${model.id}`, options);
        } else {
            post('/modelos', options);
        }
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (loading || processing) return;

        if (!data.name.trim()) {
            toast.error('Informe o nome do modelo para continuar.');

            return;
        }

        if (!isEdit && !data.template) {
            toast.error('Selecione um arquivo para o modelo.');

            return;
        }

        if (isEdit) {
            setIsUpdateOpen(true);
        } else {
            save();
        }
    };

    const handleCancel = () => {
        if (isDirty) {
            setIsCancelOpen(true);
        } else {
            window.history.back();
        }
    };

    // ---------- Render ----------
    const showEmpty = !isEdit && !templateFile && !htmlContent;
    const firstError = Object.values(errors).find(Boolean);

    return (
        <>
            <ConfirmDialog
                open={isCancelOpen}
                onOpenChange={setIsCancelOpen}
                title="Descartar alterações?"
                description="As alterações que você fez e ainda não salvou serão perdidas."
                cancelLabel="Continuar editando"
                confirmLabel="Descartar alterações"
                destructive
                onConfirm={() => window.history.back()}
            />

            <ConfirmDialog
                open={isUpdateOpen}
                onOpenChange={setIsUpdateOpen}
                title="Atualizar modelo?"
                description="Deseja salvar as alterações feitas neste modelo?"
                cancelLabel="Continuar editando"
                confirmLabel="Atualizar modelo"
                disabled={processing}
                onConfirm={save}
            />

            <form
                onSubmit={handleSubmit}
                className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-6 p-6 lg:grid-cols-12"
            >
                {/* ---------- Painel esquerdo ---------- */}
                <div className="flex flex-col justify-between space-y-5 rounded-xl border bg-card p-6 text-card-foreground shadow-sm lg:col-span-4">
                    <div className="space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-base font-semibold">
                                Configuração do Modelo
                            </h2>

                            <HelpDialog />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="model_name">Nome do Modelo</Label>

                            <Input
                                id="model_name"
                                name="model_name"
                                placeholder="Ex: Contrato de Prestação de Serviços"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />

                            {errors.name && (
                                <span className="text-xs text-destructive">
                                    {errors.name}
                                </span>
                            )}
                        </div>

                        <TemplateDropzone
                            file={templateFile}
                            onSelect={handleFileSelect}
                            onClear={handleFileClear}
                            error={errors.template}
                        />

                        <hr className="my-4 border-border" />

                        <FieldsPanel
                            fields={data.fields}
                            typeOptions={fieldTypeOptions}
                            copiedSlug={copiedSlug}
                            onAdd={fieldsApi.add}
                            onRename={fieldsApi.rename}
                            onTypeChange={fieldsApi.setType}
                            onRemove={fieldsApi.remove}
                            onCopy={copy}
                            onDragStart={handleDragStart}
                        />
                    </div>

                    <div className="mt-6 flex items-center gap-3 border-t pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            className="h-10 w-1/2 text-xs font-semibold tracking-wider text-muted-foreground uppercase hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                        >
                            <X className="mr-1.5 h-4 w-4" />
                            Cancelar
                        </Button>

                        <Button
                            type="submit"
                            disabled={processing || loading}
                            className="h-10 w-1/2 bg-emerald-700 text-xs font-semibold tracking-wider text-white uppercase shadow-sm hover:bg-emerald-800"
                        >
                            {processing ? (
                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-1.5 h-4 w-4" />
                            )}

                            {processing
                                ? 'Salvando...'
                                : isEdit
                                  ? 'Salvar Alterações'
                                  : 'Salvar Modelo'}
                        </Button>
                    </div>

                    {firstError && (
                        <p role="alert" className="text-sm text-destructive">
                            Não foi possível salvar: {firstError}
                        </p>
                    )}
                </div>

                {/* ---------- Pré-visualização e Edição Contínua ---------- */}
                <div className="flex min-w-0 flex-col items-center lg:col-span-8">
                    <div className="mb-4 flex w-full max-w-[980px] items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />

                            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Documento Oficial (Folha A4)
                            </span>
                        </div>

                        {!showEmpty && (
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Edit3 className="h-3 w-3" />
                                Arraste ou clique nas tags para inserir no texto
                            </span>
                        )}
                    </div>

                    <div className="relative mx-auto w-full max-w-[980px]">
                        {loading ? (
                            <div className="flex min-h-[841px] flex-col items-center justify-center gap-3 rounded-sm border bg-white text-muted-foreground shadow-sm">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span className="text-sm">
                                    Reconstruindo documento estruturado...
                                </span>
                            </div>
                        ) : showEmpty ? (
                            <div className="flex min-h-[841px] flex-col items-center justify-center rounded-sm border border-border/80 bg-white text-center text-muted-foreground shadow-sm">
                                <FileText className="mb-3 h-12 w-12 opacity-50" />

                                <p className="text-sm font-medium">
                                    Nenhum documento carregado
                                </p>

                                <p className="mt-1 max-w-xs text-xs">
                                    Faça upload de um PDF ou DOCX para
                                    visualizar e editar o documento livremente com reflow contínuo.
                                </p>
                            </div>
                        ) : (
                            <RichDocumentEditor
                                key={docVersion}
                                editorRef={editorRef}
                                html={htmlContent}
                                onChange={(html) =>
                                    setData('extracted_text', html)
                                }
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                            />
                        )}
                    </div>
                </div>
            </form>
        </>
    );
}
