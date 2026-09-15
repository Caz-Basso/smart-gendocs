# Laravel Starter Kit (Inertia & React) — Project Phases

This document breaks the application into ordered, numbered phases that can be referenced individually by an implementation agent (e.g. "implement Phase 2.3"). Each task lists the **automated Pest tests** that must accompany it as acceptance criteria.

Copy this file to `docs/project-phases.md` before running [`ralph.sh`](../ralph.sh):

```bash
cp docs/project-phases.example.md docs/project-phases.md
```

> **Ralph:** [`ralph.sh`](../ralph.sh) splits the plan only on top-level headings `## Phase N — …`. Sub-phases (`### Phase N.M`) stay inside the same Ralph run — use them to organize work within one phase, as in [worthly-api](https://github.com/beerandcodeteam/worthly-api/blob/main/docs/project-phases.md).

Source documents:

- [`README.md`](../README.md) — stack, Sail, quality gates, hooks & PAO
- [`AGENTS.md`](../AGENTS.md) / [`CLAUDE.md`](../CLAUDE.md) — Laravel Boost guidelines (Actions, Sail, Pest, Wayfinder, Inertia React)
- [`.cursor/hooks.json`](../.cursor/hooks.json) — Agent must use `vendor/bin/sail` for PHP/Composer/Artisan

**Legend:** `[x]` already implemented in the current codebase · `[ ]` pending.

---

## Phase 1 — Foundation & Quality Baseline

Bring the starter kit baseline (Sail, Actions, Fortify, Inertia React, Pest) to a verified state before new product features.

### Phase 1.1 — Project configuration

- [x] **1.1.1** Laravel 13 + Sail + PostgreSQL bootstrapped (`composer.json`, `compose.yaml`, `.env` → `DB_CONNECTION=pgsql`).
- [x] **1.1.2** Inertia v3 + React 19 + Vite + Wayfinder (`resources/js/`, `@inertiajs/react`, `@laravel/vite-plugin-wayfinder`).
- [x] **1.1.3** Laravel Fortify for auth (session, 2FA, email verification) — see `config/fortify.php`, `app/Actions/Fortify/`.
- [x] **1.1.4** Quality toolchain: Pest 5, PHPStan (Larastan), Rector, Pint, OxLint, Oxfmt — `composer test` script.
- [x] **1.1.5** Laravel PAO for Agent-optimized JSON output (`laravel/pao` in `composer.json`).

**Feature tests:**

- `tests/Unit/ArchTest.php` — architecture constraints (already in suite).
- No new tests required unless you change config contracts.

### Phase 1.2 — User domain (verification)

- [x] **1.2.1** `User` model, factory, and migrations aligned with Fortify.
- [x] **1.2.2** User Actions: `CreateUser`, `UpdateUser`, `DeleteUser`, password & email notification actions under `app/Actions/`.
- [x] **1.2.3** Form Requests for validation (e.g. `UpdateUserRequest`) — no inline validation in controllers.

**Feature tests:**

- `tests/Unit/Models/UserTest.php` — model behavior.
- `tests/Unit/Actions/*User*` — action unit tests.
- `tests/Feature/Controllers/UserControllerTest.php` — CRUD + authorization.
- `tests/Feature/Controllers/UserProfileControllerTest.php` — profile updates.

### Phase 1.3 — Custom validation rules

- [x] **1.3.1** `App\Rules\ValidEmail` with explicit regex validation.
- [ ] **1.3.2** Extend edge-case coverage if product requires stricter RFC / IDN rules (only if scope changes).

**Feature tests:**

- `tests/Unit/Rules/ValidEmailTest.php`:
  - Accepts common valid addresses used in registration.
  - Rejects malformed local-part / domain.
  - Rejects non-string values with the expected message.
  - Any new edge cases from **1.3.2** get explicit examples.

### Phase 1.4 — Inertia shared data & middleware

- [x] **1.4.1** `HandleInertiaRequests` shares auth user, flash, appearance, etc.
- [x] **1.4.2** `HandleAppearance` for theme cookie / persistence.

**Feature tests:**

- `tests/Unit/Middleware/HandleInertiaRequestsTest.php`
- `tests/Unit/Middleware/HandleAppearanceTest.php`

---

## Phase 2 — Authentication & Session (Fortify + Inertia)

Web auth flows rendered as Inertia React pages under `resources/js/pages/`. All commands in tests and implementation use **`vendor/bin/sail`**.

### Phase 2.1 — Session login / logout

- [x] **2.1.1** `SessionController` + `resources/js/pages/session/create.tsx`.
- [x] **2.1.2** Feature tests for login success, validation errors, logout.

**Feature tests** — `tests/Feature/Controllers/SessionControllerTest.php`:

- Valid credentials authenticate and redirect to intended URL.
- Invalid credentials return validation/error without leaking which field failed unnecessarily.
- Logout clears session; protected routes return redirect to login.

### Phase 2.2 — Registration & password reset

- [x] **2.2.1** User registration flow (Fortify + Actions).
- [x] **2.2.2** Password reset notification + reset forms (Inertia pages).

**Feature tests:**

- `tests/Feature/Controllers/UserPasswordControllerTest.php`
- `tests/Feature/Controllers/UserEmailResetNotificationTest.php`
- `tests/Unit/Actions/CreateUserTest.php`, `CreateUserPasswordTest.php`, `CreateUserEmailResetNotificationTest.php`

### Phase 2.3 — Email verification

- [x] **2.3.1** Verification notification + signed verification URLs.
- [x] **2.3.2** Middleware enforcing verified email where required.

**Feature tests:**

- `tests/Feature/Controllers/UserEmailVerificationTest.php`
- `tests/Feature/Controllers/UserEmailVerificationNotificationControllerTest.php`
- `tests/Unit/Actions/CreateUserEmailVerificationNotificationTest.php`

### Phase 2.4 — Two-factor authentication

- [x] **2.4.1** 2FA setup, challenge, and recovery flows (Fortify).
- [x] **2.4.2** Inertia pages under `user-two-factor-authentication/` and challenge page.

**Feature tests** — `tests/Feature/Controllers/UserTwoFactorAuthenticationControllerTest.php`:

- Enabling 2FA requires confirmation step.
- Challenge page required when 2FA enabled.
- Recovery codes behavior matches Fortify configuration.

---

## Phase 3 — Example product feature (template)

> **Template only.** Replace this phase with your real domain (e.g. projects, tickets, billing). Keep the same structure: `###` sub-phases, numbered tasks, and **Feature tests** blocks.

Introduce a minimal **Post** resource (CRUD) using Actions, Form Requests, Inertia React pages, and Wayfinder — following existing User patterns.

### Phase 3.1 — Database & model

- [ ] **3.1.1** Migration `create_posts_table`: `id`, `user_id` FK, `title`, `body`, timestamps; index `(user_id, created_at)`.
- [ ] **3.1.2** `App\Models\Post` with `user()` BelongsTo, `casts()`, fillable/hidden per project conventions.
- [ ] **3.1.3** `PostFactory` and optional seeder for local dev.

**Feature tests:**

- `tests/Feature/Models/PostTest.php`:
  - Mass-assignment only for intended columns.
  - `user` relationship type and FK cascade on user delete (define policy in task).
  - Factory creates valid rows.

### Phase 3.2 — Actions & authorization

- [ ] **3.2.1** Actions: `CreatePost`, `UpdatePost`, `DeletePost` in `app/Actions/` (single `handle()` each).
- [ ] **3.2.2** `PostPolicy` — owner-only update/delete; register in `AppServiceProvider` or auto-discovery.

**Feature tests:**

- `tests/Unit/Actions/CreatePostTest.php` (and update/delete siblings).
- Policy covered via controller feature tests (below).

### Phase 3.3 — HTTP layer (Inertia)

- [ ] **3.3.1** `PostController` — `index`, `create`, `store`, `edit`, `update`, `destroy` using `Inertia::render()` and Actions.
- [ ] **3.3.2** Form Requests: `StorePostRequest`, `UpdatePostRequest`.
- [ ] **3.3.3** Routes in `routes/web.php` inside `auth` + `verified` middleware group.
- [ ] **3.3.4** React pages: `resources/js/pages/post/index.tsx`, `create.tsx`, `edit.tsx` — `useForm` + Wayfinder `store`/`update` from `@/actions/...`.
- [ ] **3.3.5** Run `vendor/bin/sail artisan wayfinder:generate` after route changes.

**Feature tests** — `tests/Feature/Controllers/PostControllerTest.php`:

- Guest cannot access any post route (`redirect` or `403` per app convention).
- Owner can CRUD own posts; cannot update/delete another user's post.
- Validation errors return Inertia-compatible session errors (422 / redirect back).
- List is scoped to authenticated user only.

### Phase 3.4 — Browser smoke (optional)

- [ ] **3.4.1** Pest browser test: visit post list, create post, assert flash / content.

**Browser tests:**

- `tests/Browser/PostTest.php` — `visit()` + `assertNoJavascriptErrors()` on happy path.

---

## Phase 4 — Hardening & Final Pass

- [ ] **4.1** Run `vendor/bin/sail bin pint --dirty --format agent` on touched PHP files.
- [ ] **4.2** Run `vendor/bin/sail artisan test --compact` for all tests touched in Phases 1–3.
- [ ] **4.3** Run full gate: `vendor/bin/sail composer test` (coverage, types, lint, browser per `composer.json`).
- [ ] **4.4** Verify Agent guidelines: Actions (not fat controllers), Sail prefix, no `env()` outside config, Wayfinder imports from `@/actions/` / `@/routes/`.

**Feature tests:** existing full suite must pass — no new files unless regressions are found.

---

## Phase Dependency Graph

```
Phase 1.1 ──┐
Phase 1.2 ──┼──► Phase 1.3 ──► Phase 1.4
            │
            └──► Phase 2 (Auth) ──► Phase 3 (your feature)
                                       │
Phase 4 ◄──────────────────────────────┘
```

- **Phase 1** verifies the starter kit before new features.
- **Phase 2** documents auth; already implemented — use for regression if you change Fortify/Inertia auth.
- **Phase 3** is a **template**; replace with your product phases (duplicate `###` / task / **Feature tests** pattern).
- **Phase 4** is the final hardening sweep after feature work.
