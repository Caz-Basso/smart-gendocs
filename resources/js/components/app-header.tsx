import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Menu } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { toNavGroups, type NavGroupWithItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { dashboard, model_registration } from '@/routes';
import type { BreadcrumbItem, NavItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

const navTriggerStyles =
    'inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';

const activeItemStyles =
    'text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100';

function isGroupActive(
    group: NavGroupWithItems,
    isCurrentUrl: (url: NonNullable<NavItem['href']>) => boolean,
): boolean {
    return group.items.some((item) => isCurrentUrl(item.href));
}

function HeaderNavGroup({
    group,
    isCurrentUrl,
    whenCurrentUrl,
}: {
    group: NavGroupWithItems;
    isCurrentUrl: (url: NonNullable<NavItem['href']>) => boolean;
    whenCurrentUrl: (
        url: NonNullable<NavItem['href']>,
        activeClass: string,
    ) => string;
}) {
    const groupActive = isGroupActive(group, isCurrentUrl);

    if (group.items.length === 1) {
        const item = group.items[0];

        return (
            <div className="relative flex h-full items-center">
                <Link
                    href={item.href}
                    prefetch
                    className={cn(
                        navTriggerStyles,
                        whenCurrentUrl(item.href, activeItemStyles),
                        'cursor-pointer',
                    )}
                >
                    {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                    {item.title}
                </Link>
                {isCurrentUrl(item.href) && (
                    <div className="absolute bottom-0 left-0 h-0.5 w-full translate-y-px bg-black dark:bg-white" />
                )}
            </div>
        );
    }

    return (
        <div className="relative flex h-full items-center">
            <DropdownMenu>
                <DropdownMenuTrigger
                    className={cn(
                        navTriggerStyles,
                        'cursor-pointer gap-1 data-[state=open]:bg-accent',
                        groupActive && activeItemStyles,
                    )}
                >
                    <group.icon className="mr-1 h-4 w-4" />
                    {group.label}
                    <ChevronDown className="size-3 opacity-70" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                    {group.items.map((item) => (
                        <DropdownMenuItem key={item.title} asChild>
                            <Link
                                href={item.href}
                                prefetch
                                className={cn(
                                    'flex w-full cursor-pointer items-center gap-2',
                                    whenCurrentUrl(item.href, activeItemStyles),
                                )}
                            >
                                {item.icon && (
                                    <item.icon className="h-4 w-4 shrink-0" />
                                )}
                                <span>{item.title}</span>
                            </Link>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            {groupActive && (
                <div className="absolute bottom-0 left-0 h-0.5 w-full translate-y-px bg-black dark:bg-white" />
            )}
        </div>
    );
}

export function AppHeader({ breadcrumbs = [] }: Props) {
    const page = usePage();
    const { auth, navigation } = page.props;
    const { isCurrentUrl, whenCurrentUrl } = useCurrentUrl();
    const getInitials = useInitials();
    const mainNavGroups = toNavGroups(navigation?.main ?? []);

    if (!auth.user) {
        return null;
    }

    const user = auth.user;

    return (
        <>
            <div className="relative z-50 border-b border-sidebar-border/80 bg-background">
                <div className="mx-auto flex h-16 w-full items-center px-4">
                    <div className="lg:hidden">
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mr-2 h-[34px] w-[34px]"
                                >
                                    <Menu className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="flex h-full w-64 flex-col items-stretch justify-between bg-sidebar"
                            >
                                <SheetTitle className="sr-only">
                                    Menu de navegação
                                </SheetTitle>
                                <SheetHeader className="flex justify-start text-left">
                                    <Link
                                        href={dashboard()}
                                        prefetch
                                        className="flex items-center space-x-2"
                                    >
                                        <AppLogo />
                                    </Link>
                                </SheetHeader>
                                <div className="flex h-full flex-1 flex-col space-y-4 overflow-y-auto p-4">
                                    <div className="flex h-full flex-col justify-between text-sm">
                                        <div className="flex flex-col space-y-6">
                                            {mainNavGroups.map((group) => (
                                                <div
                                                    key={group.label}
                                                    className="space-y-2"
                                                >
                                                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                        {group.label}
                                                    </p>
                                                    <div className="flex flex-col space-y-3">
                                                        {group.items.map(
                                                            (item) => (
                                                                <Link
                                                                    key={
                                                                        item.title
                                                                    }
                                                                    href={
                                                                        item.href
                                                                    }
                                                                    prefetch
                                                                    className="flex items-center space-x-2 font-medium"
                                                                >
                                                                    {item.icon && (
                                                                        <item.icon className="h-5 w-5" />
                                                                    )}
                                                                    <span>
                                                                        {
                                                                            item.title
                                                                        }
                                                                    </span>
                                                                </Link>
                                                            ),
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    <Link
                        href={dashboard()}
                        prefetch
                        className="flex items-center space-x-2"
                    >
                        <AppLogo />
                    </Link>

                    <nav
                        aria-label="Principal"
                        className="ml-6 hidden h-full items-center lg:flex"
                    >
                        <ul className="flex h-full flex-wrap items-center gap-1.5">
                            {mainNavGroups.map((group) => (
                                <li
                                    key={group.label}
                                    className="flex h-full items-center"
                                >
                                    <HeaderNavGroup
                                        group={group}
                                        isCurrentUrl={isCurrentUrl}
                                        whenCurrentUrl={whenCurrentUrl}
                                    />
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="ml-auto flex items-center space-x-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="size-10 rounded-full p-1"
                                >
                                    <Avatar className="size-8 overflow-hidden rounded-full">
                                        <AvatarImage
                                            src={user.avatar}
                                            alt={user.name}
                                        />
                                        <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                            {getInitials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end">
                                <UserMenuContent user={user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            {breadcrumbs.length > 1 && (
                <div className="flex w-full border-b border-sidebar-border/70">
                    <div className="mx-auto flex h-12 w-full items-center justify-start px-4 text-neutral-500 md:max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
