import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useOrders, useBoxes, useLocations, useLocationByQr } from "@/hooks/use-warehouse";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrScanner } from "@/components/qr-scanner";
import {
  ArrowLeft,
  Package,
  MapPin,
  Search,
  Scan,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Move,
  Split,
  AlertCircle,
} from "lucide-react";
import type { Box, Location } from "@shared/schema";

enum Phase {
  ORDER_LIST = 0,
  BOX_GROUPS = 1,
  LOCATION_PICK = 2,
  DONE = 3,
}

interface BoxGroup {
  key: string;
  label: string;
  boxes: Box[];
  selected: boolean;
  count: number;
}

export default function MoveBoxes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [phase, setPhase] = useState<Phase>(Phase.ORDER_LIST);
  const [search, setSearch] = useState("");
  const [filterQrUuid, setFilterQrUuid] = useState<string | null>(null);
  const [showFilterScanner, setShowFilterScanner] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [groups, setGroups] = useState<BoxGroup[]>([]);
  const [newLocationId, setNewLocationId] = useState<number | null>(null);
  const [newLocationUuid, setNewLocationUuid] = useState<string | null>(null);
  const [showNewLocScanner, setShowNewLocScanner] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [movedCount, setMovedCount] = useState(0);

  const { data: allOrders, isLoading: ordersLoading } = useOrders({ status: "active" });
  const { data: allBoxes, isLoading: boxesLoading } = useBoxes();
  const { data: locations } = useLocations();
  const { data: filterLocation } = useLocationByQr(filterQrUuid);
  const { data: scannedNewLoc } = useLocationByQr(newLocationUuid);

  const isLoading = ordersLoading || boxesLoading;

  // === Order list with in_stock boxes ===
  const ordersWithBoxes = useMemo(() => {
    if (!allOrders || !allBoxes) return [];
    return allOrders
      .map((order) => {
        const inStock = allBoxes.filter(
          (b) => b.orderId === order.id && b.status === "in_stock"
        );
        return { ...order, inStockBoxes: inStock };
      })
      .filter((o) => o.inStockBoxes.length > 0);
  }, [allOrders, allBoxes]);

  const filteredOrders = useMemo(() => {
    let list = ordersWithBoxes;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.number.toLowerCase().includes(q) ||
          (o.customer || "").toLowerCase().includes(q)
      );
    }
    if (filterLocation) {
      list = list.filter((o) =>
        o.inStockBoxes.some((b) => b.locationId === filterLocation.id)
      );
    }
    return list;
  }, [ordersWithBoxes, search, filterLocation]);

  // === Selected order boxes ===
  const selectedOrderBoxes = useMemo(() => {
    if (!selectedOrderId || !allBoxes) return [];
    return allBoxes.filter(
      (b) => b.orderId === selectedOrderId && b.status === "in_stock"
    );
  }, [selectedOrderId, allBoxes]);

  const selectedOrder = allOrders?.find((o) => o.id === selectedOrderId);

  // Build groups when order changes
  useEffect(() => {
    if (!selectedOrderId || selectedOrderBoxes.length === 0) {
      setGroups([]);
      return;
    }
    const groupMap = new Map<string, Box[]>();
    for (const box of selectedOrderBoxes) {
      const key = box.description || "__none__";
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(box);
    }
    const newGroups: BoxGroup[] = Array.from(groupMap.entries()).map(
      ([key, boxes]) => ({
        key,
        label: key === "__none__" ? "Без описания" : key,
        boxes,
        selected: false,
        count: boxes.length,
      })
    );
    setGroups(newGroups);
  }, [selectedOrderId, selectedOrderBoxes]);

  const toggleGroup = (key: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.key === key ? { ...g, selected: !g.selected } : g))
    );
  };

  const setGroupCount = (key: string, val: number) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.key === key
          ? { ...g, count: Math.max(1, Math.min(g.boxes.length, val)) }
          : g
      )
    );
  };

  const selectedGroups = groups.filter((g) => g.selected);
  const hasSelection = selectedGroups.length > 0;
  const totalSelected = selectedGroups.reduce((sum, g) => sum + g.count, 0);

  // === Location helpers ===
  const getLocationName = (id: number | null) => {
    if (!id || !locations) return "Нет места";
    return locations.find((l) => l.id === id)?.name || `ID ${id}`;
  };

  const getGroupLocations = (boxes: Box[]): string => {
    if (!locations) return "—";
    const locIds = [...new Set(boxes.map((b) => b.locationId).filter(Boolean))];
    if (locIds.length === 0) return "Не указано";
    if (locIds.length === 1) return getLocationName(locIds[0]!);
    return "Разные места";
  };

  const resolvedNewLocation: Location | undefined =
    newLocationId
      ? locations?.find((l) => l.id === newLocationId)
      : scannedNewLoc ?? undefined;

  const handleFilterScan = useCallback((uuid: string) => {
    setFilterQrUuid(uuid);
    setShowFilterScanner(false);
  }, []);

  const handleNewLocScan = useCallback((uuid: string) => {
    setNewLocationUuid(uuid);
    setNewLocationId(null);
    setShowNewLocScanner(false);
  }, []);

  const handleSelectOrder = (orderId: number) => {
    setSelectedOrderId(orderId);
    setPhase(Phase.BOX_GROUPS);
  };

  const handleProceedToLocation = () => {
    if (!hasSelection) {
      toast({
        title: "Выберите коробки",
        description: "Отметьте хотя бы одну группу для перемещения",
        variant: "destructive",
      });
      return;
    }
    setNewLocationId(null);
    setNewLocationUuid(null);
    setPhase(Phase.LOCATION_PICK);
  };

  const handleConfirmMove = async () => {
    if (!resolvedNewLocation) {
      toast({
        title: "Выберите место",
        description: "Укажите новое место хранения",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      let totalMoved = 0;
      const existingSplits = (allOrders || []).filter((o) =>
        o.number.startsWith(selectedOrder!.number + "-")
      );
      let splitIdx = existingSplits.length + 1;

      for (const group of selectedGroups) {
        const boxesToMove = group.boxes.slice(0, group.count);
        const boxIds = boxesToMove.map((b) => b.id);
        const needsSplit = group.count < group.boxes.length;

        for (const stockId of boxIds) {
          const payload = {
            stock_id: stockId,
            location_id: resolvedNewLocation.id,
            quantity: 1, // Representing the full stock of that container
          };
          const res = await fetch('/v1/warehousing/stocks/move', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const err = await res.json().catch(()=>({}));
            throw new Error(err.message || "Ошибка перемещения");
          }
          totalMoved++;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['/v1/warehousing/containers-stocks'] });
      await queryClient.invalidateQueries({ queryKey: ["/api/orders"] });

      setMovedCount(totalMoved);
      setPhase(Phase.DONE);
    } catch (err: any) {
      toast({
        title: "Ошибка",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToList = () => {
    setPhase(Phase.ORDER_LIST);
    setSelectedOrderId(null);
    setGroups([]);
    setNewLocationId(null);
    setNewLocationUuid(null);
    setSearch("");
    setFilterQrUuid(null);
  };

  // ============================================================
  // PHASE: DONE
  // ============================================================
  if (phase === Phase.DONE) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <div className="text-center">
          <h2 className="text-3xl font-bold font-display mb-2">Готово!</h2>
          <p className="text-muted-foreground text-lg">
            Перемещено коробок: <strong>{movedCount}</strong>
          </p>
          <p className="text-muted-foreground">
            Новое место: <strong>{resolvedNewLocation?.name}</strong>
          </p>
        </div>
        <Button
          className="h-14 px-10 text-lg"
          onClick={resetToList}
          data-testid="btn-back-to-list"
        >
          К списку заказов
        </Button>
      </div>
    );
  }

  // ============================================================
  // PHASE: LOCATION_PICK
  // ============================================================
  if (phase === Phase.LOCATION_PICK) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl"
            onClick={() => setPhase(Phase.BOX_GROUPS)}
            data-testid="btn-back-to-groups"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display">Новое место хранения</h1>
            <p className="text-muted-foreground">
              Выберите куда переместить {totalSelected} коробок
            </p>
          </div>
        </div>

        {/* Summary of what's being moved */}
        <Card>
          <CardContent className="pt-4 pb-4 space-y-1">
            {selectedGroups.map((g) => (
              <div key={g.key} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{g.label}</span>
                <span className="font-medium">
                  {g.count} из {g.boxes.length} коробок
                  {g.count < g.boxes.length && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      <Split className="w-3 h-3 mr-1" />
                      расщепление
                    </Badge>
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* QR scan for new location */}
        <div>
          <p className="text-sm font-medium mb-2">Сканировать QR новой полки</p>
          {showNewLocScanner ? (
            <QrScanner
              onScan={handleNewLocScan}
              label="Наведите камеру на QR-код полки"
            />
          ) : (
            <Button
              variant="outline"
              className="w-full h-14 text-base border-dashed border-2"
              onClick={() => setShowNewLocScanner(true)}
              data-testid="btn-scan-new-loc"
            >
              <Scan className="w-5 h-5 mr-2" />
              Сканировать QR полки
            </Button>
          )}
          {scannedNewLoc && (
            <div className="mt-2 flex items-center gap-2 text-green-600 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Место: {scannedNewLoc.name}
            </div>
          )}
        </div>

        {/* Or pick from list */}
        <div>
          <p className="text-sm font-medium mb-2">или выберите из списка</p>
          <div className="grid gap-2">
            {(locations || []).map((loc) => (
              <button
                key={loc.id}
                data-testid={`btn-loc-${loc.id}`}
                className={`w-full h-14 rounded-xl border-2 flex items-center gap-3 px-4 transition-all ${
                  newLocationId === loc.id
                    ? "border-primary bg-primary/5 text-primary font-semibold"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
                onClick={() => {
                  setNewLocationId(loc.id);
                  setNewLocationUuid(null);
                }}
              >
                <MapPin className="w-5 h-5 flex-shrink-0" />
                <span className="text-left">{loc.name}</span>
                {newLocationId === loc.id && (
                  <CheckCircle2 className="w-5 h-5 ml-auto text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Confirm */}
        {resolvedNewLocation && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <MapPin className="w-5 h-5 text-green-600" />
              <span className="font-medium">
                Переместить в: <strong>{resolvedNewLocation.name}</strong>
              </span>
            </CardContent>
          </Card>
        )}

        <Button
          className="w-full h-14 text-lg"
          onClick={handleConfirmMove}
          disabled={!resolvedNewLocation || isSaving}
          data-testid="btn-confirm-move"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Move className="w-5 h-5 mr-2" />
          )}
          Подтвердить перемещение
        </Button>
      </div>
    );
  }

  // ============================================================
  // PHASE: BOX_GROUPS
  // ============================================================
  if (phase === Phase.BOX_GROUPS) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl"
            onClick={() => setPhase(Phase.ORDER_LIST)}
            data-testid="btn-back-to-orders"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-display">
              Заказ №{selectedOrder?.number}
            </h1>
            <p className="text-muted-foreground">
              {selectedOrder?.customer && `${selectedOrder.customer} · `}
              {selectedOrderBoxes.length} коробок на складе
            </p>
          </div>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Нет коробок для перемещения</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <Card
                key={group.key}
                className={`transition-all cursor-pointer ${
                  group.selected
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-primary/30"
                }`}
                onClick={() => toggleGroup(group.key)}
                data-testid={`group-card-${group.key}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox indicator */}
                    <div
                      className={`mt-1 w-6 h-6 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        group.selected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/30"
                      }`}
                    >
                      {group.selected && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base">{group.label}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          {group.boxes.length} коробок
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {getGroupLocations(group.boxes)}
                        </span>
                      </div>

                      {/* Count input when selected and more than 1 box */}
                      {group.selected && group.boxes.length > 1 && (
                        <div
                          className="mt-3 flex items-center gap-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-sm font-medium">
                            Переместить:
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 w-9 p-0 text-lg"
                              onClick={() =>
                                setGroupCount(group.key, group.count - 1)
                              }
                              data-testid={`btn-dec-${group.key}`}
                            >
                              −
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              max={group.boxes.length}
                              value={group.count}
                              onChange={(e) =>
                                setGroupCount(group.key, Number(e.target.value))
                              }
                              className="w-16 h-9 text-center font-bold"
                              data-testid={`input-count-${group.key}`}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 w-9 p-0 text-lg"
                              onClick={() =>
                                setGroupCount(group.key, group.count + 1)
                              }
                              data-testid={`btn-inc-${group.key}`}
                            >
                              +
                            </Button>
                            <span className="text-sm text-muted-foreground">
                              из {group.boxes.length}
                            </span>
                          </div>
                          {group.count < group.boxes.length && (
                            <Badge
                              variant="outline"
                              className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/10"
                            >
                              <Split className="w-3 h-3 mr-1" />
                              расщепление
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {hasSelection && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              Выбрано <strong>{totalSelected}</strong> коробок
              {selectedGroups.some((g) => g.count < g.boxes.length) &&
                " · частичный выбор вызовет расщепление заказа"}
            </span>
          </div>
        )}

        <Button
          className="w-full h-14 text-lg"
          disabled={!hasSelection}
          onClick={handleProceedToLocation}
          data-testid="btn-proceed-to-location"
        >
          <Move className="w-5 h-5 mr-2" />
          Переместить выбранное ({totalSelected})
        </Button>
      </div>
    );
  }

  // ============================================================
  // PHASE: ORDER_LIST (default)
  // ============================================================
  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4">
      <div>
        <h1 className="text-3xl font-bold font-display">Перемещение коробок</h1>
        <p className="text-muted-foreground mt-1">
          Выберите заказ для перемещения
        </p>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Поиск по номеру или клиенту..."
            className="pl-10 h-12"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>
        <Button
          variant="outline"
          className="h-12 px-4 gap-2"
          onClick={() => setShowFilterScanner((v) => !v)}
          data-testid="btn-scan-shelf"
        >
          <Scan className="w-5 h-5" />
          <span className="hidden sm:inline">Сканировать QR</span>
        </Button>
      </div>

      {/* QR scanner for shelf filter */}
      {showFilterScanner && (
        <QrScanner
          onScan={handleFilterScan}
          label="Наведите камеру на QR полки для фильтрации"
        />
      )}

      {filterLocation && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-2">
          <span className="text-sm font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Фильтр по полке: <strong>{filterLocation.name}</strong>
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-muted-foreground"
            onClick={() => setFilterQrUuid(null)}
          >
            Сбросить
          </Button>
        </div>
      )}

      {/* Orders list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          Загрузка...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Нет заказов для перемещения</p>
          <p className="text-sm mt-1">
            {search || filterLocation
              ? "Попробуйте изменить фильтры"
              : "Все активные заказы не содержат коробок на складе"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const locIds = [
              ...new Set(
                order.inStockBoxes
                  .map((b) => b.locationId)
                  .filter(Boolean) as number[]
              ),
            ];
            const locNames = locIds
              .map((id) => locations?.find((l) => l.id === id)?.name || `#${id}`)
              .join(", ");

            const firstPhoto =
                order.inStockBoxes.find((b) => b.productPhotos?.length)?.productPhotos?.[0] ||
                order.inStockBoxes.find((b) => b.stickerPhoto)?.stickerPhoto ||
                null;
              const firstDesc = order.inStockBoxes.find((b) => b.description)?.description || null;

            return (
              <Card
                key={order.id}
                className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                onClick={() => handleSelectOrder(order.id)}
                data-testid={`order-card-${order.id}`}
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-4">
                    {/* Photo thumbnail */}
                    {firstPhoto ? (
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border bg-black">
                        <img
                          src={firstPhoto}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg border-2 border-dashed bg-muted/30 flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">
                          №{order.number}
                        </span>
                        {order.customer && (
                          <span className="text-muted-foreground text-sm">
                            {order.customer}
                          </span>
                        )}
                      </div>
                      {firstDesc && (
                        <p className="text-sm text-foreground/80 mt-0.5 line-clamp-1">
                          {firstDesc}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Package className="w-3.5 h-3.5" />
                          {order.inStockBoxes.length} коробок на складе
                        </span>
                        {locNames && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {locIds.length === 1
                              ? locNames
                              : "Несколько мест"}
                          </span>
                        )}
                      </div>
                      {order.createdAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(order.createdAt).toLocaleDateString("ru-RU")}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
