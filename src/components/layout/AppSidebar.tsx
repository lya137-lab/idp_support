import { 
  Home, 
  FileText, 
  Plus, 
  Settings, 
  Users, 
  ClipboardList,
  Table,
  Download,
  LogOut,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const employeeNavItems = [
  { href: '/dashboard', label: '대시보드', icon: Home },
  { href: '/applications/new', label: '신규 신청', icon: Plus },
  { href: '/applications', label: '신청 내역', icon: FileText },
];

const adminNavItems = [
  { href: '/admin', label: '관리자 대시보드', icon: Home },
  { href: '/admin/approvals', label: '승인 관리', icon: ClipboardList },
  { href: '/admin/criteria', label: '지원 기준표', icon: Table },
  { href: '/admin/statistics', label: 'IDP 지원 통계', icon: BarChart3 },
  { href: '/admin/reports', label: '보고서 다운로드', icon: Download },
];

const systemAdminNavItems = [
  { href: '/system/users', label: '사용자 관리', icon: Users },
  { href: '/system/settings', label: '시스템 설정', icon: Settings },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isAdmin = user.role === 'admin' || user.role === 'system_admin';
  const isSystemAdmin = user.role === 'system_admin';

  const navItems = isAdmin ? adminNavItems : employeeNavItems;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo - OK금융그룹 */}
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border hover:bg-sidebar-accent/30 transition-colors">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">OK</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground">OK금융그룹</span>
            <span className="text-xs text-sidebar-foreground/60">자격증 지원 시스템</span>
          </div>
        </Link>

        {/* User Info */}
        <div className="px-4 py-4 border-b border-sidebar-border">
          <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <p className="text-sm font-bold text-sidebar-foreground">{user.name}</p>
            <p className="text-xs text-sidebar-foreground/60">{user.department}</p>
            <p className="text-xs text-sidebar-foreground/60">{user.employeeId}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {isSystemAdmin && (
            <>
              <Separator className="my-4 bg-sidebar-border" />
              <p className="px-3 py-2 text-xs font-bold uppercase text-sidebar-foreground/50">
                시스템 관리
              </p>
              {systemAdminNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}

          {/* 직원용: 관리자 전환 링크 (데모용) */}
          {user.role === 'employee' && (
            <>
              <Separator className="my-4 bg-sidebar-border" />
              <p className="px-3 py-1 text-xs text-sidebar-foreground/40">
                데모: 다른 계정으로 로그인하려면 로그아웃 후 재로그인
              </p>
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </Button>
        </div>
      </div>
    </aside>
  );
}
