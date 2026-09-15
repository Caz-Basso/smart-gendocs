<?php

declare(strict_types=1);

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;

it('renders users index page with the user list', function (): void {
    $authenticated = superAdmin();
    $other = User::factory()->create();

    $response = $this->actingAs($authenticated)
        ->get(route('users.index'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/index')
            ->has('users.data', 2)
            ->has('users.data.0', fn ($user) => $user
                ->has('id')
                ->has('name')
                ->has('email')
                ->has('created_at')
                ->etc()
            )
        );
});

it('filters users by search term', function (): void {
    $authenticated = superAdmin();
    User::factory()->create([
        'name' => 'Alice Example',
        'email' => 'alice@example.com',
    ]);
    User::factory()->create([
        'name' => 'Bob Other',
        'email' => 'bob@example.com',
    ]);

    $this->actingAs($authenticated)
        ->get(route('users.index', ['search' => 'Alice']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/index')
            ->has('users.data', 1)
            ->where('users.data.0.name', 'Alice Example')
        );
});

it('paginates users with per_page', function (): void {
    $authenticated = superAdmin();
    User::factory()->count(12)->create();

    $this->actingAs($authenticated)
        ->get(route('users.index', ['per_page' => 5]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('user/index')
            ->has('users.data', 5)
            ->where('users.per_page', 5)
        );
});

it('requires authentication to view users index page', function (): void {
    $response = $this->get(route('users.index'));

    $response->assertRedirectToRoute('login');
});

it('forbids users index without permission', function (): void {
    $response = $this->actingAs(User::factory()->create())
        ->get(route('users.index'));

    $response->assertForbidden();
});

it('renders registration page', function (): void {
    $response = $this->fromRoute('home')
        ->get(route('register'));

    $response->assertOk()
        ->assertInertia(fn ($page) => $page->component('user/create'));
});

it('may register a new user', function (): void {
    Event::fake([Registered::class]);

    $response = $this->fromRoute('register')
        ->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password1234',
            'password_confirmation' => 'password1234',
        ]);

    $response->assertRedirectToRoute('dashboard');

    $user = User::query()->where('email', 'test@example.com')->first();

    expect($user)->not->toBeNull()
        ->and($user->name)->toBe('Test User')
        ->and($user->email)->toBe('test@example.com')
        ->and(Hash::check('password1234', $user->password))->toBeTrue();

    $this->assertAuthenticatedAs($user);

    Event::assertDispatched(Registered::class);
});

it('requires name', function (): void {
    $response = $this->fromRoute('register')
        ->post(route('register.store'), [
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

    $response->assertRedirectToRoute('register')
        ->assertSessionHasErrors('name');
});

it('requires email', function (): void {
    $response = $this->fromRoute('register')
        ->post(route('register.store'), [
            'name' => 'Test User',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

    $response->assertRedirectToRoute('register')
        ->assertSessionHasErrors('email');
});

it('requires valid email', function (): void {
    $response = $this->fromRoute('register')
        ->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'not-an-email',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

    $response->assertRedirectToRoute('register')
        ->assertSessionHasErrors('email');
});

it('requires unique email', function (): void {
    User::factory()->create(['email' => 'test@example.com']);

    $response = $this->fromRoute('register')
        ->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

    $response->assertRedirectToRoute('register')
        ->assertSessionHasErrors('email');
});

it('requires password', function (): void {
    $response = $this->fromRoute('register')
        ->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response->assertRedirectToRoute('register')
        ->assertSessionHasErrors('password');
});

it('requires password confirmation', function (): void {
    $response = $this->fromRoute('register')
        ->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

    $response->assertRedirectToRoute('register')
        ->assertSessionHasErrors('password');
});

it('requires matching password confirmation', function (): void {
    $response = $this->fromRoute('register')
        ->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'different-password',
        ]);

    $response->assertRedirectToRoute('register')
        ->assertSessionHasErrors('password');
});

it('may delete user account', function (): void {
    $user = User::factory()->create([
        'password' => Hash::make('password'),
    ]);

    $response = $this->actingAs($user)
        ->fromRoute('user-profile.edit')
        ->delete(route('user.destroy', $user), [
            'password' => 'password',
        ]);

    $response->assertRedirectToRoute('home');

    expect($user->fresh())->toBeNull();

    $this->assertGuest();
});

it('requires password to delete account', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->fromRoute('user-profile.edit')
        ->delete(route('user.destroy', $user), []);

    $response->assertRedirectToRoute('user-profile.edit')
        ->assertSessionHasErrors('password');

    expect($user->fresh())->not->toBeNull();
});

it('requires correct password to delete account', function (): void {
    $user = User::factory()->create([
        'password' => Hash::make('password'),
    ]);

    $response = $this->actingAs($user)
        ->fromRoute('user-profile.edit')
        ->delete(route('user.destroy', $user), [
            'password' => 'wrong-password',
        ]);

    $response->assertRedirectToRoute('user-profile.edit')
        ->assertSessionHasErrors('password');

    expect($user->fresh())->not->toBeNull();
});

it('may delete another user without password', function (): void {
    $authenticated = userWithPermissions('user.delete');
    $target = User::factory()->create();

    $response = $this->actingAs($authenticated)
        ->fromRoute('users.index')
        ->delete(route('user.destroy', $target));

    $response->assertRedirectToRoute('users.index');

    expect($target->fresh())->toBeNull();
    expect($authenticated->fresh())->not->toBeNull();
});

it('may update a user name', function (): void {
    config(['audit.console' => true]);

    $authenticated = userWithPermissions('user.update');
    $target = User::factory()->create([
        'name' => 'Old Name',
    ]);

    $response = $this->actingAs($authenticated)
        ->fromRoute('users.index')
        ->patch(route('users.update', $target), [
            'name' => 'New Name',
        ]);

    $response->assertRedirectToRoute('users.index')
        ->assertInertiaFlash('success', 'User updated successfully');

    expect($target->fresh()->name)->toBe('New Name')
        ->and($target->audits()->where('event', 'updated')->count())->toBeGreaterThan(0);
});

it('requires a name when updating a user', function (): void {
    $authenticated = userWithPermissions('user.update');
    $target = User::factory()->create([
        'name' => 'Old Name',
    ]);

    $response = $this->actingAs($authenticated)
        ->fromRoute('users.index')
        ->patch(route('users.update', $target), [
            'name' => '',
        ]);

    $response->assertRedirectToRoute('users.index')
        ->assertSessionHasErrors('name');

    expect($target->fresh()->name)->toBe('Old Name');
});

it('requires authentication to update a user name', function (): void {
    $target = User::factory()->create([
        'name' => 'Old Name',
    ]);

    $response = $this->patch(route('users.update', $target), [
        'name' => 'New Name',
    ]);

    $response->assertRedirectToRoute('login');

    expect($target->fresh()->name)->toBe('Old Name');
});

it('redirects authenticated users away from registration', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->fromRoute('dashboard')
        ->get(route('register'));

    $response->assertRedirectToRoute('dashboard');
});
