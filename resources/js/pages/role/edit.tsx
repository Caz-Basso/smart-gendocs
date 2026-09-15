import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import RoleForm from '@/components/role-form';
import AppLayout from '@/layouts/app-layout';
import { roleRouteId } from '@/lib/role-route-id';
import { edit, index, update } from '@/routes/roles';
import type { BreadcrumbItem } from '@/types';
import type { PermissionGroup, RoleRow } from '@/types/permissions';

type RoleEditProps = {
    role: RoleRow;
    permissionGroups: PermissionGroup[];
};

export default function RoleEdit({ role, permissionGroups }: RoleEditProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Roles',
            href: index(),
        },
        {
            title: role.name,
            href: edit(roleRouteId(role.id)),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${role.name}`} />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Heading
                    title={`Edit ${role.name}`}
                    description="Update the role name and the permissions generated from policies."
                />
                <RoleForm
                    permissionGroups={permissionGroups}
                    name={role.name}
                    permissions={role.permissions}
                    nameLocked={role.is_protected}
                    submitLabel="Save role"
                    onSubmit={(form) =>
                        form.put(update.url(roleRouteId(role.id)))
                    }
                />
            </div>
        </AppLayout>
    );
}
