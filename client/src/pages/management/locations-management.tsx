import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation } from "@/hooks/use-warehouse";
import { useLanguage } from "@/hooks/use-language";
import { QRCodeSVG } from "qrcode.react";
import Webcam from "react-webcam";
import { 
  Plus, 
  MapPin, 
  Search, 
  QrCode, 
  Loader2,
  Edit,
  Trash2,
  PlusCircle,
  Printer,
  CheckCircle2,
  XCircle,
  Camera,
  Image as ImageIcon,
  X,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardHeader, 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertLocationSchema, type InsertLocation } from "@shared/schema";
import { Badge } from "@/components/ui/badge";

// ── Utility: inject a hidden iframe and print without opening a visible window ──
function printQRLabels(locs: Array<{ name: string; qrUuid: string | null }>) {
  const labels = locs
    .filter(l => l.qrUuid)
    .map(loc => {
      const svgEl = document.querySelector(`[data-qr-uuid="${loc.qrUuid}"]`) as SVGSVGElement | null;
      const svgData = svgEl ? new XMLSerializer().serializeToString(svgEl) : "";
      return `
        <div class="label">
          <h2>${loc.name}</h2>
          <div class="qr">${svgData}</div>
          <div class="code">${loc.qrUuid}</div>
        </div>`;
    })
    .join("");

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 16px; background: #fff; }
    .grid { display: flex; flex-wrap: wrap; gap: 16px; }
    .label { text-align: center; padding: 20px; border: 2px dashed #aaa; border-radius: 10px; width: 210px; page-break-inside: avoid; }
    .label h2 { font-size: 13px; font-weight: 700; margin-bottom: 12px; color: #111; line-height: 1.4; word-break: break-word; }
    .label .qr { display: flex; justify-content: center; margin-bottom: 10px; }
    .label .qr svg { width: 160px; height: 160px; }
    .label .code { font-family: 'Courier New', monospace; font-size: 11px; color: #555; background: #f4f4f4; padding: 4px 10px; border-radius: 5px; display: inline-block; word-break: break-all; }
    @media print { body { padding: 0; } }
  `;

  // Create a hidden iframe in the current document
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }

  doc.open();
  doc.write(`<!DOCTYPE html><html><head><style>${css}</style></head><body><div class="grid">${labels}</div></body></html>`);
  doc.close();

  // Print once the iframe content is ready
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
  // Fallback if onload already fired
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => { try { document.body.removeChild(iframe); } catch (_) {} }, 1000);
  }, 200);
}


export default function LocationsManagement() {
  const { t } = useLanguage();
  const { data: locations, isLoading } = useLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const webcamRef = useRef<Webcam>(null);

  const form = useForm<InsertLocation>({
    resolver: zodResolver(insertLocationSchema),
    defaultValues: { name: "", qrUuid: "", isActive: true, photoUrl: null },
  });

  const onSubmit = async (data: InsertLocation) => {
    try {
      if (editingLocation) {
        await updateLocation.mutateAsync({ id: editingLocation.id, data });
        setEditingLocation(null);
      } else {
        await createLocation.mutateAsync(data);
        setIsCreateOpen(false);
      }
      form.reset();
    } catch (_) {}
  };

  const handleEdit = (loc: any) => {
    if (isSelectMode) return;
    setEditingLocation(loc);
    setPhotoPreview(loc.photoUrl || null);
    setIsCameraOpen(false);
    form.reset({ name: loc.name, qrUuid: loc.qrUuid || "", isActive: loc.isActive, photoUrl: loc.photoUrl || null });
  };

  const handleCloseEdit = () => {
    setEditingLocation(null);
    setPhotoPreview(null);
    setIsCameraOpen(false);
    form.reset();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Вы уверены, что хотите удалить это место?")) {
      await deleteLocation.mutateAsync(id);
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleCapturePhoto = useCallback(() => {
    if (!webcamRef.current) return;
    const img = webcamRef.current.getScreenshot();
    if (img) { setPhotoPreview(img); setIsCameraOpen(false); }
  }, []);

  const handleSavePhoto = async () => {
    if (!editingLocation || !photoPreview) return;
    setIsSavingPhoto(true);
    try {
      await updateLocation.mutateAsync({ id: editingLocation.id, data: { photoUrl: photoPreview } });
      setEditingLocation({ ...editingLocation, photoUrl: photoPreview });
    } finally { setIsSavingPhoto(false); }
  };

  const handleDeletePhoto = async () => {
    if (!editingLocation) return;
    await updateLocation.mutateAsync({ id: editingLocation.id, data: { photoUrl: null } });
    setPhotoPreview(null);
    setEditingLocation({ ...editingLocation, photoUrl: null });
  };

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handlePrintSelected = () => {
    const locs = (locations || []).filter(l => selectedIds.has(l.id));
    printQRLabels(locs);
  };

  const handleSelectAll = () => {
    const visible = filteredLocations?.map(l => l.id) ?? [];
    if (visible.every(id => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible));
    }
  };

  const filteredLocations = locations?.filter(loc =>
    loc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    loc.qrUuid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const LocationFormFields = () => (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Название / Описание</FormLabel>
          <FormControl>
            <Input placeholder="Например: Стеллаж А, Полка 1" {...field}
              className="h-11 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-base" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="qrUuid" render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Код / UID стеллажа (для QR)</FormLabel>
          <FormControl>
            <div className="flex gap-2">
              <Input placeholder="loc-a1-s1" {...field} value={field.value || ""}
                className="h-11 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono" />
              <Button type="button" variant="outline" size="icon"
                className="h-11 w-11 shrink-0 rounded-lg border-slate-300"
                title="Сгенерировать код"
                onClick={() => form.setValue("qrUuid", `loc-${Math.random().toString(36).substring(2, 8)}`)}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </>
  );

  return (
    <div className="space-y-6">
      {/* ── Hidden QR pool (visible to DOM but invisible to user) ── */}
      <div style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", width: 0, height: 0, overflow: "hidden" }}>
        {locations?.map(loc => loc.qrUuid && (
          <QRCodeSVG
            key={loc.id}
            data-qr-uuid={loc.qrUuid}
            value={loc.qrUuid}
            size={200}
            level="M"
            includeMargin={false}
          />
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{t("nav.locations")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Управление стеллажами, полками и зонами склада</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Bulk print button */}
          {isSelectMode ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 rounded-lg text-sm font-semibold"
                onClick={handleSelectAll}
              >
                <CheckSquare className="w-4 h-4" />
                {(filteredLocations || []).every(l => selectedIds.has(l.id)) ? "Снять всё" : "Выбрать всё"}
              </Button>
              <Button
                size="sm"
                className="h-9 gap-1.5 rounded-lg text-sm font-semibold"
                disabled={selectedIds.size === 0}
                onClick={handlePrintSelected}
              >
                <Printer className="w-4 h-4" />
                Печать QR ({selectedIds.size})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 rounded-lg text-sm"
                onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}
              >
                <X className="w-4 h-4 mr-1" /> Отмена
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-lg text-sm font-semibold"
              onClick={() => setIsSelectMode(true)}
            >
              <Printer className="w-4 h-4" />
              Печать QR-кодов
            </Button>
          )}

          {/* Create */}
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) form.reset(); }}>
            <DialogTrigger asChild>
              <Button className="h-9 gap-1.5 px-4 rounded-lg shadow-sm font-semibold text-sm">
                <PlusCircle className="w-4 h-4" />
                Добавить место
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg"><MapPin className="w-4 h-4 text-primary" /></div>
                  Новое место хранения
                </DialogTitle>
                <DialogDescription className="text-sm">Введите название и идентификатор нового места.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                  <LocationFormFields />
                  <DialogFooter className="pt-2">
                    <Button type="submit" disabled={createLocation.isPending} className="w-full h-10 rounded-lg font-semibold">
                      {createLocation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Создать
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          placeholder="Поиск по названию или коду..."
          className="pl-10 h-10 rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Select mode hint */}
      {isSelectMode && (
        <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5">
          <CheckSquare className="w-4 h-4 shrink-0" />
          <span>Нажмите на карточки, чтобы выбрать места для печати QR-кодов. Выбрано: <strong>{selectedIds.size}</strong></span>
        </div>
      )}

      {/* Cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-slate-500">Загрузка мест хранения...</p>
        </div>
      ) : filteredLocations?.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl py-16 flex flex-col items-center justify-center text-center">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
            <MapPin className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">Ничего не найдено</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">Добавьте новое место или измените запрос.</p>
          {searchTerm && <Button variant="ghost" size="sm" className="mt-4" onClick={() => setSearchTerm("")}>Сбросить</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations?.map((loc) => {
            const isSelected = selectedIds.has(loc.id);
            return (
              <Card
                key={loc.id}
                className={cn(
                  "transition-all duration-150 rounded-xl border bg-white dark:bg-slate-900",
                  isSelectMode ? "cursor-pointer select-none" : "cursor-pointer hover:shadow-md hover:border-primary/40",
                  isSelected
                    ? "border-primary ring-2 ring-primary/30 shadow-md"
                    : "border-slate-200 dark:border-slate-700 shadow-sm"
                )}
                onClick={isSelectMode ? (e) => toggleSelect(loc.id, e) : () => handleEdit(loc)}
              >
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-start gap-3">
                    {isSelectMode && (
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center transition-colors",
                        isSelected ? "bg-primary border-primary" : "border-slate-300 bg-white"
                      )}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                    )}
                    {loc.photoUrl && !isSelectMode ? (
                      <img src={loc.photoUrl} alt={loc.name}
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200" />
                    ) : !isSelectMode ? (
                      <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        loc.isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                      )}>
                        <MapPin className="w-5 h-5" />
                      </div>
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h3 className={cn(
                        "font-semibold text-base truncate transition-colors",
                        isSelected ? "text-primary" : "text-slate-900 dark:text-white"
                      )}>{loc.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <QrCode className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-500 font-mono truncate">{loc.qrUuid || "—"}</span>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <Badge variant="outline" className={cn(
                      "text-xs font-medium px-2.5 py-0.5 rounded-full border",
                      loc.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                      {loc.isActive
                        ? <><CheckCircle2 className="w-3 h-3 mr-1 inline" />Активно</>
                        : <><XCircle className="w-3 h-3 mr-1 inline" />Неактивно</>}
                    </Badge>
                    {!isSelectMode && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-600"
                          onClick={(e) => { e.stopPropagation(); printQRLabels([loc]); }} title="Печать QR">
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); handleEdit(loc); }} title="Редактировать">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500"
                          onClick={(e) => { e.stopPropagation(); handleDelete(loc.id); }} title="Удалить">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {!isLoading && locations && locations.length > 0 && (
        <div className="text-xs text-slate-400 text-center pt-2">
          Всего мест: {locations.length} · Активных: {locations.filter(l => l.isActive).length}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingLocation} onOpenChange={(open) => { if (!open) handleCloseEdit(); }}>
        <DialogContent className="sm:max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg"><Edit className="w-4 h-4 text-primary" /></div>
              Редактировать место
            </DialogTitle>
            <DialogDescription className="text-sm">Измените название, код или добавьте фото.</DialogDescription>
          </DialogHeader>

          {/* QR preview */}
          {editingLocation?.qrUuid && (
            <div className="flex flex-col items-center gap-3 py-4 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <QRCodeSVG
                data-qr-uuid={`edit-${editingLocation.qrUuid}`}
                value={editingLocation.qrUuid}
                size={140}
                level="M"
                includeMargin={false}
                className="rounded"
              />
              <span className="text-xs font-mono text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                {editingLocation.qrUuid}
              </span>
              <Button type="button" variant="outline" size="sm"
                className="gap-2 h-8 rounded-lg text-xs font-semibold border-slate-300 hover:bg-primary/5 hover:border-primary hover:text-primary"
                onClick={() => printQRLabels([editingLocation])}>
                <Printer className="w-3.5 h-3.5" /> Печать QR-кода
              </Button>
            </div>
          )}

          {/* Photo section */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Фото места
            </p>

            {isCameraOpen ? (
              <div className="space-y-3 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-black">
                <div className="relative aspect-video">
                  <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                    videoConstraints={{ facingMode: { ideal: "environment" } } as any} />
                </div>
                <div className="flex gap-2 p-3 bg-white dark:bg-slate-900">
                  <Button type="button" variant="outline" className="flex-1 h-10 rounded-lg" onClick={() => setIsCameraOpen(false)}>
                    <X className="w-4 h-4 mr-2" /> Отмена
                  </Button>
                  <Button type="button" className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white" onClick={handleCapturePhoto}>
                    <Camera className="w-4 h-4 mr-2" /> Сделать фото
                  </Button>
                </div>
              </div>
            ) : photoPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                <img src={photoPreview} alt="Фото места" className="w-full h-48 object-cover" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button type="button" size="icon" variant="secondary"
                    className="h-8 w-8 rounded-lg bg-white/90 hover:bg-white shadow"
                    onClick={() => setIsCameraOpen(true)} title="Переснять">
                    <Camera className="w-3.5 h-3.5 text-slate-700" />
                  </Button>
                  <Button type="button" size="icon" variant="secondary"
                    className="h-8 w-8 rounded-lg bg-white/90 hover:bg-red-50 shadow"
                    onClick={handleDeletePhoto} title="Удалить фото">
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </Button>
                </div>
                {photoPreview !== editingLocation?.photoUrl && (
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                    <Button type="button" size="sm" className="h-8 rounded-lg shadow-lg gap-2 font-semibold"
                      disabled={isSavingPhoto} onClick={handleSavePhoto}>
                      {isSavingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Сохранить фото
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Button type="button" variant="outline"
                className="w-full h-28 flex flex-col gap-2 border-dashed border-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
                onClick={() => setIsCameraOpen(true)}>
                <Camera className="w-6 h-6" />
                <span className="text-sm">Сделать фото места</span>
              </Button>
            )}
          </div>

          {/* Edit form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <LocationFormFields />
              <DialogFooter className="pt-2">
                <Button type="submit" disabled={updateLocation.isPending} className="flex-1 h-10 rounded-lg font-semibold">
                  {updateLocation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Сохранить изменения
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
