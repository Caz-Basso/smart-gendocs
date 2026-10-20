import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Check,
    ListChecks,
    Pencil,
    Plus,
    Trash,
    VenetianMask,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { SearchAndSelectListFilters } from '@/components/list-filters/search-and-select-list-filters';
import { ListPageShell } from '@/components/list-page-shell';
import { ListPagination } from '@/components/list-pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAppliedFilters } from '@/hooks/use-applied-filters';
import AppLayout from '@/layouts/app-layout';
import { show } from '@/routes/audit';
import { destroy } from '@/routes/user';
import { create, impersonate, index, update } from '@/routes/users';
import type { BreadcrumbItem, Paginated } from '@/types';

type UserRow = {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
    created_at: string;
    roles: { id: number; name: string }[];
};

type UserPageProps = {
    users: Paginated<UserRow>;
    assignableRoles: { name: string; label: string }[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Usuários',
        href: index(),
    },
];

export default function UsersIndex({ users, assignableRoles }: UserPageProps) {
    const { auth } = usePage().props;
    const currentUserId = String(auth.user.id);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [editingEmail, setEditingEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const { draft, setDraft, apply, clear, activeCount } = useAppliedFilters({
        search: '',
    });

    function startEditing(user: UserRow): void {
        setEditingId(user.id);
        setEditingName(user.name);
        setEditingEmail(user.email);
    }

    function cancelEditing(): void {
        setEditingId(null);
        setEditingName('');
        setEditingEmail('');
    }

    function saveName(user: UserRow): void {
        const name = editingName.trim();
        const email = editingEmail.trim();

        if (name === '' || email === '' || (name === user.name && email === user.email)) {
            cancelEditing();

            return;
        }

        setSaving(true);

        router.patch(
            update.url(user),
            { name, email },
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
                actions={
                    auth.can.users.create && (
                        <Button asChild>
                            <Link href={create()}>
                                <Plus className="mr-2 h-4 w-4" />
                                Novo usuário
                            </Link>
                        </Button>
                    )
                }
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
                                                    Perfil
                                                </th>
                                                <th className="px-4 py-3 font-medium">
                                                    Status
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
                                                        {editingId === user.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    value={editingEmail}
                                                                    onChange={(event) =>
                                                                        setEditingEmail(
                                                                            event.target.value,
                                                                        )
                                                                    }
                                                                    disabled={saving}
                                                                    type="email"
                                                                    className="h-8 max-w-xs"
                                                                />
                                                            </div>
                                                        ) : user.email}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {auth.can.users.manageRoles &&
                                                        assignableRoles.length > 0 &&
                                                        (!user.roles.some(
                                                            (role) =>
                                                                role.name ===
                                                                'super-admin',
                                                        ) ||
                                                            auth.user.roles?.some(
                                                                (role) =>
                                                                    role.name ===
                                                                    'super-admin',
                                                            )) ? (
                                                            <Select
                                                                value={user.roles[0]?.name ?? 'user'}
                                                                onValueChange={(role) =>
                                                                    router.patch(
                                                                        update.url(
                                                                            user,
                                                                        ),
                                                                        { role },
                                                                        {
                                                                            preserveScroll: true,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="h-8 w-36">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {assignableRoles.map(
                                                                        (role) => (
                                                                        <SelectItem key={role.name} value={role.name}>{role.label}</SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <span className="capitalize text-muted-foreground">
                                                                {user.roles[0]?.name?.replace('-', ' ') ?? 'user'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={
                                                                user.is_active
                                                                    ? 'text-emerald-700 dark:text-emerald-400'
                                                                    : 'text-muted-foreground'
                                                            }
                                                        >
                                                            {user.is_active ? 'Ativo' : 'Inativo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground">
                                                        {new Date(
                                                            user.created_at,
                                                        ).toLocaleDateString()}
                                                    </td>
                                                    <td className="flex justify-end gap-2 px-4 py-3">
                                                        {auth.can.users.changeStatus &&
                                                            user.id !== currentUserId &&
                                                            (!user.roles.some((role) => role.name === 'super-admin') ||
                                                                auth.user.roles?.some((role) => role.name === 'super-admin')) && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    router.patch(
                                                                        update.url(user),
                                                                        { is_active: !user.is_active },
                                                                        { preserveScroll: true },
                                                                    )
                                                                }
                                                            >
                                                                {user.is_active ? 'Desativar' : 'Ativar'}
                                                            </Button>
                                                        )}
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
                                                                    Personificar
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
                                                                        Personificar
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
                                                        {auth.can.users.delete &&
                                                            (!user.roles.some(
                                                                (role) =>
                                                                    role.name ===
                                                                    'super-admin',
                                                            ) ||
                                                            auth.user.roles?.some(
                                                                (role) =>
                                                                    role.name ===
                                                                    'super-admin',
                                                            )) && (
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
