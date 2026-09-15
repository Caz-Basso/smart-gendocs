import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import { LIST_PAGE_TOGGLE_SLOT_ID } from '@/components/collapsible-filters';
import ImpersonationBanner from '@/components/impersonation-banner';
import type { AppLayoutProps } from '@/types';

export default function AppHeaderLayout({
    children,
    breadcrumbs,
}: AppLayoutProps) {
    return (
        <AppShell variant="header">
            <ImpersonationBanner />
            <AppHeader breadcrumbs={breadcrumbs} />
            <div
                id={LIST_PAGE_TOGGLE_SLOT_ID}
                data-testid="list-page-toggle-slot"
                className="pointer-events-none relative z-[60] h-0 w-full"
            />
            <AppContent variant="header">{children}</AppContent>
        </AppShell>
    );
}
