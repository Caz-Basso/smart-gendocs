import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import RoleForm from '@/components/role-form';
import AppLayout from '@/layouts/app-layout';
import { create, index, store } from '@/routes/roles';
import type { BreadcrumbItem } from '@/types';
import type { PermissionGroup } from '@/types/permissions';

type RoleCreateProps = {
    permissionGroups: PermissionGroup[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Roles',
        href: index(),
    },
    {
        title: 'Create',
        href: create(),
    },
];

export default function RoleCreate({ permissionGroups }: RoleCreateProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create role" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Heading
                    title="Create role"
                    description="Choose a name and the policy-generated permissions this role should receive."
                />
                <RoleForm
                    permissionGroups={permissionGroups}
                    submitLabel="Create role"
                    onSubmit={(form) => form.post(store.url())}
                />
            </div>
        </AppLayout>
    );
}
