import React, { useState } from "react";
import { useShippedReport } from "@/hooks/use-warehouse";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, FileDown } from "lucide-react";
import { format, subDays } from "date-fns";

export default function ShippedReport() {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    end: format(new Date(), "yyyy-MM-dd")
  });

  const { data: report, isLoading } = useShippedReport(dateRange.start, dateRange.end);

  const handleExport = () => {
    if (!report) return;
    const headers = ["Order", "Customer", "Box #", "Qty", "Shipped At"];
    const csvContent = [
      headers.join(","),
      ...report.map(r => [
        r.orderNumber || r.manualOrderNumber,
        r.customer || "",
        r.numberInOrder,
        r.quantity,
        r.shippedAt ? format(new Date(r.shippedAt), "yyyy-MM-dd HH:mm") : ""
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `shipped_report_${dateRange.start}_${dateRange.end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("reports.shipped_title") || "Shipping Report"}</h1>
          <p className="text-muted-foreground">{t("reports.shipped_desc") || "Analyze box shipments over a selected period."}</p>
        </div>
        <Button onClick={handleExport} disabled={!report?.length} className="h-12 px-6 gap-2">
          <FileDown className="w-5 h-5" /> {t("common.export") || "Export CSV"}
        </Button>
      </div>

      <Card className="border-2">
        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {t("reports.filter_dates") || "Filter by Date Range"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="space-y-2">
              <label className="text-sm font-semibold">{t("reports.start_date") || "Start Date"}</label>
              <Input 
                type="date" 
                className="h-12" 
                value={dateRange.start} 
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">{t("reports.end_date") || "End Date"}</label>
              <Input 
                type="date" 
                className="h-12" 
                value={dateRange.end} 
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-2 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow>
                <TableHead>{t("orders.number")}</TableHead>
                <TableHead>{t("orders.customer")}</TableHead>
                <TableHead>{t("boxes.number")}</TableHead>
                <TableHead>{t("boxes.quantity") || "Qty"}</TableHead>
                <TableHead>{t("ship.date") || "Shipped Date"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : report?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {t("common.no_results") || "No shipments found for this period."}
                  </TableCell>
                </TableRow>
              ) : (
                report?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-bold">{item.orderNumber || item.manualOrderNumber}</TableCell>
                    <TableCell>{item.customer || "-"}</TableCell>
                    <TableCell>{item.numberInOrder}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.shippedAt ? format(new Date(item.shippedAt), "dd.MM.yyyy HH:mm") : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
