import type { Auth } from '@/types/auth';
import type { Navigation } from '@/types/navigation';
import type { FlashToast } from '@/types/ui';

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        flashDataType: {
            toast?: FlashToast;
            success?: string;
            error?: string;
        };
        sharedPageProps: {
            name: string;
            auth: Auth;
            navigation: Navigation;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
