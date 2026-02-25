import { useAuth } from '@/contexts/AuthContext';
import { useNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/hooks/useData';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuClick: () => void;
}

export function Header({ title, subtitle, onMenuClick }: HeaderProps) {
  const { currentUser } = useAuth();
  const notifications = useNotifications(currentUser?.id);

  if (!currentUser) return null;

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-lg md:text-xl font-semibold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="w-64 pl-9"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications && notifications.filter(n => !n.isRead).length > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center">
                  {notifications.filter(n => !n.isRead).length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-4 py-2 border-b">
              <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
              {notifications && notifications.filter(n => !n.isRead).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary hover:bg-transparent"
                  onClick={() => markAllNotificationsAsRead(currentUser.id)}
                >
                  Mark all as read
                </Button>
              )}
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {!notifications || notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                notifications.map((notification: any) => (
                  <DropdownMenuItem
                    key={notification.id as string}
                    className={cn(
                      "flex flex-col items-start gap-1 py-3 px-4 cursor-pointer focus:bg-muted",
                      !notification.isRead && "bg-primary/5"
                    )}
                    onClick={() => markNotificationAsRead(notification.id as string, currentUser.id)}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className={cn("font-medium text-sm", !notification.isRead && "text-primary")}>
                        {notification.title as string}
                      </span>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.createdAt as string), { addSuffix: true })}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground leading-snug">
                      {notification.message as string}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
