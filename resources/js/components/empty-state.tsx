import type { ReactNode } from 'react';
import {
    OwlIllustration,
    type OwlVariant,
} from '@/components/owl-illustration';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    children?: ReactNode;
    className?: string;
    illustration?: OwlVariant;
};

export function EmptyState({
    title,
    description,
    actionLabel,
    onAction,
    children,
    className,
    illustration,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center',
                className,
            )}
            data-slot="empty-state"
        >
            {illustration ? (
                <OwlIllustration
                    variant={illustration}
                    className="h-28 text-muted-foreground/60"
                />
            ) : null}
            <div className="space-y-1">
                <h3 className="text-lg font-semibold">{title}</h3>
                {description ? (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                ) : null}
            </div>

            {children}

            {actionLabel ? (
                <Button type="button" variant="outline" onClick={onAction}>
                    {actionLabel}
                </Button>
            ) : null}
        </div>
    );
}
