import {
  ClapperboardIcon,
  HardDriveIcon,
  HistoryIcon,
  LayoutGridIcon,
  type LucideIcon,
  SlidersVerticalIcon,
  TrendingUpIcon,
  TvMinimalIcon,
  UsersIcon,
  VideoIcon,
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
        icon: HardDriveIcon,
        title: 'Device Settings',
        href: '/device-settings',
      },
      {
        icon: VideoIcon,
        title: 'CCTV Settings',
        href: '/cctv-settings',
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
        href: '/alarm-settings',
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
        href: '/system-settings',
      },
      {
        icon: UsersIcon,
        title: 'Manage Users',
        href: '/manage-user',
      },
    ],
  },
] satisfies sidebarItem[];
