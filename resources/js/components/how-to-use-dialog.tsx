import { HelpCircle } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

export default function HowToUseDialog() {
    return (
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

            <DialogContent className="w-[92vw] md:max-w-3xl p-4 sm:p-6 max-h-[85vh] overflow-y-auto rounded-xl">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-base sm:text-xl font-bold">
                        Como criar e utilizar modelos
                    </DialogTitle>

                    <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                        Siga os passos abaixo para automatizar o preenchimento
                        dos seus documentos.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <div className="rounded-lg bg-muted/60 p-3 sm:p-4 border font-mono text-xs space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider block">
                            Exemplo de uso no texto
                        </span>

                        <p className="font-semibold text-primary break-all">
                            Contratante:{" "}
                            <span className="bg-primary/10 px-1 py-0.5 rounded text-primary">
                                &#123;&#123;nome_do_cliente&#125;&#125;
                            </span>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg border bg-card space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    1
                                </span>

                                <h4 className="text-xs font-semibold">
                                    Crie os Campos
                                </h4>
                            </div>

                            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                                Adicione os campos dinâmicos na lista ao lado
                                definindo nome e tipo.
                            </p>
                        </div>

                        <div className="p-3 rounded-lg border bg-card space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    2
                                </span>

                                <h4 className="text-xs font-semibold">
                                    Copie a Tag
                                </h4>
                            </div>

                            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                                Copie a chave gerada automaticamente (ex:{" "}
                                <code className="text-primary font-mono">
                                    &#123;&#123;slug&#125;&#125;
                                </code>
                                ).
                            </p>
                        </div>

                        <div className="p-3 rounded-lg border bg-card space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    3
                                </span>

                                <h4 className="text-xs font-semibold">
                                    Insira no Texto
                                </h4>
                            </div>

                            <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed">
                                Cole no painel de preview ou direto no seu
                                arquivo Word/PDF antes de enviar.
                            </p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
