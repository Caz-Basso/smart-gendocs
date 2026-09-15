import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export const LIST_PAGE_TOGGLE_SLOT_ID = 'list-page-toggle-slot';

type CollapsibleFiltersProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
    className?: string;
};

type CollapsibleFiltersToggleProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    className?: string;
    anchor?: 'top' | 'bottom';
};

export function CollapsibleFilters({
    open,
    onOpenChange,
    children,
    className,
}: CollapsibleFiltersProps) {
    return (
        <Collapsible open={open} onOpenChange={onOpenChange}>
            <CollapsibleContent
                className={cn(
                    'overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
                    className,
                )}
            >
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
}

export function CollapsibleFiltersToggle({
    open,
    onOpenChange,
    className,
    anchor = 'top',
}: CollapsibleFiltersToggleProps) {
    return (
        <button
            type="button"
            aria-expanded={open}
            data-testid="collapsible-filters-toggle"
            title={open ? 'Ocultar filtros' : 'Exibir filtros'}
            className={cn(
                'pointer-events-auto absolute left-1/2 z-20 flex h-6 w-6 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground',
                anchor === 'bottom'
                    ? 'bottom-0 translate-y-1/2'
                    : 'top-0 -translate-y-1/2',
                className,
            )}
            onClick={() => onOpenChange(!open)}
        >
            <ChevronDown
                className={cn(
                    'size-4 transition-transform',
                    open && 'rotate-180',
                )}
            />
            <span className="sr-only">
                {open ? 'Ocultar filtros' : 'Exibir filtros'}
            </span>
        </button>
    );
}
