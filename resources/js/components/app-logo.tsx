import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';

type AppLogoProps = {
    className?: string;
};

export default function AppLogo({ className }: AppLogoProps) {
    return (
        <>
            <div
                className={cn(
                    'flex items-center group-data-[collapsible=icon]:hidden',
                    className ?? 'h-8 w-36',
                )}
            >
                <AppLogoIcon className="h-full w-full" />
            </div>
            <AppLogoIcon
                variant="mark"
                className="hidden size-8 group-data-[collapsible=icon]:block"
            />
        </>
    );
}
