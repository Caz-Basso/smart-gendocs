<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

final class ListQuery
{
    /** @var list<int> */
    public const array PerPageOptions = [5, 10, 15, 25];

    public const int DefaultPerPage = 10;

    public static function perPage(Request $request): int
    {
        $perPage = $request->integer('per_page', self::DefaultPerPage);

        return in_array($perPage, self::PerPageOptions, true) ? $perPage : self::DefaultPerPage;
    }

    /**
     * Case-insensitive search across columns; a numeric term (optionally prefixed with "#") also matches the id column.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @param  list<string>  $columns
     */
    public static function search(Builder $query, string $term, array $columns, ?string $idColumn = 'id'): void
    {
        $term = mb_trim($term);

        if ($term === '') {
            return;
        }

        $query->where(function (Builder $builder) use ($term, $columns, $idColumn): void {
            $id = mb_ltrim($term, '#');

            if ($idColumn !== null && ctype_digit($id)) {
                $builder->orWhere($builder->qualifyColumn($idColumn), (int) $id);
            }

            foreach ($columns as $column) {
                $builder->orWhereLike($builder->qualifyColumn($column), "%{$term}%");
            }
        });
    }
}
