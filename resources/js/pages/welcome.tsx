import { Head, Link, usePage } from '@inertiajs/react';

import { Download, LayoutTemplate, PenLine } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { dashboard, login, register } from '@/routes';

const steps = [
    {
        icon: LayoutTemplate,
        title: 'Cadastre o modelo',
        text: 'Envie um DOCX ou PDF e marque os campos dinâmicos com tags.',
    },
    {
        icon: PenLine,
        title: 'Preencha os dados',
        text: 'Escolha o modelo e preencha apenas as informações necessárias.',
    },
    {
        icon: Download,
        title: 'Salve e baixe',
        text: 'Gere o PDF, salve em Meus documentos e baixe o arquivo.',
    },
];

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Gerador de Documentos" />

            <div className="flex min-h-screen flex-col bg-background text-foreground">
                <header className="border-b border-border/60">
                    <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
                        <Link
                            href="/"
                            className="flex items-center"
                        >
                            <img
                                src="/smartsau-logo.png"
                                alt="SmartS@U"
                                className="h-9 w-auto object-contain"
                            />
                        </Link>

                        <nav className="flex items-center gap-2">
                            {auth.user ? (
                                <Button asChild size="sm">
                                    <Link href={dashboard()}>
                                        Ir para o painel
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button
                                        asChild
                                        variant="ghost"
                                        size="sm"
                                    >
                                        <Link href={login()}>
                                            Entrar
                                        </Link>
                                    </Button>

                                    {canRegister && (
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Link href={register()}>
                                                Cadastrar
                                            </Link>
                                        </Button>
                                    )}
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16">
                    <section className="mx-auto w-full max-w-3xl text-center">
                        <div className="mx-auto mb-5 flex h-14 items-center justify-center">
                            <img
                                src="/smartsau-logo.png"
                                alt="SmartS@U"
                                className="h-14 w-auto object-contain"
                            />
                        </div>

                        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                            Gere documentos a partir de modelos
                        </h1>

                        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                            Cadastre seus contratos e formulários uma vez,
                            preencha apenas os campos que mudam e gere o PDF
                            pronto para uso.
                        </p>

                        <div className="mt-7 flex items-center justify-center gap-3">
                            <Button asChild>
                                <Link
                                    href={
                                        auth.user ? dashboard() : login()
                                    }
                                >
                                    {auth.user
                                        ? 'Abrir gerador'
                                        : 'Entrar no sistema'}
                                </Link>
                            </Button>

                            {!auth.user && canRegister && (
                                <Button asChild variant="outline">
                                    <Link href={register()}>
                                        Criar uma conta
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </section>
                </main>
            </div>
        </>
    );
}