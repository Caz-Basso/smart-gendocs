import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { listQueryParams, visitListQuery } from '@/lib/list-query';

/**
 * Filter state backed by the URL query string, so the server applies filters
 * across every page of a paginated list.
 */
export function useAppliedFilters<T extends Record<string, string>>(
    initialValues: T,
): {
    draft: T;
    setDraft: <K extends keyof T>(key: K, value: T[K]) => void;
    apply: () => void;
    clear: () => void;
    /** How many applied filters differ from their initial value. */
    activeCount: number;
} {
    const { url } = usePage();
    const params = listQueryParams(url);
    const applied = Object.fromEntries(
        Object.entries(initialValues).map(([key, value]) => [
            key,
            params.get(key) ?? value,
        ]),
    ) as T;

    const [draft, setDraftState] = useState<T>(applied);

    function setDraft<K extends keyof T>(key: K, value: T[K]): void {
        setDraftState((current) => ({ ...current, [key]: value }));
    }

    function visit(values: T): void {
        setDraftState(values);
        visitListQuery(url, {
            ...Object.fromEntries(
                Object.keys(initialValues).map((key) => {
                    const value = values[key].trim();

                    return [key, value === initialValues[key] ? null : value];
                }),
            ),
            page: null,
        });
    }

    return {
        draft,
        setDraft,
        apply: () => visit(draft),
        clear: () => visit(initialValues),
        activeCount: Object.keys(initialValues).filter(
            (key) => applied[key].trim() !== initialValues[key].trim(),
        ).length,
    };
}
