import { Search } from 'lucide-react';
import {
    createContext,
    type FormEvent,
    type KeyboardEvent,
    type ReactNode,
    useContext,
} from 'react';
import { Button } from '@/components/ui/button';
import { SelectContent } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const ListFilterApplyContext = createContext<(() => void) | null>(null);

function isListFilterApplyShortcut(event: KeyboardEvent): boolean {
    return (
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === 'a'
    );
}

function applyListFilterShortcut(
    event: KeyboardEvent,
    onApply: () => void,
): void {
    if (!isListFilterApplyShortcut(event)) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    onApply();
}

type ListFilterFormProps = {
    children: ReactNode;
    onApply: () => void;
    className?: string;
};

export function ListFilterForm({
    children,
    onApply,
    className,
}: ListFilterFormProps) {
    function handleSubmit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        onApply();
    }

    function handleKeyDownCapture(event: KeyboardEvent<HTMLFormElement>): void {
        applyListFilterShortcut(event, onApply);
    }

    return (
        <ListFilterApplyContext.Provider value={onApply}>
            <form
                className={cn('flex flex-col gap-4', className)}
                data-testid="list-filter-form"
                onSubmit={handleSubmit}
                onKeyDownCapture={handleKeyDownCapture}
            >
                {children}
            </form>
        </ListFilterApplyContext.Provider>
    );
}

export function ListFilterSelectContent({
    onKeyDownCapture,
    ...props
}: React.ComponentProps<typeof SelectContent>): React.ReactElement {
    const onApply = useContext(ListFilterApplyContext);

    return (
        <SelectContent
            {...props}
            onKeyDownCapture={(event) => {
                if (onApply) {
                    applyListFilterShortcut(event, onApply);
                }

                onKeyDownCapture?.(event);
            }}
        />
    );
}

type ListFilterActionsProps = {
    onClear: () => void;
};

export function ListFilterActions({ onClear }: ListFilterActionsProps) {
    return (
        <div className="flex justify-end gap-2">
            <Button
                type="button"
                variant="ghost"
                data-testid="list-filters-clear"
                onClick={onClear}
            >
                Limpar
            </Button>
            <Button
                type="submit"
                variant="default"
                data-testid="list-filters-apply"
            >
                <Search className="size-4" />
                Buscar
            </Button>
        </div>
    );
}
