export type PermissionItem = {
    id: number;
    name: string;
    ability: string;
};

export type PermissionGroup = {
    resource: string;
    permissions: PermissionItem[];
};

export type RoleRow = {
    id: string | number;
    name: string;
    is_protected: boolean;
    permissions: string[];
};
