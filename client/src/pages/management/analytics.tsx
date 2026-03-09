import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Package, Users, Truck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function ManagementAnalytics() {
  const { t } = useLanguage();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: [api.boxes.stats.path],
    queryFn: async () => {
      const res = await fetch(api.boxes.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const { data: orders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    }
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery<any[]>({
    queryKey: [api.audit.list.path],
    queryFn: async () => {
      const res = await fetch(api.audit.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    }
  });

  if (statsLoading || ordersLoading || auditLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Process data for charts
  const activeOrders = orders?.filter(o => o.status === 'active').length || 0;
  const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;

  const orderData = [
    { name: 'Активные', value: activeOrders },
    { name: 'Завершенные', value: completedOrders },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  // Process user activity from audit logs
  const userActivity: Record<string, number> = {};
  auditLogs?.forEach(log => {
    userActivity[log.userName] = (userActivity[log.userName] || 0) + 1;
  });

  const userActivityData = Object.entries(userActivity).map(([name, value]) => ({
    name,
    actions: value
  })).sort((a, b) => b.actions - a.actions).slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">📊 {t("dashboard.mgmt.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.mgmt.desc")}</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Всего на складе</p>
                <p className="text-3xl font-bold">{stats?.totalInStock || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-xl">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Отгружено сегодня</p>
                <p className="text-3xl font-bold">{stats?.shippedToday || 0}</p>
              </div>
              <div className="bg-emerald-100 p-3 rounded-xl">
                <Truck className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Активных заказов</p>
                <p className="text-3xl font-bold">{activeOrders}</p>
              </div>
              <div className="bg-amber-100 p-3 rounded-xl">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Завершенных</p>
                <p className="text-3xl font-bold">{completedOrders}</p>
              </div>
              <div className="bg-slate-100 p-3 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Distribution */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase tracking-tight">Статус заказов</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-4">
              {orderData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs font-bold uppercase">{entry.name}: {entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Activity */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold uppercase tracking-tight">Активность пользователей (Топ-5)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 'bold' }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="actions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-lg font-bold uppercase tracking-tight">Последние действия в системе</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditLogs?.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border">
                <div className="flex items-center gap-4">
                  <div className="bg-white dark:bg-slate-700 p-2 rounded-lg shadow-sm border">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm uppercase">{log.userName}</p>
                    <p className="text-xs text-muted-foreground tracking-tight">
                      {log.actionType} {log.entityType} #{log.entityId}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400">
                    {new Date(log.createdAt).toLocaleTimeString('ru-RU')}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                    {new Date(log.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
