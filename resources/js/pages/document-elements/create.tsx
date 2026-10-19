import { Head, Link, router } from "@inertiajs/react";
import { ArrowLeft, Check, Image as ImageIcon, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
    ElementPositionEditor,
    type ElementPositionValues,
} from "@/components/document-element/element-position-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import AppLayout from "@/layouts/app-layout";
import documentElements from "@/routes/document-elements";

const breadcrumbs = [
    { title: "Cabeçalhos e Rodapés", href: "/elementos" },
    { title: "Novo Elemento", href: "/elementos/cadastro" },
];

export default function DocumentElementCreate() {
    const [name, setName] = useState("");
    const [type, setType] = useState<"header" | "footer">("header");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [positions, setPositions] = useState<ElementPositionValues>({
        position_x: 0,
        position_y: 0,
        width: 210,
        height: 35,
    });

    // When changing type, update default position/size
    const handleTypeChange = (newType: "header" | "footer") => {
        setType(newType);
        if (newType === "header") {
            setPositions({
                position_x: 0,
                position_y: 0,
                width: 210,
                height: 35,
            });
        } else {
            setPositions({
                position_x: 0,
                position_y: 262,
                width: 210,
                height: 35,
            });
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/)) {
            toast.error("Por favor, selecione um arquivo de imagem válido (PNG, JPG ou WEBP).");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("A imagem selecionada ultrapassa o limite de 5MB.");
            return;
        }

        setImageFile(file);
        const preview = URL.createObjectURL(file);
        setImagePreviewUrl(preview);

        // Compute aspect ratio and suggest height if reasonable
        const img = new Image();
        img.onload = () => {
            const aspect = img.naturalWidth / img.naturalHeight;
            if (aspect > 0) {
                const suggestedHeight = Math.min(
                    80,
                    Math.max(10, Math.round((positions.width / aspect) * 10) / 10),
                );
                setPositions((prev) => ({
                    ...prev,
                    height: suggestedHeight,
                    position_y:
                        type === "footer"
                            ? Math.max(0, 297 - suggestedHeight)
                            : prev.position_y,
                }));
            }
        };
        img.src = preview;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error("Informe um nome para o elemento.");
            return;
        }

        if (!imageFile) {
            toast.error("Selecione um arquivo de imagem para o cabeçalho/rodapé.");
            return;
        }

        setIsSubmitting(true);
        setErrors({});

        const formData = new FormData();
        formData.append("name", name.trim());
        formData.append("type", type);
        formData.append("image", imageFile);
        formData.append("position_x", positions.position_x.toString());
        formData.append("position_y", positions.position_y.toString());
        formData.append("width", positions.width.toString());
        formData.append("height", positions.height.toString());
        formData.append("is_active", isActive ? "1" : "0");

        router.post(documentElements.store.url(), formData, {
            forceFormData: true,
            onSuccess: () => {
                toast.success("Elemento cadastrado com sucesso!");
            },
            onError: (errs) => {
                setErrors(errs);
                const firstError = Object.values(errs)[0];
                toast.error(firstError || "Erro ao salvar elemento.");
            },
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo Cabeçalho / Rodapé" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={documentElements.index()}>
                            <Button variant="ghost" size="icon" className="cursor-pointer">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                                Cadastrar Cabeçalho / Rodapé
                            </h1>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                Faça upload da imagem e ajuste o posicionamento milimétrico na folha A4.
                            </p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* General Information Card */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-semibold">
                                1. Informações Básicas
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Defina a identificação, o tipo e faça o upload da imagem do elemento.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Name Input */}
                                <div className="space-y-2">
                                    <Label htmlFor="element-name" className="text-sm font-medium">
                                        Nome do Elemento <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="element-name"
                                        placeholder="Ex: Cabeçalho Padrão UNESC 2026"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={errors.name ? "border-red-500" : ""}
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-red-500">{errors.name}</p>
                                    )}
                                </div>

                                {/* Element Type Radio */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Tipo do Elemento <span className="text-red-500">*</span>
                                    </Label>
                                    <RadioGroup
                                        value={type}
                                        onValueChange={(val) =>
                                            handleTypeChange(val as "header" | "footer")
                                        }
                                        className="flex gap-4 pt-1"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="header" id="type-header" />
                                            <Label htmlFor="type-header" className="cursor-pointer font-normal">
                                                Cabeçalho (Topo)
                                            </Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="footer" id="type-footer" />
                                            <Label htmlFor="type-footer" className="cursor-pointer font-normal">
                                                Rodapé (Base)
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>

                            {/* Image Upload Area */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Imagem do Elemento <span className="text-red-500">*</span>
                                </Label>
                                <div className="border-2 border-dashed rounded-xl p-5 text-center hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors bg-neutral-50/50 dark:bg-neutral-900/30">
                                    <input
                                        type="file"
                                        id="image-file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={handleImageChange}
                                        className="hidden"
                                    />
                                    <label
                                        htmlFor="image-file"
                                        className="cursor-pointer flex flex-col items-center justify-center gap-2"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                            <Upload className="w-5 h-5" />
                                        </div>
                                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                                            {imageFile ? imageFile.name : "Clique para selecionar uma imagem"}
                                        </span>
                                        <span className="text-xs text-neutral-500">
                                            Formatos suportados: PNG, JPG, WEBP (Máx. 5MB).
                                            Prefira imagens com fundo transparente.
                                        </span>
                                    </label>
                                </div>
                                {errors.image && (
                                    <p className="text-xs text-red-500">{errors.image}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Visual Positioning & Sizing Card */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-semibold">
                                2. Posicionamento e Dimensões na Folha A4
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Arraste ou redimensione o elemento diretamente sobre a folha virtual ou digite os valores exatos em milímetros.
                            </CardDescription>
                        </CardHeader>

                        <CardContent>
                            <ElementPositionEditor
                                imageUrl={imagePreviewUrl}
                                type={type}
                                values={positions}
                                onChange={setPositions}
                                showSampleContent={true}
                            />
                        </CardContent>
                    </Card>

                    {/* Actions bar */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Link href={documentElements.index()}>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isSubmitting}
                                className="cursor-pointer"
                            >
                                Cancelar
                            </Button>
                        </Link>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="gap-2 cursor-pointer"
                        >
                            <Check className="w-4 h-4" />
                            {isSubmitting ? "Salvando..." : "Salvar Elemento"}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}

