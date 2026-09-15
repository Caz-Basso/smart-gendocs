import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

const tabs: { value: Appearance; icon: typeof Sun; label: string }[] = [
    { value: 'light', icon: Sun, label: 'Claro' },
    { value: 'dark', icon: Moon, label: 'Escuro' },
    { value: 'system', icon: Monitor, label: 'Sistema' },
];

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    return (
        <div
            className={cn('flex w-full items-center gap-1', className)}
            role="group"
            aria-label="Aparência"
            {...props}
        >
            {tabs.map((tab) => {
                const isActive = tab.value === appearance;

                return (
                    <button
                        key={tab.value}
                        type="button"
                        title={tab.label}
                        aria-label={tab.label}
                        aria-pressed={isActive}
                        onClick={() => updateAppearance(tab.value)}
                        className={cn(
                            'flex h-7 flex-1 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                            isActive && 'bg-muted text-foreground',
                        )}
                    >
                        <tab.icon className="size-4" />
                    </button>
                );
            })}
        </div>
    );
}
