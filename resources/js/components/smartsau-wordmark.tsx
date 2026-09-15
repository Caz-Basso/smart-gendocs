import { cn } from '@/lib/utils';

export default function SmartSauWordmark({
    className,
    headingClassName,
}: {
    className?: string;
    headingClassName?: string;
}) {
    return (
        <div className={cn('flex items-center gap-3', className)}>
            <img src="/smartsau-logo.png" alt="UNESC" className="size-9" />
            <h3
                className={cn(
                    'text-3xl font-bold tracking-tight',
                    headingClassName,
                )}
            >
                <span className="text-[2.125rem] font-normal text-black dark:text-white">
                    Smart
                </span>
                <span className="text-black dark:text-white">.</span>
                <span className="text-[1.875rem] font-medium text-[#0B5E3B] lg:text-[2.0625rem] dark:text-emerald-300">
                    SAU
                </span>
            </h3>
        </div>
    );
}
