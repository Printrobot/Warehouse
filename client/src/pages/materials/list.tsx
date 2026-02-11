import { LayoutShell } from "@/components/layout-shell";
import { useMaterials } from "@/hooks/use-warehouse";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function MaterialsList() {
    const [search, setSearch] = useState("");
    const { data: materials, isLoading } = useMaterials({ search });

    return (
        <LayoutShell>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold">Materials Inventory</h1>
                    <p className="text-muted-foreground">Manage raw materials and client-supplied stock.</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" /> Add Material
                </Button>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input 
                        placeholder="Search materials by description or counterparty..." 
                        className="pl-10 h-12 bg-white dark:bg-slate-900"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Loading inventory...</div>
            ) : (
                <div className="grid gap-4">
                    {materials?.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="capitalize">{item.type.replace('_', ' ')}</Badge>
                                        <span className="text-xs text-muted-foreground">ID: {item.id}</span>
                                    </div>
                                    <h3 className="font-bold text-lg">{item.description}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        {item.counterparty ? `${item.counterparty} • ` : ''} 
                                        Qty: <span className="text-foreground font-medium">{item.quantity} {item.unit}</span>
                                    </p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <Badge className={item.status === 'in_stock' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800'}>
                                        {item.status === 'in_stock' ? 'In Stock' : 'Issued'}
                                    </Badge>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        Added {new Date(item.createdAt!).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {materials?.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">No materials found matching your search.</div>
                    )}
                </div>
            )}
        </LayoutShell>
    );
}
