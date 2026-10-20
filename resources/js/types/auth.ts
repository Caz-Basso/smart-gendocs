export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    roles?: { id: number; name: string }[];
    [key: string]: unknown;
};

export type Auth = {
    user: User;
    impersonating: boolean;
    can: {
        users: {
            viewAny: boolean;
            update: boolean;
            create: boolean;
            manageRoles: boolean;
            changeStatus: boolean;
            delete: boolean;
            impersonate: boolean;
            viewAudits: boolean;
        };
        roles: {
            viewAny: boolean;
            create: boolean;
            update: boolean;
            delete: boolean;
        };
    };
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
