import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Box, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  Package, 
  Settings, 
  Truck, 
  Users,
  History 
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const isAdmin = user?.role === "admin";

  const navigation = [
    { name: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
    { name: t("nav.register_box"), href: "/register-box", icon: Package },
    { name: t("nav.ship_box"), href: "/ship-box", icon: Truck },
    { name: t("nav.materials"), href: "/materials", icon: Box },
    { name: t("nav.orders"), href: "/orders-list", icon: Package },
    ...(isAdmin ? [
      { name: t("nav.analytics"), href: "/orders", icon: LayoutDashboard },
      { name: t("nav.users"), href: "/users", icon: Users },
      { name: t("nav.reports"), href: "/reports/shipped", icon: History },
      { name: t("nav.settings"), href: "/settings", icon: Settings },
      { name: t("nav.history"), href: "/history", icon: History },
    ] : []),
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-tight">PrintLogix</h1>
            <p className="text-xs text-slate-400">Warehouse OS v1.0</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 translate-x-1"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
                onClick={() => setIsMobileOpen(false)}
              >
                <item.icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                <span className="font-medium">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
            {user?.name.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <Button 
          variant="destructive" 
          className="w-full justify-start gap-2" 
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-72 fixed inset-y-0 z-50">
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-80 border-r-slate-800 bg-slate-900">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 lg:ml-72 flex flex-col min-h-screen">
        <header className="h-16 border-b bg-background/80 backdrop-blur-md sticky top-0 z-30 flex items-center px-4 lg:px-8 justify-between lg:justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>
          <div className="text-sm text-muted-foreground hidden md:block">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
