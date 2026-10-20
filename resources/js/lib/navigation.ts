import { Folder, FileText, UserRoundCog, Bookmark,  type LucideIcon } from "lucide-react";
import type { NavGroup, NavItem, SharedNavItem } from "@/types";

const iconMap: Record<string, LucideIcon> = {
    Folder,
    FileText,
    UserRoundCog,
    Bookmark,
};

export function toNavItem(item: SharedNavItem): NavItem {
    return {
        title: item.title,
        href: item.href,
        icon: iconMap[item.icon] ?? FileText,
    };
}

export function toNavItems(items: SharedNavItem[]): NavItem[] {
    return items.map(toNavItem);
}

export type NavGroupWithItems = {
    label: string;
    icon: LucideIcon;
    items: NavItem[];
};

export function toNavGroups(groups: NavGroup[]): NavGroupWithItems[] {
    return groups.map((group) => ({
        label: group.label,
        icon: iconMap[group.icon] ?? FileText,
        items: toNavItems(group.items),
    }));
}

export function flattenNavGroups(groups: NavGroupWithItems[]): NavItem[] {
    return groups.flatMap((group) => group.items);
}
