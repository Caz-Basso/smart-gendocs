import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Check, ListChecks, Pencil, Trash, VenetianMask, X } from 'lucide-react';

import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { show } from '@/routes/audit';
import { destroy } from '@/routes/user';
import { impersonate, index, update } from '@/routes/users';
import type { BreadcrumbItem } from '@/types';

type UserRow = {
    id: string;
    name: string;
    email: string;
    created_at: string;
};

type UserPageProps = {
    users: UserRow[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Users',
        href: index(),
    },
];

export default function UsersIndex({ users }: UserPageProps) {
    const { auth } = usePage().props;
    const currentUserId = String(auth.user.id);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [saving, setSaving] = useState(false);

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
            <Head title="Users" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Heading title="Users" description="A list of all registered users." />
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="px-6 py-3 font-medium">Name</th>
                                        <th className="px-6 py-3 font-medium">Email</th>
                                        <th className="px-6 py-3 font-medium">Created at</th>
                                        <th className="flex justify-end px-6 py-3 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={4}
                                                className="px-6 py-8 text-center text-muted-foreground"
                                            >
                                                No users found.
                                            </td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="border-b last:border-0">
                                                <td className="px-6 py-3 font-medium">
                                                    {editingId === user.id ? (
                                                        <div className="flex items-center gap-2">
                                                            <Input
                                                                value={editingName}
                                                                onChange={(event) =>
                                                                    setEditingName(event.target.value)
                                                                }
                                                                onKeyDown={(event) => {
                                                                    if (event.key === 'Enter') {
                                                                        event.preventDefault();
                                                                        saveName(user);
                                                                    }

                                                                    if (event.key === 'Escape') {
                                                                        cancelEditing();
                                                                    }
                                                                }}
                                                                disabled={saving}
                                                                autoFocus
                                                                className="h-8 max-w-xs"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                disabled={saving}
                                                                onClick={() => saveName(user)}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                                <span className="sr-only">Save</span>
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                disabled={saving}
                                                                onClick={cancelEditing}
                                                            >
                                                                <X className="h-4 w-4" />
                                                                <span className="sr-only">Cancel</span>
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <span>{user.name}</span>
                                                            {auth.can.users.update && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => startEditing(user)}
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                    <span className="sr-only">Edit name</span>
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-muted-foreground">
                                                    {user.email}
                                                </td>
                                                <td className="px-6 py-3 text-muted-foreground">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="flex justify-end gap-2 px-6 py-3">
                                                    {user.id !== currentUserId &&
                                                        auth.can.users.impersonate &&
                                                        (auth.impersonating ? (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                disabled
                                                            >
                                                                <VenetianMask className="mr-2 h-4 w-4" />
                                                                Impersonate
                                                            </Button>
                                                        ) : (
                                                            <Button asChild variant="outline" size="sm">
                                                                <Link href={impersonate(user.id)} as="button">
                                                                    <VenetianMask className="mr-2 h-4 w-4" />
                                                                    Impersonate
                                                                </Link>
                                                            </Button>
                                                        ))}
                                                    {auth.can.users.viewAudits && (
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link href={show({ type: 'users', id: user.id })}>
                                                                <ListChecks className="mr-2 h-4 w-4" />
                                                                Audit
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    {auth.can.users.delete && (
                                                        <Button asChild variant="outline" size="sm">
                                                            <Link
                                                                href={destroy(user)}
                                                                as="button"
                                                                method="delete"
                                                            >
                                                                <Trash className="mr-2 h-4 w-4" />
                                                                Delete
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
