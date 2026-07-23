import { cn } from '@/lib/utils';

type AppLogoIconProps = {
    className?: string;
    variant?: 'full' | 'mark';
};

export default function AppLogoIcon({
    className,
    variant = 'full',
}: AppLogoIconProps) {
    if (variant === 'mark') {
        return (
            <img
                src="/images/logo_header.png"
                alt="UNESC Virtual"
                className={cn('object-contain', className)}
            />
        );
    }

    return (
        <span className={cn('relative block', className)}>
            <img
                src="/images/logo-unesc-black.png"
                alt="UNESC Virtual"
                className="absolute inset-0 h-full w-full object-contain dark:hidden"
            />
            <img
                src="/images/logo-unesc-white.png"
                alt="UNESC Virtual"
                className="absolute inset-0 hidden h-full w-full object-contain dark:block"
            />
        </span>
    );
}
