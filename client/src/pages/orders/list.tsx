import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Search, Plus, ChevronDown, ChevronUp, Pencil, Camera, Box as BoxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompleteOrder, useCreateOrder, useUpdateOrder, useOrder, useUpdateBox, useShipBox } from "@/hooks/use-warehouse";
import React, { useState, Fragment } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl,FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";

function BoxImageGallery({ photos, title, icon: Icon }: { photos: string[], title: string, icon: any }) {
  const { t } = useLanguage();
  if (!photos || photos.length === 0) return null;
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 px-3 text-xs gap-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-semibold">{t("boxes.view_photos") || "Photos"}</span>
          <Badge variant="secondary" className="h-5 px-1.5 min-w-[20px] justify-center bg-primary/10 text-primary border-none">{photos.length}</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-white dark:bg-slate-900 border-2">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 max-h-[75vh] overflow-y-auto p-2">
          {photos.map((src, idx) => (
            <div key={idx} className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 shadow-inner group">
              <img src={src} alt={`Photo ${idx + 1}`} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                Photo {idx + 1}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditBoxDialog({ box }: { box: any }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const { mutate: updateBoxMutate, isPending } = useUpdateBox();

  const form = useForm({
    defaultValues: {
      numberInOrder: box.numberInOrder,
      quantity: box.quantity.toString(),
    }
  });

  const onSubmit = (data: any) => {
    updateBoxMutate({ 
      id: box.id, 
      data: { 
        numberInOrder: data.numberInOrder,
        quantity: parseInt(data.quantity) || 0
      } 
    }, {
      onSuccess: () => {
        setIsOpen(false);
        toast({ title: "Success", description: "Box updated" });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary transition-colors rounded-full">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-slate-900 border-2">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <BoxIcon className="w-5 h-5 text-primary" />
            {t("boxes.edit") || "Edit Box"} {box.numberInOrder}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="numberInOrder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-bold uppercase tracking-tight text-muted-foreground">{t("boxes.number")}</FormLabel>
                  <FormControl>
                    <Input {...field} className="h-14 text-xl font-bold bg-slate-50 border-2 focus:border-primary" />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-bold uppercase tracking-tight text-muted-foreground">{t("boxes.quantity")}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="h-14 text-xl font-bold bg-slate-50 border-2 focus:border-primary" />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <Button type="submit" disabled={isPending} className="h-14 w-full text-lg font-bold uppercase tracking-wider">
                {isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function OrderBoxesList({ orderId }: { orderId: number }) {
  const { t } = useLanguage();
  const { data: order, isLoading } = useOrder(orderId);

  const [selectedBoxes, setSelectedBoxes] = useState<Set<number>>(new Set());

  const toggleBoxSelection = (id: number) => {
    const next = new Set(selectedBoxes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedBoxes(next);
  };

  const shipSelectedBoxes = useShipBox();
  
  const handleBulkShip = () => {
    if (selectedBoxes.size === 0) return;
    if (confirm(`Ship ${selectedBoxes.size} selected boxes?`)) {
      Array.from(selectedBoxes).forEach(id => {
        shipSelectedBoxes.mutate(id);
      });
      setSelectedBoxes(new Set());
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!order?.boxes || order.boxes.length === 0) return <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-xl m-4 border-2 border-dashed">{t("orders.no_boxes") || "No boxes found"}</div>;

  const inStockBoxes = order.boxes.filter(b => b.status === "in_stock");

  return (
    <div className="p-6 bg-slate-50/80 dark:bg-slate-900/80 border-y-2 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-8 px-3 font-bold border-2">
            Selected: {selectedBoxes.size}
          </Badge>
          {selectedBoxes.size > 0 && (
            <Button 
              size="sm" 
              variant="default" 
              className="h-8 px-4 gap-2 bg-green-600 hover:bg-green-700 font-bold uppercase tracking-tight"
              onClick={handleBulkShip}
            >
              <CheckCircle2 className="w-4 h-4" />
              Ship Selected
            </Button>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary font-bold uppercase tracking-tight text-xs"
          onClick={() => {
            if (selectedBoxes.size === inStockBoxes.length) setSelectedBoxes(new Set());
            else setSelectedBoxes(new Set(inStockBoxes.map(b => b.id)));
          }}
        >
          {selectedBoxes.size === inStockBoxes.length ? "Deselect All" : "Select All In Stock"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {order.boxes.map((box) => (
          <Card 
            key={box.id} 
            className={cn(
              "overflow-hidden border-2 shadow-md hover:shadow-lg transition-all duration-300 group bg-white dark:bg-slate-900 cursor-pointer relative",
              selectedBoxes.has(box.id) ? "border-primary ring-2 ring-primary/20" : ""
            )}
            onClick={() => box.status === 'in_stock' && toggleBoxSelection(box.id)}
          >
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    selectedBoxes.has(box.id) ? "bg-primary text-white" : "bg-primary/10 text-primary"
                  )}>
                    <BoxIcon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-tighter text-slate-500">{t("boxes.number")}: <span className="text-slate-900 dark:text-white text-lg">{box.numberInOrder}</span></span>
                </div>
                <div className="flex items-center gap-1">
                  <EditBoxDialog box={box} />
                  <Badge variant={box.status === "in_stock" ? "default" : "secondary"} className={cn(
                    "h-6 px-2 font-black uppercase text-[10px] tracking-widest",
                    box.status === "in_stock" ? "bg-green-500 hover:bg-green-600" : ""
                  )}>
                    {box.status}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t("boxes.quantity")}</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black tabular-nums tracking-tighter">{box.quantity}</span>
                    <span className="text-sm font-bold text-muted-foreground uppercase">{t("boxes.qty_unit") || "pcs"}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Location</div>
                  <div className="text-sm font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border shadow-sm">
                    {box.locationType === 'permanent' ? 'Rack/Shelf' : 'Temporary'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed">
                {box.stickerPhoto && (
                  <BoxImageGallery photos={[box.stickerPhoto]} icon={Camera} title={`${t("boxes.sticker") || "Sticker"} - ${box.numberInOrder}`} />
                )}
                {box.productPhotos && box.productPhotos.length > 0 && (
                  <BoxImageGallery photos={box.productPhotos} icon={Camera} title={`${t("boxes.contents") || "Contents"} - ${box.numberInOrder}`} />
                )}
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
                <Fragment key={order.id}>
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
                        className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary transition-colors rounded-full"
                        onClick={() => handleEdit(order)}
                      >
                        <Pencil className="w-5 h-5" />
                      </Button>
                      {order.status === "active" && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-10 px-3 gap-1.5 border-green-200 hover:bg-green-50 hover:text-green-700 dark:border-green-900 dark:hover:bg-green-900/20"
                          onClick={() => {
                            if (confirm(t("orders.confirm_complete") || "Вы уверены, что хотите перевести этот заказ в статус 'Выполнен'?")) {
                              completeOrder.mutate(order.id);
                            }
                          }}
                          disabled={completeOrder.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="hidden sm:inline">{t("orders.complete") || "В выполненные"}</span>
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
                </Fragment>
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
