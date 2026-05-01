import type { IUser } from '../models';

export type SidebarCollapse = {
  user?: IUser;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  isIdle?: boolean;
};

export type SidebarGroupProps = {
  user?: IUser;
  group: {
    title: string;
    items: Array<{
      userAllowed?: boolean;
      title: string;
      href: string;
      icon: React.ElementType;
    }>;
  };
  isMobile: boolean;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
};

export type SidebarGroupItemProps = {
  item: {
    title: string;
    href: string;
    icon: React.ElementType;
  };
  isMobile: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
};
