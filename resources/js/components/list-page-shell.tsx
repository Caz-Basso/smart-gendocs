import { Filter } from 'lucide-react';
import { type ReactNode, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    CollapsibleFilters,
    CollapsibleFiltersToggle,
    LIST_PAGE_TOGGLE_SLOT_ID,
} from '@/components/collapsible-filters';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ListPageShellProps = {
    title: string;
    description?: string;
    actions?: ReactNode;
    filters?: ReactNode;
    activeFiltersCount?: number;
    defaultFiltersOpen?: boolean;
    onFiltersOpenChange?: (open: boolean) => void;
    children: ReactNode;
    className?: string;
    variant?: 'full' | 'contained';
};

export function ListPageShell({
    title,
    description,
    actions,
    filters,
    activeFiltersCount = 0,
    defaultFiltersOpen = false,
    onFiltersOpenChange,
    children,
    className,
    variant = 'full',
}: ListPageShellProps) {
    const [filtersOpen, setFiltersOpen] = useState(defaultFiltersOpen);
    const [toggleSlot, setToggleSlot] = useState<HTMLElement | null>(null);
    const bandExpanded = Boolean(filters && filtersOpen);
    const portalToggle = variant === 'full' && Boolean(filters);

    useLayoutEffect(() => {
        if (!portalToggle) {
            setToggleSlot(null);

            return;
        }

        setToggleSlot(document.getElementById(LIST_PAGE_TOGGLE_SLOT_ID));
    }, [portalToggle]);

    const handleFiltersOpenChange = (open: boolean): void => {
        setFiltersOpen(open);
        onFiltersOpenChange?.(open);
    };

    const bandClassName = cn(
        'relative overflow-visible transition-colors duration-200',
        bandExpanded && 'border-b border-border',
        !filters && 'border-b border-border',
        variant === 'full' && 'left-1/2 w-screen max-w-none -translate-x-1/2',
        bandExpanded ? 'bg-muted/50' : 'bg-background',
        variant === 'contained' && 'rounded-lg border',
    );

    const toggleClassName = bandExpanded
        ? 'bg-muted/50 dark:bg-muted'
        : 'bg-background';

    const toggle = filters ? (
        <CollapsibleFiltersToggle
            open={filtersOpen}
            onOpenChange={handleFiltersOpenChange}
            className={toggleClassName}
            anchor={filtersOpen ? 'bottom' : 'top'}
        />
    ) : null;

    return (
        <div className={cn('flex flex-col', className)}>
            {portalToggle &&
                !filtersOpen &&
                toggleSlot &&
                toggle &&
                createPortal(toggle, toggleSlot)}
            <div className={bandClassName} data-testid="list-page-toolbar-band">
                {filters && !portalToggle && !filtersOpen && toggle}
                <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-3 px-4 py-4">
                    <div className="min-w-0 space-y-0.5">
                        <div className="flex min-w-0 items-center gap-2">
                            <h2 className="truncate text-xl font-semibold tracking-tight">
                                {title}
                            </h2>
                            {filters && activeFiltersCount > 0 && (
                                <span
                                    data-testid="list-page-active-filters"
                                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-foreground"
                                >
                                    <span
                                        aria-hidden
                                        className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"
                                    />
                                    {activeFiltersCount}{' '}
                                    {activeFiltersCount === 1
                                        ? 'filtro ativo'
                                        : 'filtros ativos'}
                                </span>
                            )}
                        </div>
                        {description && (
                            <p className="truncate text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                    {(actions || filters) && (
                        <div className="flex shrink-0 flex-wrap items-center gap-2 pb-0.5">
                            {filters && !filtersOpen && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    data-testid="list-page-filters-open"
                                    title="Abrir filtros"
                                    aria-label={
                                        activeFiltersCount > 0
                                            ? `Abrir filtros (${activeFiltersCount} ativos)`
                                            : 'Abrir filtros'
                                    }
                                    className="relative"
                                    onClick={() =>
                                        handleFiltersOpenChange(true)
                                    }
                                >
                                    <Filter className="size-4" />
                                    {activeFiltersCount > 0 && (
                                        <span
                                            aria-hidden
                                            data-testid="list-page-filters-count"
                                            className="absolute -top-1.5 -right-1.5 flex size-4.5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-semibold text-white tabular-nums ring-2 ring-background dark:bg-emerald-500"
                                        >
                                            {activeFiltersCount}
                                        </span>
                                    )}
                                </Button>
                            )}
                            {actions}
                        </div>
                    )}
                </div>

                {filters && (
                    <CollapsibleFilters
                        open={filtersOpen}
                        onOpenChange={handleFiltersOpenChange}
                    >
                        <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-4 [&_[data-slot=input]]:bg-background [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:bg-background">
                            {filters}
                        </div>
                    </CollapsibleFilters>
                )}
                {filters && filtersOpen && toggle}
            </div>

            <div className="flex flex-col gap-4 p-4">{children}</div>
        </div>
    );
}
