import { Head, Link, usePage } from '@inertiajs/react';
import { Pencil, Plus, Shield, Trash } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { SearchAndSelectListFilters } from '@/components/list-filters/search-and-select-list-filters';
import { ListPageShell } from '@/components/list-page-shell';
import { ListPagination } from '@/components/list-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppliedFilters } from '@/hooks/use-applied-filters';
import AppLayout from '@/layouts/app-layout';
import { create, destroy, edit, index } from '@/routes/roles';
import type { BreadcrumbItem, Paginated } from '@/types';
import type { RoleRow } from '@/types/permissions';

type RolesIndexProps = {
    roles: Paginated<RoleRow>;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Perfis',
        href: index(),
    },
];

export default function RolesIndex({ roles }: RolesIndexProps) {
    const { auth } = usePage().props;
    const { draft, setDraft, apply, clear, activeCount } = useAppliedFilters({
        search: '',
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Perfis" />
            <ListPageShell
                title="Perfis"
                description="Crie perfis a partir das permissões geradas pelas policies."
                activeFiltersCount={activeCount}
                actions={
                    auth.can.roles.create ? (
                        <Button asChild>
                            <Link href={create()}>
                                <Plus className="h-4 w-4" />
                                Novo perfil
                            </Link>
                        </Button>
                    ) : null
                }
                filters={
                    <SearchAndSelectListFilters
                        searchId="roles-search"
                        searchLabel="Buscar"
                        searchPlaceholder="Nome do perfil"
                        search={draft.search}
                        onSearchChange={(value) => setDraft('search', value)}
                        onApply={apply}
                        onClear={clear}
                    />
                }
            >
                {roles.total === 0 && activeCount === 0 ? (
                    <EmptyState
                        illustration="empty"
                        title="Nenhum perfil cadastrado"
                        description="Crie o primeiro perfil para começar a agrupar permissões."
                    />
                ) : roles.total === 0 ? (
                    <EmptyState
                        illustration="no-results"
                        title="Nenhum perfil encontrado"
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
                                                    Permissões
                                                </th>
                                                <th className="flex justify-end px-4 py-3 font-medium">
                                                    Ações
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {roles.data.map((role) => (
                                                <tr
                                                    key={role.id}
                                                    className="border-b last:border-0"
                                                >
                                                    <td className="px-4 py-3 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Shield className="h-4 w-4 text-muted-foreground" />
                                                            {role.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {role.permissions
                                                                .length ===
                                                            0 ? (
                                                                <span className="text-muted-foreground">
                                                                    Sem
                                                                    permissões
                                                                </span>
                                                            ) : (
                                                                role.permissions.map(
                                                                    (
                                                                        permission,
                                                                    ) => (
                                                                        <Badge
                                                                            key={
                                                                                permission
                                                                            }
                                                                            variant="secondary"
                                                                        >
                                                                            {
                                                                                permission
                                                                            }
                                                                        </Badge>
                                                                    ),
                                                                )
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="flex justify-end gap-2 px-4 py-3">
                                                        {auth.can.roles
                                                            .update && (
                                                            <Button
                                                                asChild
                                                                variant="outline"
                                                                size="sm"
                                                            >
                                                                <Link
                                                                    href={edit(
                                                                        role.id,
                                                                    )}
                                                                >
                                                                    <Pencil className="mr-2 h-4 w-4" />
                                                                    Editar
                                                                </Link>
                                                            </Button>
                                                        )}
                                                        {auth.can.roles
                                                            .delete &&
                                                            !role.is_protected && (
                                                                <Button
                                                                    asChild
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    <Link
                                                                        href={destroy(
                                                                            role.id,
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
                        <ListPagination paginator={roles} />
                    </>
                )}
            </ListPageShell>
        </AppLayout>
    );
}
