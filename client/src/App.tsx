import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import NotFound from "@/pages/not-found";
import Login from "@/pages/auth/login";
import Dashboard from "@/pages/dashboard";
import BoxRegistrationWizard from "@/pages/box-registration/wizard";
import BoxShipping from "@/pages/box-shipping/page";
import MaterialsList from "@/pages/materials/list";
import OrdersList from "@/pages/orders/list";
import SearchOrders from "@/pages/search/page";
import ManagementAnalytics from "@/pages/management/analytics";
import UsersList from "@/pages/users/list";
import SettingsPage from "@/pages/settings/page";
import AuditLog from "@/pages/audit-log";
import ShippedReport from "@/pages/reports/shipped";
import MoveBoxes from "@/pages/move-boxes/page";
import { LayoutShell } from "@/components/layout-shell";

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <LayoutShell>
      <Component />
    </LayoutShell>
  );
}

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to="/" /> : <Login />}
      </Route>
      
      {/* Protected Routes */}
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      
      <Route path="/register-box">
        <ProtectedRoute component={BoxRegistrationWizard} />
      </Route>

      <Route path="/ship-box">
        <ProtectedRoute component={BoxShipping} />
      </Route>
      
      <Route path="/materials">
        <ProtectedRoute component={MaterialsList} />
      </Route>

      <Route path="/orders">
        <ProtectedRoute component={ManagementAnalytics} />
      </Route>

      <Route path="/orders-list">
        <ProtectedRoute component={OrdersList} />
      </Route>

      <Route path="/users">
        <ProtectedRoute component={UsersList} />
      </Route>

      <Route path="/settings">
        <ProtectedRoute component={SettingsPage} />
      </Route>

      <Route path="/history">
        <ProtectedRoute component={AuditLog} />
      </Route>

      <Route path="/reports/shipped">
        <ProtectedRoute component={ShippedReport} />
      </Route>

      <Route path="/search">
        <ProtectedRoute component={SearchOrders} />
      </Route>

      <Route path="/move-boxes">
        <ProtectedRoute component={MoveBoxes} />
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

import { LanguageProvider } from "@/hooks/use-language";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
