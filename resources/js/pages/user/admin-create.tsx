import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import AppLayout from '@/layouts/app-layout';
import { index, store } from '@/routes/users';
import type { BreadcrumbItem } from '@/types';

type AdminCreateProps = {
    assignableRoles: { name: string; label: string }[];
    canManageRoles: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Usuários', href: index() },
    { title: 'Novo usuário', href: '/users/create' },
];

export default function AdminCreateUser({
    assignableRoles,
    canManageRoles,
}: AdminCreateProps) {
    const form = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'user',
    });

    function submit(event: FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        form.post(store.url());
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo usuário" />
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
                <Button asChild variant="ghost" className="w-fit">
                    <Link href={index()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar para usuários
                    </Link>
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle>Novo usuário</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={submit} className="grid gap-5">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    required
                                    autoFocus
                                />
                                <InputError message={form.errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) =>
                                        form.setData('email', event.target.value)
                                    }
                                    required
                                />
                                <InputError message={form.errors.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">Senha inicial</Label>
                                <PasswordInput
                                    id="password"
                                    value={form.data.password}
                                    onChange={(event) =>
                                        form.setData('password', event.target.value)
                                    }
                                    required
                                    autoComplete="new-password"
                                />
                                <InputError message={form.errors.password} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirmar senha
                                </Label>
                                <PasswordInput
                                    id="password_confirmation"
                                    value={form.data.password_confirmation}
                                    onChange={(event) =>
                                        form.setData(
                                            'password_confirmation',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    autoComplete="new-password"
                                />
                                <InputError message={form.errors.password_confirmation} />
                            </div>
                            {canManageRoles && (
                                <div className="grid gap-2">
                                    <Label>Perfil</Label>
                                    <Select
                                        value={form.data.role}
                                        onValueChange={(role) =>
                                            form.setData('role', role)
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {assignableRoles.map((role) => (
                                                <SelectItem
                                                    key={role.name}
                                                    value={role.name}
                                                >
                                                    {role.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={form.errors.role} />
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground">
                                O usuário receberá uma mensagem para confirmar o
                                email e poderá entrar após a confirmação.
                            </p>
                            <Button type="submit" disabled={form.processing}>
                                {form.processing && <Spinner />}
                                Criar usuário
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
