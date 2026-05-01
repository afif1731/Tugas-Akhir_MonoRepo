import {
  ClapperboardIcon,
  HistoryIcon,
  LayoutGridIcon,
  type LucideIcon,
  Settings2Icon,
  SlidersVerticalIcon,
  TrendingUpIcon,
  TvMinimalIcon,
  UsersIcon,
} from 'lucide-react';

export interface sidebarItemDetail {
  icon?: LucideIcon;
  title: string;
  href: string;
  userAllowed?: boolean;
}

export interface sidebarItem {
  title: string;
  userAllowed?: boolean;
  items: sidebarItemDetail[];
}

export const sidebarItems = [
  {
    title: 'CCTV',
    userAllowed: true,
    items: [
      {
        icon: TvMinimalIcon,
        title: 'Panels',
        href: '/',
        userAllowed: true,
      },
      {
        icon: LayoutGridIcon,
        title: 'Layouts',
        href: '/layout',
      },
      {
        icon: Settings2Icon,
        title: 'Settings',
        href: '/setting',
      },
    ],
  },
  {
    title: 'Footage',
    userAllowed: false,
    items: [
      {
        icon: TrendingUpIcon,
        title: 'Statistics',
        href: '/footage-statistic',
      },
      {
        icon: ClapperboardIcon,
        title: 'Logs',
        href: '/footage-log',
      },
    ],
  },
  {
    title: 'Alarm',
    userAllowed: false,
    items: [
      {
        icon: SlidersVerticalIcon,
        title: 'Settings',
        href: '/alarm-setting',
      },
      {
        icon: HistoryIcon,
        title: 'History',
        href: '/alarm-history',
      },
    ],
  },
  {
    title: 'System',
    userAllowed: false,
    items: [
      {
        icon: SlidersVerticalIcon,
        title: 'Settings',
        href: '/system-setting',
      },
      {
        icon: UsersIcon,
        title: 'Manage Users',
        href: '/manage-user',
      },
    ],
  },
] satisfies sidebarItem[];
