import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Calendar,
  ClipboardList,
  Home,
  LogOut,
  Settings,
  Users,
  FileText,

  Clock,
  BarChart3,
  Shield,
} from 'lucide-react';

import { Link, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserRole } from '@/types/leave';

const employeeNavItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/request', icon: FileText, label: 'New Request' },
  { href: '/my-leaves', icon: ClipboardList, label: 'My Leaves' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
];

const managerNavItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/approvals', icon: Clock, label: 'Approvals' },
  { href: '/team', icon: Users, label: 'My Team' },
  { href: '/calendar', icon: Calendar, label: 'Team Calendar' },
];

const hrNavItems = [
  { href: '/', icon: Home, label: 'Dashboard' },
  { href: '/employees', icon: Users, label: 'Employees' },
  { href: '/leave-types', icon: Settings, label: 'Leave Types' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },

  { href: '/audit-log', icon: FileText, label: 'Audit Log' },
];

const adminNavItems = [
  ...hrNavItems,
  { href: '/admin', icon: Shield, label: 'Admin Panel' },
];



export function Sidebar() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();


  if (!currentUser) return null;

  const getNavItems = () => {
    switch (currentUser.role) {

      case 'ADMIN':
        return adminNavItems;
      case 'MANAGER':
        return managerNavItems;

      case 'HR':
        return hrNavItems;
      default:
        return employeeNavItems;
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden border border-sidebar-border bg-white p-1">
          <img src="/logo.jpeg" alt="Optimistic Media Group" className="h-full w-full object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold leading-none tracking-tight">Optimistic</span>
          <span className="text-[10px] font-medium text-sidebar-foreground/50">MEDIA GROUP</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'nav-item',
                isActive ? 'nav-item-active' : 'nav-item-inactive'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}

      </nav>

      {/* User Profile */}
      <div className="border-t border-sidebar-border p-4">

        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">{currentUser.name}</p>
            <p className="truncate text-xs text-sidebar-foreground/70">{currentUser.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
