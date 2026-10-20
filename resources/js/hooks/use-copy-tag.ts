import { useEffect, useRef, useState } from 'react';

export function useCopyTag() {
    const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );

    const copy = async (slug: string) => {
        try {
            await navigator.clipboard.writeText(`{{${slug}}}`);
            setCopiedSlug(slug);

            if (timer.current) clearTimeout(timer.current);

            timer.current = setTimeout(() => setCopiedSlug(null), 2000);
        } catch (error) {
            console.error('Erro ao copiar tag:', error);
        }
    };

    return { copiedSlug, copy };
}
