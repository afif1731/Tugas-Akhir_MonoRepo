import { cn } from '@/lib/utils';
import type { SidebarCollapse, SidebarGroupItemProps, SidebarGroupProps } from '@/schemas/types';
import { useEffect, useRef } from 'react';
import { Button } from './button';
import { LogInIcon, LogOutIcon, MenuIcon } from 'lucide-react';
import { WebNameLogo } from '../logo/web-name';
import { Text } from '../helper/text';
import { Link, useLocation } from 'react-router';
import { sidebarItems } from '@/constants/sidebar-navigation';
import { userRoleMap, type IUser } from '@/schemas/models/user';
import { ProfilePicture } from '../helper/profile-picture';

import useDialogStore from '@/hooks/store/use-dialog';
import LogoutDialog from '../shared/logout-dialog';
import { useIdle } from '@/hooks/use-idle';

export function SidebarComponent({ user, isCollapsed, setIsCollapsed, isMobile }: SidebarCollapse) {
  const isIdle = useIdle(5000);

  const sidebarRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!isMobile) return;

    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsCollapsed(true);
      }
    }

    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isMobile, setIsCollapsed]);

  useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true);
    }
  }, [isMobile, setIsCollapsed]);

  return (
    <aside
      ref={sidebarRef}
      aria-label='sidebar-navigation'
      className={cn(
        'absolute z-50 flex flex-col h-svh border-teal-500 bg-teal-50',
        isCollapsed ? 'w-0 border-0' : 'w-64 border-r-2'
      )}
    >
      <div
        className={cn(
          'absolute -right-[39px] w-fit shrink-0 items-center',
          isCollapsed ? 'justify-center' : 'justify-end'
        )}
      >
        <SidebarCollapseButton
          user={user}
          isMobile={isMobile}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          isIdle={isIdle}
        />
      </div>
      <div className={cn('scroll-sidebar flex-1 overflow-y-auto overflow-x-hidden')}>
        <nav
          className={cn('space-y-2 py-2.5', isCollapsed ? '' : 'px-2.5')}
          aria-label='Main Navigation'
        >
          <section className='flex pt-1 items-center justify-start w-full border-b border-b-teal-500'>
            <WebNameLogo size='small' />
          </section>

          {sidebarItems.map((group) => (
            (!user || user.role === 'USER') && !group.userAllowed ? null : (
              <SidebarGroup
                key={group.title}
                user={user}
                group={group}
                isMobile={isMobile}
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
              />
            )
          ))}
        </nav>
      </div>
      <div
        className='px-2.5'
      >
        <SidebarAccount user={user} isCollapsed={isCollapsed} />
      </div>
      <LogoutDialog />
      <style>
        {`
          .scroll-sidebar::-webkit-scrollbar {
            width: 4px;
            height: 0;
          }
            .scroll-sidebar::-webkit-scrollbar-thumb {
              background-color: #f3f4f6;
              border-radius: 100px;
            }

          .scroll-sidebar {
              -ms-overflow-style: none;
          }
        `}
      </style>
    </aside>
  )
}

function SidebarGroup({ user, group, isMobile, isCollapsed, setIsCollapsed }: SidebarGroupProps) {
  return (
    !isCollapsed && (
      <section
        className="border-b pb-2 border-b-teal-500" aria-labelledby={`sidebar-group-${group.title}`}
      >
        <Text
          id={`sidebar-group-${group.title}`}
          type='c'
          lineHeight={4}
          weight='bold'
          className='text-red-500'
        >
          {group.title}
        </Text>

        <ul className='space-y-1'>
          {group.items.map((item) => (
            (!user || user.role === 'USER') && !item.userAllowed ? null : (
              <SidebarGroupItem
                key={item.href}
                item={item}
                isMobile={isMobile}
                setIsCollapsed={setIsCollapsed}
              />
            )
          ))}
        </ul>
      </section>
    )
  )
}

function SidebarGroupItem({
  item,
  isMobile,
  setIsCollapsed
}: SidebarGroupItemProps) {
  const { pathname } = useLocation();
  const isActive = isPathActive(pathname, item.href);

  const Icon = item.icon;
  return (
    <li>
      <Link
        to={item.href}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => (isMobile ? setIsCollapsed(true) : undefined)}
        className={cn(
          'flex items-center gap-1.5 rounded-xl transition-all px-3 py-2 font-bold hover:bg-teal-800/30',
          isActive ? 'bg-teal-800 text-teal-50 hover:bg-teal-800' : 'bg-none text-teal-800'
        )}
      >
        <Icon
          className='size-4 stroke-3'
          aria-hidden='true'
        />
        <Text type='btn'>{item.title}</Text>
      </Link>
    </li>
  )
}

function SidebarAccount({ user, isCollapsed}: {
  user?: IUser;
  isCollapsed: boolean;
}) {
  const { open: openDialog } = useDialogStore();

  return (
    !isCollapsed && (
      user ? (
        <div
          className='flex w-full items-center gap-2 py-3 border-t border-t-teal-500'
        >
          <ProfilePicture
            src={user.profile_picture}
            fallback={user.name.charAt(0)}
            className='size-8'
            iconSize='size-5'
          />

          <div
            className='flex flex-col w-full justify-center space-y-1'
          >
            <Text type='btn' weight='semibold' className='text-teal-800 line-clamp-1 leading-none'>{ user.name }</Text>
            <Text type='c' weight='medium' className='text-red-400 leading-none'>{ userRoleMap[user.role] }</Text>
          </div>

          <Button
            type='button'
            size='icon'
            color='default'
            onClick={() => openDialog('logout')}
            className='size-8'
          >
            <LogOutIcon className='text-teal-50' />
          </Button>
        </div>
      ) : (
        <Link
          to='/login'
          className='flex w-full items-center gap-2 py-3 border-t border-t-teal-500'
        >
          <Button
            type='button'
            size='default'
            color='default'
            className='w-full'
            leftIcon={<LogInIcon className="stroke-3" />}
          >
            Login
          </Button>
        </Link>
      )
    )
  )
}

function SidebarCollapseButton({ isCollapsed, setIsCollapsed, isMobile, isIdle }: SidebarCollapse) {
  return (
    <div>
      {
        !isMobile ? (
          <Button
            variant='secondary'
            size='sm'
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'rounded-bl-none rounded-tl-none border-2 border-teal-500 transition-all',
              isIdle && isCollapsed ? 'opacity-0' : 'opacity-100'
            )}
          >
            <MenuIcon size={16} />
          </Button>
        ) : (
          <Button
            variant='secondary'
            size='sm'
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <MenuIcon size={16} />
          </Button>
        )
      }
    </div>
  )
}

function isPathActive(current_path: string, item_path: string): boolean {
  if(current_path === item_path) return true;

  const currentSegments = current_path.split('/').filter(Boolean);
  const itemSegments = item_path.split('/').filter(Boolean);

  const isPrefix = itemSegments.every((seg, idx) => seg === currentSegments[idx]);
  if(!isPrefix) return false;

  return true;
}