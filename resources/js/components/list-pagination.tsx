import { usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PER_PAGE_OPTIONS, visitListQuery } from '@/lib/list-query';
import type { Paginated } from '@/types';

export function ListPagination({
    paginator,
}: {
    paginator: Paginated<unknown>;
}) {
    const { url } = usePage();
    const { current_page, last_page, per_page, total, from, to } = paginator;

    function goToPage(page: number): void {
        visitListQuery(url, { page: page === 1 ? null : String(page) });
    }

    return (
        <nav
            aria-label="Paginação"
            data-testid="list-pagination"
            className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
        >
            <div className="flex items-center gap-2">
                <span id="list-per-page-label">Itens por página</span>
                <Select
                    value={String(per_page)}
                    onValueChange={(value) =>
                        visitListQuery(url, { per_page: value, page: null })
                    }
                >
                    <SelectTrigger
                        aria-labelledby="list-per-page-label"
                        className="h-8 w-18"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {PER_PAGE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={String(option)}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center gap-3">
                <span className="tabular-nums">
                    {from ?? 0}–{to ?? 0} de {total}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8"
                        aria-label="Página anterior"
                        disabled={current_page <= 1}
                        onClick={() => goToPage(current_page - 1)}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <span className="px-2 tabular-nums">
                        {current_page} / {last_page}
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-8"
                        aria-label="Próxima página"
                        disabled={current_page >= last_page}
                        onClick={() => goToPage(current_page + 1)}
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                </div>
            </div>
        </nav>
    );
}
