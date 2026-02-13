import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCompleteOrder } from "@/hooks/use-warehouse";

export default function OrdersList() {
  const { data: orders, isLoading } = useQuery({
    queryKey: [api.orders.list.path],
  });
  const completeOrder = useCompleteOrder();

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
        <h1 className="text-3xl font-bold tracking-tight">Orders Management</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.number}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>
                    <Badge variant={order.status === "active" ? "default" : "secondary"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(order.createdAt!).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    {order.status === "active" && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="h-8 gap-1.5"
                        onClick={() => completeOrder.mutate(order.id)}
                        disabled={completeOrder.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
