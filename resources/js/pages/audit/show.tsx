import { Head } from '@inertiajs/react';
import Heading from '@/components/heading';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { show } from '@/routes/audit';
import type { BreadcrumbItem } from '@/types';

type AuditRow = {
    id: number | string;
    event: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    responsible: string | null;
    created_at: string | null;
};

type AuditShowProps = {
    type: string;
    id: string;
    audits: AuditRow[];
};

const eventLabels: Record<string, string> = {
    created: 'Criado',
    updated: 'Atualizado',
    deleted: 'Excluído',
};

export default function AuditShow({ type, id, audits }: AuditShowProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Auditoria',
            href: show({ type, id }),
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Auditoria" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <Heading
                    title="Histórico de alterações"
                    description={`Alterações registradas para ${type === 'users' ? 'o usuário' : type} ${id}.`}
                />
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                        <th className="px-6 py-3 font-medium">
                                            Ação
                                        </th>
                                        <th className="px-6 py-3 font-medium">
                                            Valores anteriores
                                        </th>
                                        <th className="px-6 py-3 font-medium">
                                            Valores atualizados
                                        </th>
                                        <th className="px-6 py-3 font-medium">
                                            Responsável
                                        </th>
                                        <th className="px-6 py-3 font-medium">
                                            Data e hora
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {audits.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-6 py-8 text-center text-muted-foreground"
                                            >
                                                Nenhuma alteração registrada.
                                            </td>
                                        </tr>
                                    ) : (
                                        audits.map((audit) => (
                                            <tr
                                                key={audit.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-6 py-3 font-medium">
                                                    {eventLabels[audit.event] ??
                                                        audit.event}
                                                </td>
                                                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                                                    {JSON.stringify(
                                                        audit.old_values,
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                                                    {JSON.stringify(
                                                        audit.new_values,
                                                    )}
                                                </td>
                                                <td className="px-6 py-3 text-muted-foreground">
                                                    {audit.responsible ??
                                                        'Não identificado'}
                                                </td>
                                                <td className="px-6 py-3 text-muted-foreground">
                                                    {audit.created_at
                                                        ? new Date(
                                                              audit.created_at,
                                                          ).toLocaleString('pt-BR')
                                                        : '?'}
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
