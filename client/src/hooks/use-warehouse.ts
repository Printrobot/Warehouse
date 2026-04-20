import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertBox, type InsertMaterial } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import type { StoreListResponse, ContainerListResponse, StockListResponse, CreateContainerParams, TransferStockParams } from "@/lib/api-types";
import type { Box, Location } from "@shared/schema";
// === ORDERS ===
export function useOrders(params?: { status?: 'active' | 'completed'; search?: string }) {
  return useQuery({
    queryKey: [api.orders.list.path, params],
    queryFn: async () => {
      const url = new URL(api.orders.list.path, window.location.origin);
      if (params?.status) url.searchParams.append('status', params.status);
      if (params?.search) url.searchParams.append('search', params.search);
      
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const json = await res.json();
      return api.orders.list.responses[200].parse(json);
    },
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: [api.orders.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.orders.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) throw new Error("Order not found");
      if (!res.ok) throw new Error("Failed to fetch order");
      const json = await res.json();
      return api.orders.get.responses[200].parse(json);
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.orders.create.path, {
        method: api.orders.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
    },
    onError: (err) => {
      toast({ title: t("common.error") || "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const url = buildUrl(api.orders.get.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update order");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      toast({ title: t("common.success") || "Success", description: "Order updated" });
    },
    onError: (err) => {
      toast({ title: t("common.error") || "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useCompleteOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.orders.complete.path, { id });
      const res = await fetch(url, {
        method: api.orders.complete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to complete order");
      const json = await res.json();
      return api.orders.complete.responses[200].parse(json);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      toast({ title: t("common.success") || "Success", description: t("orders.status_updated") || "Order status updated" });
    },
    onError: (err) => {
      toast({ title: t("common.error") || "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useUpdateBox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/boxes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update box");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.orders.get.path] });
      toast({ title: t("common.success") || "Success", description: "Box updated" });
    },
    onError: (err: any) => {
      toast({ title: t("common.error") || "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useBoxes() {
  return useQuery({
    queryKey: ['/v1/warehousing/containers-stocks'],
    queryFn: async () => {
      // Fetch stocks
      const stocksRes = await fetch('/v1/warehousing/stocks?limit=100');
      if (!stocksRes.ok) throw new Error("Failed to fetch stocks");
      const stocksData: StockListResponse = await stocksRes.json();

      // Fetch containers
      const containersRes = await fetch('/v1/warehousing/containers?limit=100');
      if (!containersRes.ok) throw new Error("Failed to fetch containers");
      const containersData: ContainerListResponse = await containersRes.json();

      // Map to Box[]
      const boxes: Box[] = stocksData.stocks.map((stock) => {
        const container = containersData.containers.find(c => c.id === stock.container_id);
        return {
          id: stock.id,
          orderId: (stock.id % 5) + 1, // Mock mapping to orders 1-5
          manualOrderNumber: container?.code || null,
          numberInOrder: "1",
          quantity: stock.quantity || 1,
          locationType: "permanent",
          locationId: stock.location_id,
          status: "in_stock",
          description: container ? (container.tags?.join(", ") || container.code) : String(stock.id),
          productPhotos: container?.images || [],
          tempLocationPhoto: null,
          tempLocationDesc: null,
          stickerPhoto: null,
          problemType: null,
          problemDesc: null,
          shippedAt: null,
          shippedBy: null,
          createdAt: stock.created_at ? new Date(stock.created_at) : new Date(),
          createdBy: 1, // mock user
        };
      });

      return boxes;
    }
  });
}

export function useShipBox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const payload: TransferStockParams = {
        stock_id: id,
        quantity: 1, // Assuming full quantity or 1 for the scope
      };
      const res = await fetch('/v1/warehousing/stocks/transfer', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok && res.status !== 204) throw new Error("Failed to ship box");
      return res.status === 204 ? null : res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/v1/warehousing/containers-stocks'] });
      queryClient.invalidateQueries({ queryKey: [api.boxes.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.boxes.stats.path] });
      toast({ title: "Success", description: "Box shipped successfully" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useCreateBox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertBox) => {
      const payload: CreateContainerParams = {
         location_id: data.locationId!,
         exemplar_quantity: data.quantity,
         tags: data.description ? [data.description] : [],
         code: data.numberInOrder?.slice(0, 8) || "B",
         images: data.productPhotos || []
      };

      const res = await fetch('/v1/warehousing/containers', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create box");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/v1/warehousing/containers-stocks'] });
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.orders.get.path] }); 
      toast({ title: "Success", description: "Box registered successfully" });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });
}

export function useBoxStats() {
    return useQuery({
        queryKey: [api.boxes.stats.path],
        queryFn: async () => {
            const res = await fetch(api.boxes.stats.path, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch stats");
            const json = await res.json();
            return api.boxes.stats.responses[200].parse(json);
        }
    });
}

export function useShippedReport(startDate: string, endDate: string) {
  return useQuery({
    queryKey: [api.boxes.shippedReport.path, startDate, endDate],
    queryFn: async () => {
      const url = new URL(api.boxes.shippedReport.path, window.location.origin);
      url.searchParams.append('startDate', startDate);
      url.searchParams.append('endDate', endDate);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch report");
      const json = await res.json();
      return api.boxes.shippedReport.responses[200].parse(json);
    },
    enabled: !!startDate && !!endDate,
  });
}

// === LOCATIONS ===
export function useLocations() {
    return useQuery({
        queryKey: ['/v1/warehousing/stores'],
        queryFn: async () => {
            const res = await fetch('/v1/warehousing/stores?limit=100');
            if (!res.ok) throw new Error("Failed to fetch locations");
            const data: StoreListResponse = await res.json();
            
            const locations: Location[] = data.stores.map((store) => ({
              id: store.id,
              name: store.code || `Location #${store.id}`,
              qrUuid: String(store.id), // Fallback since real UUID might not be provided directly in Store
              photoUrl: null,
              isActive: store.status !== 'ARCHIVED',
              createdAt: store.created_at ? new Date(store.created_at) : new Date(),
            }));
            return locations;
        }
    });
}

export function useLocationByQr(uuid: string | null) {
  return useQuery({
    queryKey: [api.locations.getByQr.path, uuid],
    queryFn: async () => {
      if (!uuid) return null;
      const url = buildUrl(api.locations.getByQr.path, { uuid });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) throw new Error("Location not found");
      if (!res.ok) throw new Error("Failed to fetch location");
      const json = await res.json();
      return api.locations.getByQr.responses[200].parse(json);
    },
    enabled: !!uuid,
    retry: false,
  });
}

// === MATERIALS ===
export function useMaterials(params?: { search?: string; type?: string }) {
    return useQuery({
        queryKey: [api.materials.list.path, params],
        queryFn: async () => {
            const url = new URL(api.materials.list.path, window.location.origin);
            if (params?.search) url.searchParams.append('search', params.search);
            if (params?.type) url.searchParams.append('type', params.type);

            const res = await fetch(url.toString(), { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch materials");
            const json = await res.json();
            return api.materials.list.responses[200].parse(json);
        }
    });
}

export function useCreateMaterial() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: InsertMaterial) => {
            const res = await fetch(api.materials.create.path, {
                method: api.materials.create.method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to create material");
            const json = await res.json();
            return api.materials.create.responses[201].parse(json);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [api.materials.list.path] });
            toast({ title: "Success", description: "Material registered" });
        },
        onError: (err) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });
}
