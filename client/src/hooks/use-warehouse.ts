import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertBox, type InsertMaterial } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

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
      return api.orders.list.responses[200].parse(await res.json());
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
      return api.orders.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

// === BOXES ===
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
      return api.boxes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.orders.list.path] });
      // Invalidate specific order query if we knew the ID, but global invalidation is safer for now
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
            return api.boxes.stats.responses[200].parse(await res.json());
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
            return api.locations.list.responses[200].parse(await res.json());
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
      return api.locations.getByQr.responses[200].parse(await res.json());
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
            return api.materials.list.responses[200].parse(await res.json());
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
            return api.materials.create.responses[201].parse(await res.json());
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
