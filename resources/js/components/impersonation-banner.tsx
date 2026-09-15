import { Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { stop } from '@/routes/users/impersonate';

export default function ImpersonationBanner() {
    const { auth } = usePage().props;

    if (!auth.impersonating) {
        return null;
    }

    return (
        <div className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-amber-600/40 bg-amber-500 px-4 py-2 text-sm text-amber-950">
            <span>
                You are impersonating <strong>{auth.user.name}</strong>.
            </span>
            <Button asChild size="sm" variant="secondary">
                <Link href={stop()} as="button">
                    Stop impersonating
                </Link>
            </Button>
        </div>
    );
}
