import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertBox, type InsertMaterial } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";

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

// === BOXES ===
export function useBoxes() {
  return useQuery({
    queryKey: [api.boxes.list.path],
    queryFn: async () => {
      const res = await fetch(api.boxes.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch boxes");
      const json = await res.json();
      return api.boxes.list.responses[200].parse(json);
    }
  });
}

export function useShipBox() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.boxes.ship.path, { id });
      const res = await fetch(url, {
        method: api.boxes.ship.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to ship box");
      const json = await res.json();
      return api.boxes.ship.responses[200].parse(json);
    },
    onSuccess: () => {
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
      const res = await fetch(api.boxes.create.path, {
        method: api.boxes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create box");
      const json = await res.json();
      return api.boxes.create.responses[201].parse(json);
    },
    onSuccess: () => {
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

// === LOCATIONS ===
export function useLocations() {
    return useQuery({
        queryKey: [api.locations.list.path],
        queryFn: async () => {
            const res = await fetch(api.locations.list.path, { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch locations");
            const json = await res.json();
            return api.locations.list.responses[200].parse(json);
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
