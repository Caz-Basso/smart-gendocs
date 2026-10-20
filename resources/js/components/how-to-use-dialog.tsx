import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

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

            <DialogContent className="max-h-[85vh] w-[92vw] overflow-y-auto rounded-xl p-4 sm:p-6 md:max-w-3xl">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-base font-bold sm:text-xl">
                        Como criar e utilizar modelos
                    </DialogTitle>

                    <DialogDescription className="text-xs text-muted-foreground sm:text-sm">
                        Siga os passos abaixo para automatizar o preenchimento
                        dos seus documentos.
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
                                Adicione os campos dinâmicos na lista ao lado
                                definindo nome e tipo.
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
                                Copie a chave gerada automaticamente (ex:{' '}
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
