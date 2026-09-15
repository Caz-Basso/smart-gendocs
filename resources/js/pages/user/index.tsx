import { Head, Link, router, usePage } from '@inertiajs/react';
import { Check, ListChecks, Pencil, Trash, VenetianMask, X } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { SearchAndSelectListFilters } from '@/components/list-filters/search-and-select-list-filters';
import { ListPageShell } from '@/components/list-page-shell';
import { ListPagination } from '@/components/list-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAppliedFilters } from '@/hooks/use-applied-filters';
import AppLayout from '@/layouts/app-layout';
import { show } from '@/routes/audit';
import { destroy } from '@/routes/user';
import { impersonate, index, update } from '@/routes/users';
import type { BreadcrumbItem, Paginated } from '@/types';

type UserRow = {
    id: string;
    name: string;
    email: string;
    created_at: string;
};

type UserPageProps = {
    users: Paginated<UserRow>;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Usuários',
        href: index(),
    },
];

export default function UsersIndex({ users }: UserPageProps) {
    const { auth } = usePage().props;
    const currentUserId = String(auth.user.id);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [saving, setSaving] = useState(false);
    const { draft, setDraft, apply, clear, activeCount } = useAppliedFilters({
        search: '',
    });

    function startEditing(user: UserRow): void {
        setEditingId(user.id);
        setEditingName(user.name);
    }

    function cancelEditing(): void {
        setEditingId(null);
        setEditingName('');
    }

    function saveName(user: UserRow): void {
        const name = editingName.trim();

        if (name === '' || name === user.name) {
            cancelEditing();

            return;
        }

        setSaving(true);

        router.patch(
            update.url(user),
            { name },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSaving(false);
                    cancelEditing();
                },
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuários" />
            <ListPageShell
                title="Usuários"
                description="Lista de todos os usuários cadastrados."
                activeFiltersCount={activeCount}
                filters={
                    <SearchAndSelectListFilters
                        searchId="users-search"
                        searchLabel="Buscar"
                        searchPlaceholder="Nome ou email"
                        search={draft.search}
                        onSearchChange={(value) => setDraft('search', value)}
                        onApply={apply}
                        onClear={clear}
                    />
                }
            >
                {users.total === 0 && activeCount === 0 ? (
                    <EmptyState
                        illustration="empty"
                        title="Nenhum usuário cadastrado"
                        description="Ainda não há usuários para exibir."
                    />
                ) : users.total === 0 ? (
                    <EmptyState
                        illustration="no-results"
                        title="Nenhum usuário encontrado"
                        description="Tente outro termo de busca."
                    />
                ) : (
                    <>
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                                                <th className="px-4 py-3 font-medium">
                                                    Nome
                                                </th>
                                                <th className="px-4 py-3 font-medium">
                                                    Email
                                                </th>
                                                <th className="px-4 py-3 font-medium">
                                                    Criado em
                                                </th>
                                                <th className="flex justify-end px-4 py-3 font-medium">
                                                    Ações
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.data.map((user) => (
                                                <tr
                                                    key={user.id}
                                                    className="border-b last:border-0"
                                                >
                                                    <td className="px-4 py-3 font-medium">
                                                        {editingId ===
                                                        user.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    value={
                                                                        editingName
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setEditingName(
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    onKeyDown={(
                                                                        event,
                                                                    ) => {
                                                                        if (
                                                                            event.key ===
                                                                            'Enter'
                                                                        ) {
                                                                            event.preventDefault();
                                                                            saveName(
                                                                                user,
                                                                            );
                                                                        }

                                                                        if (
                                                                            event.key ===
                                                                            'Escape'
                                                                        ) {
                                                                            cancelEditing();
                                                                        }
                                                                    }}
                                                                    disabled={
                                                                        saving
                                                                    }
                                                                    autoFocus
                                                                    className="h-8 max-w-xs"
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled={
                                                                        saving
                                                                    }
                                                                    onClick={() =>
                                                                        saveName(
                                                                            user,
                                                                        )
                                                                    }
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                    <span className="sr-only">
                                                                        Salvar
                                                                    </span>
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    disabled={
                                                                        saving
                                                                    }
                                                                    onClick={
                                                                        cancelEditing
                                                                    }
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                    <span className="sr-only">
                                                                        Cancelar
                                                                    </span>
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span>
                                                                    {user.name}
                                                                </span>
                                                                {auth.can.users
                                                                    .update && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() =>
                                                                            startEditing(
                                                                                user,
                                                                            )
                                                                        }
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                        <span className="sr-only">
                                                                            Editar
                                                                            nome
                                                                        </span>
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {user.email}
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {new Date(
                                                            user.created_at,
                                                        ).toLocaleDateString()}
                                                    </td>
                                                    <td className="flex justify-end gap-2 px-4 py-3">
                                                        {user.id !==
                                                            currentUserId &&
                                                            auth.can.users
                                                                .impersonate &&
                                                            (auth.impersonating ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    disabled
                                                                >
                                                                    <VenetianMask className="mr-2 h-4 w-4" />
                                                                    Impersonar
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    asChild
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    <Link
                                                                        href={impersonate(
                                                                            user.id,
                                                                        )}
                                                                        as="button"
                                                                    >
                                                                        <VenetianMask className="mr-2 h-4 w-4" />
                                                                        Impersonar
                                                                    </Link>
                                                                </Button>
                                                            ))}
                                                        {auth.can.users
                                                            .viewAudits && (
                                                            <Button
                                                                asChild
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                <Link
                                                                    href={show({
                                                                        type: 'users',
                                                                        id: user.id,
                                                                    })}
                                                                >
                                                                    <ListChecks className="mr-2 h-4 w-4" />
                                                                    Auditoria
                                                                </Link>
                                                            </Button>
                                                        )}
                                                        {auth.can.users
                                                            .delete && (
                                                            <Button
                                                                asChild
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                <Link
                                                                    href={destroy(
                                                                        user,
                                                                    )}
                                                                    as="button"
                                                                    method="delete"
                                                                >
                                                                    <Trash className="mr-2 h-4 w-4" />
                                                                    Excluir
                                                                </Link>
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                        <ListPagination paginator={users} />
                    </>
                )}
            </ListPageShell>
        </AppLayout>
    );
}
