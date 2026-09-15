import { edit } from '@/routes/roles';

type RoleRouteId = Parameters<typeof edit>[0];

/**
 * Wayfinder types the role key as `number` when the schema is available
 * (local Sail) and as `string` when it is not (CI build). Accept both.
 */
export function roleRouteId(id: string | number): RoleRouteId {
    return id as RoleRouteId;
}
