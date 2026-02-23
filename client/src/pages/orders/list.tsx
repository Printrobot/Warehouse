import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Search, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompleteOrder, useCreateOrder, useUpdateOrder, useOrder } from "@/hooks/use-warehouse";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl,FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";

function OrderBoxesList({ orderId }: { orderId: number }) {
  const { t } = useLanguage();
  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!order?.boxes || order.boxes.length === 0) return <div className="text-center py-4 text-sm text-muted-foreground">{t("orders.no_boxes") || "No boxes found"}</div>;

  return (
    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-y">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {order.boxes.map((box) => (
          <Card key={box.id} className="overflow-hidden border shadow-sm">
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase text-muted-foreground">{t("boxes.number")}: {box.numberInOrder}</span>
                <Badge variant={box.status === "in_stock" ? "outline" : "secondary"} className="text-[10px] h-5">
                  {box.status}
                </Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold">{box.quantity}</span>
                <span className="text-xs text-muted-foreground">{t("boxes.qty_unit") || "pcs"}</span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate italic">
                {box.locationType === 'permanent' ? 'Rack/Shelf' : 'Temporary Location'}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function OrdersList() {
  const { t } = useLanguage();
  const { data: orders, isLoading } = useQuery({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    }
  });
  const updateOrder = useUpdateOrder();
  const completeOrder = useCompleteOrder();
  const createOrder = useCreateOrder();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    const next = new Set(expandedOrders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedOrders(next);
  };

  const [search, setSearch] = useState("");
  const filteredOrders = orders?.filter(o => 
    o.number.toLowerCase().includes(search.toLowerCase()) || 
    o.customer?.toLowerCase().includes(search.toLowerCase())
  );

  const form = useForm({
    resolver: zodResolver(insertOrderSchema),
    defaultValues: {
      number: "",
      customer: "",
      status: "active"
    }
  });

  const onSubmit = (data: any) => {
    if (editingOrder) {
      updateOrder.mutate({ id: editingOrder.id, data }, {
        onSuccess: () => {
          setIsCreateOpen(false);
          setEditingOrder(null);
          form.reset();
        }
      });
    } else {
      createOrder.mutate(data, {
        onSuccess: () => {
          setIsCreateOpen(false);
          form.reset();
          toast({ title: "Success", description: "Order created successfully" });
        }
      });
    }
  };

  const handleEdit = (order: any) => {
    setEditingOrder(order);
    form.reset({
      number: order.number,
      customer: order.customer || "",
      status: order.status
    });
    setIsCreateOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t("orders.title")}</h1>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingOrder(null);
            form.reset({ number: "", customer: "", status: "active" });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6 gap-2">
              <Plus className="w-5 h-5" /> {t("orders.new")}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle>{editingOrder ? t("orders.edit_title") || "Edit Order" : t("orders.create_title")}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("orders.number")}</FormLabel>
                      <FormControl>
                        <Input placeholder="ORD-XXXX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("orders.customer")}</FormLabel>
                      <FormControl>
                        <Input placeholder="Client Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createOrder.isPending || updateOrder.isPending} className="h-12 w-full sm:w-auto">
                    {(createOrder.isPending || updateOrder.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingOrder ? t("common.save") || "Save" : t("orders.new")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input 
          placeholder={t("orders.search_placeholder")} 
          className="pl-10 h-12 bg-white dark:bg-slate-900"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="overflow-hidden border-2 shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-900">
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>{t("orders.number")}</TableHead>
                <TableHead>{t("orders.customer")}</TableHead>
                <TableHead>{t("orders.status")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("orders.date")}</TableHead>
                <TableHead className="text-right">{t("orders.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders?.map((order) => (
                <React.Fragment key={order.id}>
                  <TableRow className="cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50" onClick={() => toggleExpand(order.id)}>
                    <TableCell>
                      {expandedOrders.has(order.id) ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-bold">{order.number}</TableCell>
                    <TableCell>{order.customer}</TableCell>
                    <TableCell>
                      <Badge variant={order.status === "active" ? "default" : "secondary"}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{new Date(order.createdAt!).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-10 w-10 p-0"
                        onClick={() => handleEdit(order)}
                      >
                        <Plus className="w-5 h-5 rotate-45" />
                      </Button>
                      {order.status === "active" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-10 px-3 gap-1.5 border-green-200 hover:bg-green-50 hover:text-green-700 dark:border-green-900 dark:hover:bg-green-900/20"
                          onClick={() => {
                            if (confirm(t("orders.confirm_complete") || "Are you sure you want to complete this order?")) {
                              completeOrder.mutate(order.id);
                            }
                          }}
                          disabled={completeOrder.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline">{t("orders.complete")}</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedOrders.has(order.id) && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0 border-b">
                        <OrderBoxesList orderId={order.id} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
              {filteredOrders?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {t("common.no_results") || "No results found"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
