import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronDown, ChevronUp, Camera, Box as BoxIcon, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/hooks/use-warehouse";
import React, { useState, Fragment, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge as Badge2 } from "@/components/ui/badge";
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
          <span className="font-semibold">Фото</span>
          <Badge2 variant="secondary" className="h-5 px-1.5 min-w-[20px] justify-center bg-primary/10 text-primary border-none">{photos.length}</Badge2>
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

function SearchOrderBoxesList({ orderId }: { orderId: number }) {
  const { data: order, isLoading } = useOrder(orderId);

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!order?.boxes || order.boxes.length === 0) return <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-xl m-4 border-2 border-dashed">Нет коробок</div>;

  return (
    <div className="p-6 bg-slate-50/80 dark:bg-slate-900/80 border-y-2 backdrop-blur-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {order.boxes.map((box) => (
          <Card key={box.id} className="overflow-hidden border-2 shadow-md hover:shadow-lg transition-all duration-300 group bg-white dark:bg-slate-900">
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

export default function SearchOrders() {
  const { data: orders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: [api.orders.list.path],
    queryFn: async () => {
      const res = await fetch(api.orders.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    }
  });

  const { data: boxes, isLoading: boxesLoading } = useQuery<any[]>({
    queryKey: [api.boxes.list.path],
    queryFn: async () => {
      const res = await fetch(api.boxes.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch boxes");
      return res.json();
    }
  });

  const [search, setSearch] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState("text");

  const toggleExpand = (id: number) => {
    const next = new Set(expandedOrders);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedOrders(next);
  };

  const filteredOrders = orders?.filter(o => 
    o.number.toLowerCase().includes(search.toLowerCase()) || 
    o.customer?.toLowerCase().includes(search.toLowerCase())
  );

  const galleryItems = useMemo(() => {
    if (!boxes || !orders) return [];
    
    const ordersMap = new Map(orders.map(o => [o.id, o]));
    
    const items: any[] = [];
    boxes.forEach((box, idx) => {
      const order = ordersMap.get(box.orderId);
      const orderNumber = order?.number || box.manualOrderNumber || "???";
      const customerName = order?.customer || "???";
      
      const colors = [
        "bg-gradient-to-br from-red-400 to-pink-600",
        "bg-gradient-to-br from-yellow-400 to-orange-600",
        "bg-gradient-to-br from-blue-400 to-cyan-600",
        "bg-gradient-to-br from-green-400 to-teal-600",
        "bg-gradient-to-br from-purple-400 to-indigo-600",
        "bg-gradient-to-br from-rose-400 to-red-600"
      ];

      let hasAddedAny = false;

      if (box.stickerPhoto) {
        items.push({
          url: box.stickerPhoto,
          orderNumber,
          customerName,
          boxNumber: box.numberInOrder,
          type: "Этикетка",
          quantity: box.quantity,
          hasImage: true
        });
        hasAddedAny = true;
      }

      if (box.productPhotos && box.productPhotos.length > 0) {
        box.productPhotos.forEach((photo: string) => {
          items.push({
            url: photo,
            orderNumber,
            customerName,
            boxNumber: box.numberInOrder,
            type: "Содержимое",
            quantity: box.quantity,
            hasImage: true
          });
        });
        hasAddedAny = true;
      }

      if (!hasAddedAny) {
        items.push({
          url: null,
          orderNumber,
          customerName,
          boxNumber: box.numberInOrder,
          type: "Коробка",
          quantity: box.quantity,
          hasImage: false,
          color: colors[(box.id + idx) % colors.length]
        });
      }
    });
    return items;
  }, [boxes, orders]);

  if (ordersLoading || boxesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">🔍 Поиск заказа</h1>
        <p className="text-muted-foreground text-sm font-medium">Быстрый поиск информации о заказе по номеру, клиенту или фото</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={() => setActiveTab("text")}
          className={cn(
            "h-14 px-6 gap-3 font-bold uppercase tracking-wider text-base transition-all border-2",
            activeTab === "text"
              ? "bg-primary text-white border-primary shadow-lg"
              : "bg-white dark:bg-slate-900 text-primary border-primary/20 hover:border-primary hover:bg-primary/5"
          )}
        >
          <Search className="w-5 h-5" />
          По номеру / Клиенту
        </Button>
        <Button
          onClick={() => setActiveTab("photos")}
          className={cn(
            "h-14 px-6 gap-3 font-bold uppercase tracking-wider text-base transition-all border-2",
            activeTab === "photos"
              ? "bg-primary text-white border-primary shadow-lg"
              : "bg-white dark:bg-slate-900 text-primary border-primary/20 hover:border-primary hover:bg-primary/5"
          )}
        >
          <Images className="w-5 h-5" />
          Галерея фото
        </Button>
      </div>

      {activeTab === "text" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder="Введите номер заказа или имя клиента..." 
              className="pl-12 h-14 text-base bg-white dark:bg-slate-900 border-2 focus:border-primary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filteredOrders && filteredOrders.length > 0 ? (
            <Card className="overflow-hidden border-2 shadow-sm">
              <div className="space-y-0">
                {filteredOrders.map((order) => (
                  <Fragment key={order.id}>
                    <div
                      className="flex items-center justify-between p-5 border-b last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <button className="p-1 hover:bg-primary/10 rounded-lg transition-colors">
                          {expandedOrders.has(order.id) ? (
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

                    {expandedOrders.has(order.id) && (
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
              {search && (
                <div className="text-sm text-muted-foreground">
                  Попробуйте другой номер заказа или имя клиента
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "photos" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryItems.map((item, idx) => (
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
        </div>
      )}
    </div>
  );
}
