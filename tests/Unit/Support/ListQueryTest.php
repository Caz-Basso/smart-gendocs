<?php

declare(strict_types=1);

use App\Models\User;
use App\Support\ListQuery;
use Illuminate\Http\Request;

it('returns the default per page when the query is missing', function (): void {
    expect(ListQuery::perPage(Request::create('/users')))->toBe(10);
});

it('accepts a valid per page option', function (): void {
    expect(ListQuery::perPage(Request::create('/users', 'GET', ['per_page' => 5])))->toBe(5);
});

it('falls back to the default per page for invalid values', function (): void {
    expect(ListQuery::perPage(Request::create('/users', 'GET', ['per_page' => 99])))->toBe(10);
});

it('filters a query by search term', function (): void {
    User::factory()->create(['name' => 'Alice Example', 'email' => 'alice@example.com']);
    User::factory()->create(['name' => 'Bob Other', 'email' => 'bob@example.com']);

    $query = User::query()->select(['id', 'name', 'email']);
    ListQuery::search($query, 'Alice', ['name', 'email'], null);

    expect($query->pluck('name')->all())->toBe(['Alice Example']);
});
