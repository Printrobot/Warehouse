import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Search, Plus, ChevronDown, ChevronUp, Pencil, Camera, Box as BoxIcon, RotateCcw, AlertTriangle, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompleteOrder, useCreateOrder, useUpdateOrder, useOrder, useUpdateBox, useShipBox } from "@/hooks/use-warehouse";
import React, { useState, Fragment, useMemo } from "react";
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
  const hasProblemBoxes = order.boxes.some(b => b.problemType);

  return (
    <div className="p-6 bg-slate-50/80 dark:bg-slate-900/80 border-y-2 backdrop-blur-sm">
      {hasProblemBoxes && (
        <div className="mx-2 mb-4 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 animate-pulse">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold uppercase tracking-tight">Внимание: В этом заказе есть коробки с проблемами!</span>
        </div>
      )}
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
                  {box.problemType && (
                    <Badge variant="destructive" className="h-6 px-2 font-black uppercase text-[10px] animate-bounce">
                      PROBLEM: {box.problemType}
                    </Badge>
                  )}
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

function SearchOrderBoxesList({ orderId }: { orderId: number }) {
  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!order?.boxes || order.boxes.length === 0) return <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-xl m-4 border-2 border-dashed">Нет коробок</div>;

  return (
    <div className="p-6 bg-slate-50/80 dark:bg-slate-900/80 border-y-2 backdrop-blur-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {order.boxes.map((box) => (
          <Card key={box.id} className="overflow-hidden border-2 shadow-md hover:shadow-lg transition-all duration-300 bg-white dark:bg-slate-900">
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <BoxIcon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-black uppercase tracking-tighter text-slate-500">Коробка: <span className="text-slate-900 dark:text-white text-lg">{box.numberInOrder}</span></span>
                </div>
                <Badge variant={box.status === "in_stock" ? "default" : "secondary"} className={cn(
                  "h-6 px-2 font-black uppercase text-[10px] tracking-widest",
                  box.status === "in_stock" ? "bg-green-500 hover:bg-green-600" : ""
                )}>
                  {box.status === "in_stock" ? "На складе" : "Отгружена"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Количество</div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-black tabular-nums tracking-tighter">{box.quantity}</span>
                    <span className="text-sm font-bold text-muted-foreground uppercase">шт</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Местоположение</div>
                  <div className="text-sm font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full border shadow-sm">
                    {box.locationType === 'permanent' ? 'Стеллаж' : 'Временное'}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-dashed">
                {box.stickerPhoto && (
                  <BoxImageGallery photos={[box.stickerPhoto]} icon={Camera} title={`Этикетка - ${box.numberInOrder}`} />
                )}
                {box.productPhotos && box.productPhotos.length > 0 && (
                  <BoxImageGallery photos={box.productPhotos} icon={Camera} title={`Содержимое - ${box.numberInOrder}`} />
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

  const [activeTab, setActiveTab] = useState("manage");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSearch, setExpandedSearch] = useState<Set<number>>(new Set());

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
        items.push({ url: box.stickerPhoto, orderNumber, customerName, boxNumber: box.numberInOrder, type: "Этикетка", quantity: box.quantity, hasImage: true });
        hasAddedAny = true;
      }
      if (box.productPhotos && box.productPhotos.length > 0) {
        box.productPhotos.forEach((photo: string) => {
          items.push({ url: photo, orderNumber, customerName, boxNumber: box.numberInOrder, type: "Содержимое", quantity: box.quantity, hasImage: true });
        });
        hasAddedAny = true;
      }
      if (!hasAddedAny) {
        items.push({ url: null, orderNumber, customerName, boxNumber: box.numberInOrder, type: "Коробка", quantity: box.quantity, hasImage: false, color: colors[(box.id + idx) % colors.length] });
      }
    });
    return items;
  }, [boxes, orders]);

  const toggleExpandSearch = (id: number) => {
    const next = new Set(expandedSearch);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedSearch(next);
  };

  const filteredOrders = orders?.filter((o: any) => 
    o.number.toLowerCase().includes(search.toLowerCase()) || 
    o.customer?.toLowerCase().includes(search.toLowerCase())
  );

  const searchFilteredOrders = orders?.filter((o: any) =>
    o.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.customer?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{t("orders.title")}</h1>
        {activeTab === "manage" && (
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
        )}
      </div>

      {/* Tab navigation */}
      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={() => setActiveTab("manage")}
          className={cn(
            "h-12 px-5 gap-2 font-bold uppercase tracking-wider text-sm transition-all border-2",
            activeTab === "manage"
              ? "bg-primary text-white border-primary shadow-lg"
              : "bg-white dark:bg-slate-900 text-primary border-primary/20 hover:border-primary hover:bg-primary/5"
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          Управление
        </Button>
        <Button
          onClick={() => setActiveTab("search")}
          className={cn(
            "h-12 px-5 gap-2 font-bold uppercase tracking-wider text-sm transition-all border-2",
            activeTab === "search"
              ? "bg-primary text-white border-primary shadow-lg"
              : "bg-white dark:bg-slate-900 text-primary border-primary/20 hover:border-primary hover:bg-primary/5"
          )}
        >
          <Search className="w-4 h-4" />
          Поиск заказа
        </Button>
        <Button
          onClick={() => setActiveTab("photos")}
          className={cn(
            "h-12 px-5 gap-2 font-bold uppercase tracking-wider text-sm transition-all border-2",
            activeTab === "photos"
              ? "bg-primary text-white border-primary shadow-lg"
              : "bg-white dark:bg-slate-900 text-primary border-primary/20 hover:border-primary hover:bg-primary/5"
          )}
        >
          <Images className="w-4 h-4" />
          Галерея фото
        </Button>
      </div>

      {/* TAB: Manage Orders */}
      {activeTab === "manage" && (
        <>
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
                  {filteredOrders?.map((order: any) => (
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
                          {order.status === "active" ? (
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
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-10 px-3 gap-1.5 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-900 dark:hover:bg-amber-900/20"
                              onClick={() => {
                                if (confirm("Вы уверены, что хотите вернуть этот заказ в статус 'Активен'?")) {
                                  updateOrder.mutate({ id: order.id, data: { status: 'active' } });
                                }
                              }}
                              disabled={updateOrder.isPending}
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span className="hidden sm:inline">Вернуть в работу</span>
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
        </>
      )}

      {/* TAB: Search by number/client */}
      {activeTab === "search" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder="Введите номер заказа или имя клиента..." 
              className="pl-12 h-14 text-base bg-white dark:bg-slate-900 border-2 focus:border-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {searchFilteredOrders && searchFilteredOrders.length > 0 ? (
            <Card className="overflow-hidden border-2 shadow-sm">
              <div className="space-y-0">
                {searchFilteredOrders.map((order: any) => (
                  <Fragment key={order.id}>
                    <div
                      className="flex items-center justify-between p-5 border-b last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      onClick={() => toggleExpandSearch(order.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <button className="p-1 hover:bg-primary/10 rounded-lg transition-colors">
                          {expandedSearch.has(order.id) ? (
                            <ChevronUp className="w-5 h-5 text-primary" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <div className="font-bold text-base tracking-tight">{order.number}</div>
                          <div className="text-sm text-muted-foreground">{order.customer || "Нет клиента"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={order.status === "active" ? "default" : "secondary"} className="font-bold uppercase text-[11px] tracking-widest">
                          {order.status === "active" ? "🔄 Активен" : "✓ Завершен"}
                        </Badge>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(order.createdAt!).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </div>
                    {expandedSearch.has(order.id) && (
                      <div className="border-t">
                        <SearchOrderBoxesList orderId={order.id} />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>
            </Card>
          ) : (
            <div className="text-center py-16">
              <div className="text-muted-foreground mb-2">Заказы не найдены</div>
              {searchQuery && (
                <div className="text-sm text-muted-foreground">Попробуйте другой номер заказа или имя клиента</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: Photo Gallery */}
      {activeTab === "photos" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryItems.map((item: any, idx: number) => (
            <Dialog key={idx}>
              <DialogTrigger asChild>
                <div className="cursor-pointer group">
                  {item.hasImage ? (
                    <div className="aspect-square rounded-xl border-2 overflow-hidden shadow-md hover:shadow-lg transition-all transform hover:scale-105 flex items-center justify-center bg-slate-900">
                      <img src={item.url} alt="Box" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className={cn(
                      "aspect-square rounded-xl border-2 overflow-hidden shadow-md hover:shadow-lg transition-all transform hover:scale-105 flex items-center justify-center p-4",
                      item.color
                    )}>
                      <div className="text-center text-white space-y-2">
                        <div className="text-2xl font-black">{item.boxNumber}</div>
                        <div className="text-sm font-bold">×{item.quantity} шт</div>
                      </div>
                    </div>
                  )}
                  <div className="mt-2 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white truncate">{item.orderNumber}</div>
                    <div className="text-muted-foreground text-[10px] truncate">{item.customerName}</div>
                    <div className="text-muted-foreground text-[10px]">Коробка {item.boxNumber}</div>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-2">
                <DialogHeader className="border-b pb-4">
                  <DialogTitle className="text-lg">
                    <div className="space-y-1">
                      <div className="font-bold">{item.orderNumber}</div>
                      <div className="text-sm text-muted-foreground">Клиент: {item.customerName}</div>
                      <div className="text-sm text-muted-foreground">Коробка {item.boxNumber} • {item.type}</div>
                      <div className="text-sm text-muted-foreground">Количество: {item.quantity} шт</div>
                    </div>
                  </DialogTitle>
                </DialogHeader>
                {item.hasImage ? (
                  <div className="rounded-xl overflow-hidden border-2 bg-slate-900">
                    <img src={item.url} alt="Full view" className="w-full h-auto max-h-[70vh] object-contain" />
                  </div>
                ) : (
                  <div className={cn(
                    "rounded-xl overflow-hidden border-2 flex items-center justify-center p-8 aspect-square",
                    item.color
                  )}>
                    <div className="text-center text-white space-y-3">
                      <div className="text-5xl font-black">{item.boxNumber}</div>
                      <div className="text-2xl font-bold">×{item.quantity} шт</div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          ))}
          {galleryItems.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              Нет фотографий коробок
            </div>
          )}
        </div>
      )}
    </div>
  );
}
