import SmartSauWordmark from '@/components/smartsau-wordmark';
import type { AuthLayoutProps } from '@/types';

function SmartSauBrandCopy({
    headlineClassName,
}: {
    headlineClassName: string;
}) {
    return (
        <>
            <p className="text-sm font-medium tracking-wide text-[#0B5E3B] dark:text-emerald-300">
                Smart GenDocs · Geração de documentos
            </p>
            <p className={headlineClassName}>
                Tudo o que você precisa
                <br />
                em uma <span className="brand-highlight">única plataforma</span>
            </p>
        </>
    );
}

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="grid min-h-screen bg-background lg:grid-cols-2">
            <div className="relative flex min-h-screen items-center justify-center p-8 pt-44 lg:min-h-0 lg:p-10">
                <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-3 px-6 pt-8 text-center lg:hidden">
                    <SmartSauWordmark />
                    <SmartSauBrandCopy headlineClassName="font-display text-xl leading-relaxed font-bold text-foreground" />
                </div>
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                    <div className="flex flex-col items-start gap-2 text-left sm:items-center sm:text-center">
                        <h1 className="text-xl font-medium">{title}</h1>
                        <p className="text-sm text-balance text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    {children}
                </div>
            </div>
            <div className="branded-bg relative hidden overflow-hidden bg-top bg-no-repeat lg:m-5 lg:block lg:rounded-xl lg:border lg:border-border lg:bg-cover lg:bg-center">
                <div className="relative z-10 flex flex-col items-center gap-4 p-8 text-center lg:p-12">
                    <SmartSauWordmark headingClassName="lg:text-[2.5rem]" />
                    <SmartSauBrandCopy headlineClassName="font-display text-2xl leading-relaxed font-bold text-foreground lg:text-[1.875rem]" />
                </div>
                <picture>
                    <source
                        media="(prefers-reduced-motion: reduce)"
                        srcSet="/coruja-parada.webp"
                    />
                    <img
                        src="/coruja-animada.webp"
                        alt="Coruja Smart.SAU"
                        className="owl-intro pointer-events-none absolute"
                    />
                </picture>
            </div>
        </div>
    );
}
