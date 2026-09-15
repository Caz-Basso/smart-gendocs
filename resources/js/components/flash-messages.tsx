import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function FlashMessages() {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = event.detail.flash;

            if (flash.success) {
                toast.success(flash.success);
            }

            if (flash.error) {
                toast.error(flash.error);
            }
        });
    }, []);

    return null;
}
