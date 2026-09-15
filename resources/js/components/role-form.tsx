import { useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { PermissionGroup } from '@/types/permissions';

type RoleFormProps = {
    permissionGroups: PermissionGroup[];
    name?: string;
    permissions?: string[];
    nameLocked?: boolean;
    submitLabel: string;
    onSubmit: (
        form: ReturnType<
            typeof useForm<{ name: string; permissions: string[] }>
        >,
    ) => void;
};

export default function RoleForm({
    permissionGroups,
    name = '',
    permissions = [],
    nameLocked = false,
    submitLabel,
    onSubmit,
}: RoleFormProps) {
    const form = useForm({
        name,
        permissions,
    });

    function togglePermission(permissionName: string, checked: boolean): void {
        form.setData(
            'permissions',
            checked
                ? [...form.data.permissions, permissionName]
                : form.data.permissions.filter(
                      (value) => value !== permissionName,
                  ),
        );
    }

    function toggleGroup(group: PermissionGroup, checked: boolean): void {
        const names = group.permissions.map((permission) => permission.name);

        form.setData(
            'permissions',
            checked
                ? [...new Set([...form.data.permissions, ...names])]
                : form.data.permissions.filter(
                      (value) => !names.includes(value),
                  ),
        );
    }

    return (
        <form
            className="flex flex-col gap-6"
            onSubmit={(event) => {
                event.preventDefault();
                onSubmit(form);
            }}
        >
            <div className="grid max-w-xl gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    value={form.data.name}
                    onChange={(event) =>
                        form.setData('name', event.target.value)
                    }
                    required
                    autoFocus={!nameLocked}
                    disabled={nameLocked}
                    placeholder="Editor"
                />
                <InputError message={form.errors.name} />
            </div>

            <div className="grid gap-4">
                <div>
                    <h3 className="text-sm font-medium">Permissions</h3>
                    <p className="text-sm text-muted-foreground">
                        Generated from application policies. Select the
                        abilities this role should have.
                    </p>
                    <InputError
                        message={form.errors.permissions}
                        className="mt-2"
                    />
                </div>

                {permissionGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No permissions found. Run `php artisan
                        permissions:sync-from-policies`.
                    </p>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {permissionGroups.map((group) => {
                            const selectedCount = group.permissions.filter(
                                (permission) =>
                                    form.data.permissions.includes(
                                        permission.name,
                                    ),
                            ).length;
                            const allSelected =
                                selectedCount === group.permissions.length;

                            return (
                                <Card key={group.resource}>
                                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                                        <CardTitle className="capitalize">
                                            {group.resource}
                                        </CardTitle>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                toggleGroup(group, !allSelected)
                                            }
                                        >
                                            {allSelected
                                                ? 'Clear'
                                                : 'Select all'}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="grid gap-3">
                                        {group.permissions.map((permission) => (
                                            <label
                                                key={permission.id}
                                                className="flex items-center gap-3 text-sm"
                                            >
                                                <Checkbox
                                                    checked={form.data.permissions.includes(
                                                        permission.name,
                                                    )}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        togglePermission(
                                                            permission.name,
                                                            checked === true,
                                                        )
                                                    }
                                                />
                                                <span className="font-medium">
                                                    {permission.ability}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {permission.name}
                                                </span>
                                            </label>
                                        ))}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <div>
                <Button type="submit" disabled={form.processing}>
                    {form.processing && <Spinner />}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
