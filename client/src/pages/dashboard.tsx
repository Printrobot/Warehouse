import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Box, Package, Truck, Search, History } from "lucide-react";
import { motion } from "framer-motion";
import { useBoxStats } from "@/hooks/use-warehouse";
import { useLanguage } from "@/hooks/use-language";

function DashboardCard({ 
  title, 
  icon: Icon, 
  description, 
  href, 
  color 
}: { 
  title: string; 
  icon: any; 
  description: string; 
  href: string; 
  color: string 
}) {
  return (
    <Link href={href}>
      <motion.div 
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        className={`
          cursor-pointer h-full
          bg-white dark:bg-slate-900 rounded-2xl p-6 lg:p-8
          shadow-lg hover:shadow-xl transition-all duration-300
          border border-transparent hover:border-${color.split('-')[1]}-500/20
          relative overflow-hidden group
        `}
      >
        <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity`}>
          <Icon className="w-32 h-32" />
        </div>
        
        <div className={`w-14 h-14 rounded-xl ${color} flex items-center justify-center mb-6 shadow-md`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        
        <h3 className="text-2xl font-bold font-display mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </motion.div>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-6 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-none shadow-md">
      <div className="text-4xl font-bold font-display text-primary mb-1">{value}</div>
      <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">{label}</div>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: stats } = useBoxStats();
  const { t } = useLanguage();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          {t("dashboard.welcome")}, {user?.name.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("dashboard.select_task")}
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t("dashboard.stats.boxes")} value={stats?.totalInStock || 0} />
        <StatCard label={t("dashboard.stats.shipped")} value={stats?.shippedToday || 0} />
        <StatCard label={t("dashboard.stats.pending")} value={12} /> {/* Mock for now */}
        <StatCard label={t("dashboard.stats.urgent")} value={2} />   {/* Mock for now */}
      </div>

      {/* Action Grid */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <motion.div variants={item} className="md:col-span-2 lg:col-span-1">
          <DashboardCard
            title={t("dashboard.reg.title")}
            icon={Package}
            description={t("dashboard.reg.desc")}
            href="/register-box"
            color="bg-blue-600"
          />
        </motion.div>

        <motion.div variants={item}>
          <DashboardCard
            title={t("dashboard.issue.title")}
            icon={Box}
            description={t("dashboard.issue.desc")}
            href="/materials"
            color="bg-emerald-600"
          />
        </motion.div>

        <motion.div variants={item}>
          <DashboardCard
            title={t("dashboard.find.title")}
            icon={Search}
            description={t("dashboard.find.desc")}
            href="/search"
            color="bg-purple-600"
          />
        </motion.div>

        <motion.div variants={item}>
          <DashboardCard
            title={t("dashboard.ship.title")}
            icon={Truck}
            description={t("dashboard.ship.desc")}
            href="/ship-box"
            color="bg-red-600"
          />
        </motion.div>

        {user?.role === 'admin' && (
          <motion.div variants={item}>
            <DashboardCard
              title={t("dashboard.mgmt.title")}
              icon={Package}
              description={t("dashboard.mgmt.desc")}
              href="/orders"
              color="bg-slate-700"
            />
          </motion.div>
        )}

         <motion.div variants={item} className="md:col-span-2 lg:col-span-1">
          <DashboardCard
            title={t("dashboard.history.title")}
            icon={History}
            description={t("dashboard.history.desc")}
            href="/history"
            color="bg-orange-600"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
