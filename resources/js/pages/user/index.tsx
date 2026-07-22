import { Link, usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';

import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { impersonate, index } from '@/routes/users';
import type { BreadcrumbItem } from '@/types';
import { VenetianMask } from 'lucide-react';

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
                                        <th className="px-6 py-3 font-medium text-right">Actions</th>
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
                                                <td className="px-6 py-3 font-medium">{user.name}</td>
                                                <td className="px-6 py-3 text-muted-foreground">
                                                    {user.email}
                                                </td>
                                                <td className="px-6 py-3 text-muted-foreground">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    {user.id !== currentUserId &&
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
