import {
    ListFilterActions,
    ListFilterForm,
    ListFilterSelectContent,
} from '@/components/list-filter-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export type ListFilterOption = {
    value: string;
    label: string;
};

export type ListFilterSelectField = {
    id: string;
    label: string;
    placeholder?: string;
    value: string;
    options: ListFilterOption[];
    onChange: (value: string) => void;
};

type SearchAndSelectListFiltersProps = {
    searchId: string;
    searchLabel: string;
    searchPlaceholder: string;
    search: string;
    onSearchChange: (value: string) => void;
    selects?: ListFilterSelectField[];
    onApply: () => void;
    onClear: () => void;
};

export function SearchAndSelectListFilters({
    searchId,
    searchLabel,
    searchPlaceholder,
    search,
    onSearchChange,
    selects = [],
    onApply,
    onClear,
}: SearchAndSelectListFiltersProps) {
    return (
        <ListFilterForm onApply={onApply}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="grid gap-2">
                    <Label htmlFor={searchId}>{searchLabel}</Label>
                    <Input
                        id={searchId}
                        value={search}
                        placeholder={searchPlaceholder}
                        onChange={(event) => onSearchChange(event.target.value)}
                    />
                </div>
                {selects.map((select) => (
                    <div key={select.id} className="grid gap-2">
                        <Label htmlFor={select.id}>{select.label}</Label>
                        <Select
                            value={select.value}
                            onValueChange={select.onChange}
                        >
                            <SelectTrigger id={select.id}>
                                <SelectValue
                                    placeholder={select.placeholder ?? 'Todos'}
                                />
                            </SelectTrigger>
                            <ListFilterSelectContent>
                                {select.options.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </ListFilterSelectContent>
                        </Select>
                    </div>
                ))}
            </div>
            <ListFilterActions onClear={onClear} />
        </ListFilterForm>
    );
}
