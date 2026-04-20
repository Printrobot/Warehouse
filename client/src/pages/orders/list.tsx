import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Search, Plus, ChevronDown, ChevronUp, Pencil, Camera, Box as BoxIcon, RotateCcw, AlertTriangle, Images, ListFilter, ArrowRightCircle, Users, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompleteOrder, useCreateOrder, useUpdateOrder, useOrder, useUpdateBox, useShipBox } from "@/hooks/use-warehouse";
import React, { useState, Fragment, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl,FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function BoxImageGallery({ photos, title, icon: Icon }: { photos: string[], title: string, icon: any }) {
  const { t } = useLanguage();
  if (!photos || photos.length === 0) return null;
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 px-3 text-xs gap-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all">
          <Icon className="w-4 h-4 text-primary" />
          <span className="font-semibold">{t("boxes.view_photos") || "Photos"}</span>
          <Badge variant="secondary" className="h-5 px-1.5 min-w-[20px] justify-center bg-primary/10 text-primary border-none font-bold">{photos.length}</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 shadow-2xl glass-effect">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl flex items-center gap-3 font-black uppercase tracking-tight">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 max-h-[75vh] overflow-y-auto p-2">
          {photos.map((src, idx) => (
            <div key={idx} className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 shadow-inner group">
              <img src={src} alt={`Фото ${idx + 1}`} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                Фото {idx + 1}
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
        toast({ title: "Сохранено", description: "Коробка обновлена" });
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
      <DialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 shadow-2xl glass-effect sm:max-w-md">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl flex items-center gap-3 font-black uppercase tracking-tight">
            <div className="bg-primary/10 p-2 rounded-xl">
              <BoxIcon className="w-5 h-5 text-primary" />
            </div>
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
    if (confirm(`Отгрузить ${selectedBoxes.size} выбранных коробок?`)) {
      Array.from(selectedBoxes).forEach(id => {
        shipSelectedBoxes.mutate(id);
      });
      setSelectedBoxes(new Set());
    }
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!order?.boxes || order.boxes.length === 0) return <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-xl m-4 border-2 border-dashed">{t("orders.no_boxes") || "No boxes found"}</div>;

  const inStockBoxes = order.boxes.filter(b => b.status === "in_stock");
  const hasProblemBoxes = order.boxes.some(b => b.problemType);

  return (
    <div className="p-6 bg-slate-50/40 dark:bg-slate-900/40 border-y shadow-inner backdrop-blur-sm">
      {hasProblemBoxes && (
        <div className="mx-2 mb-6 p-4 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl flex items-center gap-4 text-amber-900 dark:text-amber-200 animate-pulse shadow-sm">
          <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-full">
            <AlertTriangle className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-sm font-bold uppercase tracking-tight">Внимание: В этом заказе есть коробки с проблемами!</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 px-2 gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="h-10 px-4 font-black border-2 bg-white dark:bg-slate-900 shadow-sm text-sm">
            Выбрано: {selectedBoxes.size}
          </Badge>
          {selectedBoxes.size > 0 && (
            <Button 
              size="sm" 
              variant="default" 
              className="h-10 px-6 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 font-bold uppercase tracking-wider shadow-lg shadow-green-500/20 border-none transition-all active:scale-95"
              onClick={handleBulkShip}
            >
              <CheckCircle2 className="w-4 h-4" />
              Отгрузить выбранные
            </Button>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary hover:text-primary hover:bg-primary/10 font-bold uppercase tracking-wider text-[11px] h-10 px-4 rounded-xl transition-colors"
          onClick={() => {
            if (selectedBoxes.size === inStockBoxes.length) setSelectedBoxes(new Set());
            else setSelectedBoxes(new Set(inStockBoxes.map(b => b.id)));
          }}
        >
          {selectedBoxes.size === inStockBoxes.length ? "Снять выбор" : "Выбрать все на складе"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {order.boxes.map((box) => (
          <Card 
            key={box.id} 
            className={cn(
              "overflow-hidden border-2 shadow-sm hover:shadow-xl transition-all duration-500 group bg-white dark:bg-slate-900 relative rounded-2xl",
              selectedBoxes.has(box.id) ? "border-primary ring-4 ring-primary/10 scale-[1.02] z-10" : "border-slate-100 dark:border-slate-800"
            )}
            onClick={() => box.status === 'in_stock' && toggleBoxSelection(box.id)}
          >
            <CardContent className="p-0">
               {/* Header strip */}
               <div className={cn(
                 "h-1.5 w-full transition-colors duration-500",
                 box.status === 'shipped' ? "bg-slate-300" : (selectedBoxes.has(box.id) ? "bg-primary" : "bg-green-500")
               )} />
               
               <div className="p-5 space-y-5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl transition-all duration-500",
                      selectedBoxes.has(box.id) ? "bg-primary text-white shadow-lg rotate-3" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    )}>
                      <BoxIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">№ Коробки</div>
                      <div className="text-xl font-black tabular-nums tracking-tighter text-slate-900 dark:text-white leading-none">{box.numberInOrder}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <EditBoxDialog box={box} />
                    <Badge variant={box.status === "in_stock" ? "default" : "secondary"} className={cn(
                      "h-7 px-3 font-black uppercase text-[10px] tracking-widest rounded-full shadow-sm",
                      box.status === "in_stock" ? "bg-green-100 text-green-700 hover:bg-green-100 border-none" : "bg-slate-100 text-slate-500 border-none"
                    )}>
                      {box.status === 'in_stock' ? 'На складе' : 'Отгружена'}
                    </Badge>
                  </div>
                </div>

                {box.problemType && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/50 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" />
                    <span className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-tight">Проблема: {box.problemType}</span>
                  </div>
                )}

                <div className="flex items-end justify-between bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-800/50">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Кол-во</div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black tabular-nums tracking-tighter text-slate-900 dark:text-white">{box.quantity}</span>
                      <span className="text-sm font-bold text-muted-foreground uppercase">шт</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Место</div>
                    <div className="text-[13px] font-bold px-3 py-1 bg-white dark:bg-slate-900 rounded-lg border shadow-sm flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {box.locationType === 'permanent' ? 'Стеллаж' : 'Временное'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {box.stickerPhoto && (
                    <BoxImageGallery photos={[box.stickerPhoto]} icon={Camera} title={`Этикетка - ${box.numberInOrder}`} />
                  )}
                  {box.productPhotos && box.productPhotos.length > 0 && (
                    <BoxImageGallery photos={box.productPhotos} icon={Camera} title={`Содержимое - ${box.numberInOrder}`} />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Search tab removed as requested by user to avoid redundancy


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
  const [activeTab, setActiveTab] = useState("manage");

  const toggleExpand = (id: number) => {
    const next = new Set(expandedOrders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedOrders(next);
  };

  const [search, setSearch] = useState("");

  const { data: boxes } = useQuery<any[]>({
    queryKey: [api.boxes.list.path],
    queryFn: async () => {
      const res = await fetch(api.boxes.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch boxes");
      return res.json();
    }
  });

  const galleryItems = useMemo(() => {
    if (!boxes || !orders) return [];
    const ordersMap = new Map(orders.map((o: any) => [o.id, o]));
    const colors = [
      "bg-gradient-to-br from-red-400 to-pink-600",
      "bg-gradient-to-br from-yellow-400 to-orange-600",
      "bg-gradient-to-br from-blue-400 to-cyan-600",
      "bg-gradient-to-br from-green-400 to-teal-600",
      "bg-gradient-to-br from-purple-400 to-indigo-600",
      "bg-gradient-to-br from-rose-400 to-red-600"
    ];
    const items: any[] = [];
    boxes.forEach((box: any, idx: number) => {
      const order = ordersMap.get(box.orderId);
      const orderNumber = order?.number || box.manualOrderNumber || "???";
      const customerName = order?.customer || "???";
      let hasAddedAny = false;
      if (box.stickerPhoto) {
        items.push({ url: box.stickerPhoto, orderNumber, customerName, orderId: box.orderId, boxNumber: box.numberInOrder, type: "Этикетка", quantity: box.quantity, hasImage: true });
        hasAddedAny = true;
      }
      if (box.productPhotos && box.productPhotos.length > 0) {
        box.productPhotos.forEach((photo: string) => {
          items.push({ url: photo, orderNumber, customerName, orderId: box.orderId, boxNumber: box.numberInOrder, type: "Содержимое", quantity: box.quantity, hasImage: true });
        });
        hasAddedAny = true;
      }
      if (!hasAddedAny) {
        items.push({ url: null, orderNumber, customerName, orderId: box.orderId, boxNumber: box.numberInOrder, type: "Коробка", quantity: box.quantity, hasImage: false, color: colors[(box.id + idx) % colors.length] });
      }
    });
    return items;
  }, [boxes, orders]);



  const filteredOrders = orders?.filter((o: any) => 
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
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-slate-900 dark:text-white">{t("orders.title")}</h1>
          <p className="text-muted-foreground font-medium mt-1">Управление всеми заказами и отгрузками склада</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingOrder(null);
            form.reset({ number: "", customer: "", status: "active" });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 gap-3 bg-primary text-white shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 font-black uppercase tracking-widest rounded-2xl">
              <Plus className="w-6 h-6" /> {t("orders.new")}
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 shadow-2xl glass-effect sm:max-w-md">
            <DialogHeader className="border-b pb-4">
              <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <ArrowRightCircle className="w-5 h-5 text-primary" />
                </div>
                {editingOrder ? t("orders.edit_title") || "Edit Order" : t("orders.create_title")}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
                <FormField
                  control={form.control}
                  name="number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t("orders.number")}</FormLabel>
                      <FormControl>
                        <Input placeholder="ORD-XXXX" {...field} className="h-12 bg-slate-50 border-2 focus:border-primary font-bold text-lg" />
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
                      <FormLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t("orders.customer")}</FormLabel>
                      <FormControl>
                        <Input placeholder="Client Name" {...field} className="h-12 bg-slate-50 border-2 focus:border-primary font-bold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={createOrder.isPending || updateOrder.isPending} className="h-14 w-full shadow-lg font-black uppercase tracking-widest rounded-xl text-lg">
                    {(createOrder.isPending || updateOrder.isPending) && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {editingOrder ? t("common.save") || "Save" : "Создать заказ"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 h-14 rounded-2xl mb-8 w-full sm:w-auto shadow-sm">
          <TabsTrigger value="manage" className="h-11 px-8 rounded-xl font-black uppercase tracking-widest text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2">
            <ListFilter className="w-4 h-4" />
            Управление
          </TabsTrigger>
          <TabsTrigger value="photos" className="h-11 px-8 rounded-xl font-black uppercase tracking-widest text-xs data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-lg data-[state=active]:text-primary transition-all gap-2">
            <Images className="w-4 h-4" />
            Галерея фото
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 outline-none">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5 transition-colors group-focus-within:text-primary" />
            <Input 
              placeholder="Поиск по номеру заказа или клиенту..." 
              className="pl-12 h-14 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 focus:border-primary rounded-2xl shadow-sm text-lg font-bold transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Card className="overflow-hidden border-2 border-slate-50 dark:border-slate-900 shadow-xl rounded-3xl group">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="w-12 h-14"></TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">№ Заказа</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Клиент</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14">Статус</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 hidden md:table-cell">Дата создания</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-14 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((order: any) => (
                    <Fragment key={order.id}>
                      <TableRow 
                        className={cn(
                          "cursor-pointer transition-all h-20 group/row",
                          expandedOrders.has(order.id) ? "bg-slate-50/30 dark:bg-slate-800/20" : "hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                        )}
                        onClick={() => toggleExpand(order.id)}
                      >
                        <TableCell>
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                            expandedOrders.has(order.id) ? "bg-primary text-white shadow-md shadow-primary/30" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover/row:bg-slate-200"
                          )}>
                            {expandedOrders.has(order.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </TableCell>
                        <TableCell className="font-black text-lg tracking-tight">{order.number}</TableCell>
                        <TableCell className="font-bold text-slate-600 dark:text-slate-400">{order.customer}</TableCell>
                        <TableCell>
                          <Badge variant={order.status === "active" ? "default" : "secondary"} className={cn(
                            "h-7 px-3 font-black uppercase text-[10px] tracking-widest rounded-full",
                            order.status === "active" ? "bg-blue-100 text-blue-700 hover:bg-blue-100 border-none" : "bg-slate-100 text-slate-500 border-none"
                          )}>
                            {order.status === 'active' ? 'Активен' : 'Завершен'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-xs font-bold">{new Date(order.createdAt!).toLocaleDateString('ru-RU')}</TableCell>
                        <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-10 w-10 p-0 hover:bg-primary/10 hover:text-primary transition-all rounded-xl"
                            onClick={() => handleEdit(order)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {order.status === "active" ? (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-10 px-4 gap-2 border-2 border-emerald-100 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20 font-black uppercase text-[11px] tracking-wider rounded-xl transition-all"
                              onClick={() => {
                                if (confirm(t("orders.confirm_complete") || "Вы уверены, что хотите перевести этот заказ в статус 'Выполнен'?")) {
                                  completeOrder.mutate(order.id);
                                }
                              }}
                              disabled={completeOrder.isPending}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Завершить</span>
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-10 px-4 gap-2 border-2 border-amber-100 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-900/50 dark:hover:bg-amber-900/20 font-black uppercase text-[11px] tracking-wider rounded-xl transition-all"
                              onClick={() => {
                                if (confirm("Вы уверены, что хотите вернуть этот заказ в статус 'Активен'?")) {
                                  updateOrder.mutate({ id: order.id, data: { status: 'active' } });
                                }
                              }}
                              disabled={updateOrder.isPending}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Вернуть</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                      {expandedOrders.has(order.id) && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="p-0 border-b overflow-hidden animate-in fade-in slide-in-from-top-4 duration-500">
                            <OrderBoxesList orderId={order.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                  {filteredOrders?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-60 text-center">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                            <Search className="w-8 h-8 text-slate-400" />
                          </div>
                          <div className="text-lg font-bold text-slate-400">Ничего не найдено</div>
                          <p className="text-sm text-slate-400 max-w-xs">{t("common.no_results") || "Заказов по вашему запросу нет."}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="photos" className="outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {galleryItems.map((item: any, idx: number) => (
              <Dialog key={idx}>
                <DialogTrigger asChild>
                  <div className="cursor-pointer group flex flex-col gap-3">
                    {item.hasImage ? (
                      <div className="aspect-square rounded-2xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.05] flex items-center justify-center bg-slate-900 group-hover:border-primary/50">
                        <img src={item.url} alt="Box" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      </div>
                    ) : (
                      <div className={cn(
                        "aspect-square rounded-2xl border-2 border-transparent overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.05] flex items-center justify-center p-4 group-hover:border-primary/50",
                        item.color
                      )}>
                        <div className="text-center text-white space-y-2 group-hover:scale-110 transition-transform duration-500">
                          <div className="text-3xl font-black italic tracking-tighter">{item.boxNumber}</div>
                          <div className="text-[10px] font-black uppercase tracking-widest opacity-80 decoration-none animate-none underline-none">×{item.quantity} шт</div>
                        </div>
                      </div>
                    )}
                    <div className="px-1 space-y-0.5">
                      <div className="font-black text-slate-900 dark:text-white truncate text-sm uppercase tracking-tight group-hover:text-primary transition-colors">{item.orderNumber}</div>
                      <div className="text-muted-foreground text-[10px] font-bold truncate uppercase tracking-widest">{item.customerName}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[9px] font-black px-1.5 h-4 border-slate-200 dark:border-slate-800 uppercase tracking-tighter decoration-none animate-none underline-none">
                          Box {item.boxNumber}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-2 shadow-2xl glass-effect rounded-3xl">
                  <DialogHeader className="border-b pb-6">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                           <div className="bg-primary/10 p-2 rounded-xl">
                            <Images className="w-5 h-5 text-primary" />
                           </div>
                           <span>{item.orderNumber}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {item.customerName}</span>
                          <span className="flex items-center gap-1.5"><BoxIcon className="w-3.5 h-3.5" /> Коробка {item.boxNumber} • {item.type}</span>
                          <span className="flex items-center gap-1.5"><ListFilter className="w-3.5 h-3.5" /> {item.quantity} шт</span>
                        </div>
                      </div>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="mt-6">
                    {item.hasImage ? (
                      <div className="rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 bg-slate-900 shadow-inner">
                        <img src={item.url} alt="Full view" className="w-full h-auto max-h-[70vh] object-contain" />
                      </div>
                    ) : (
                      <div className={cn(
                        "rounded-2xl overflow-hidden border-2 flex items-center justify-center p-12 aspect-square shadow-inner",
                        item.color
                      )}>
                        <div className="text-center text-white space-y-4">
                          <div className="text-7xl font-black italic tracking-tighter">{item.boxNumber}</div>
                          <div className="text-3xl font-bold decoration-none animate-none underline-none opacity-90">×{item.quantity} шт</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="pt-2">
                    <DialogClose asChild>
                      <Button
                        className="h-12 w-full gap-2 font-bold uppercase tracking-wider shadow-lg rounded-xl transition-all active:scale-95"
                        onClick={() => {
                          setActiveTab("manage");
                          setExpandedOrders(new Set([item.orderId]));
                        }}
                      >
                        <ArrowRightCircle className="w-4 h-4" />
                        Перейти к управлению заказом
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ))}
          </div>
          {galleryItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                <Images className="w-8 h-8 text-slate-400" />
              </div>
              <div className="text-slate-400 font-bold uppercase tracking-widest text-xs">Нет фотографий коробок</div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
