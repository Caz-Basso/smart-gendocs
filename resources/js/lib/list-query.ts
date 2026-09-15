import { router } from '@inertiajs/react';

export const PER_PAGE_OPTIONS = [5, 10, 15, 25] as const;

export function listQueryParams(url: string): URLSearchParams {
    return new URLSearchParams(url.split('?')[1] ?? '');
}

/** Reloads the current list with the given query changes; `null` removes a key. */
export function visitListQuery(
    url: string,
    changes: Record<string, string | null>,
): void {
    const params = listQueryParams(url);

    for (const [key, value] of Object.entries(changes)) {
        if (value === null) {
            params.delete(key);
        } else {
            params.set(key, value);
        }
    }

    const query = params.toString();

    router.get(
        `${url.split('?')[0]}${query ? `?${query}` : ''}`,
        {},
        { preserveState: true, preserveScroll: true },
    );
}
