import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.general")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t("settings.org_name")}</Label>
            <Input defaultValue="PrintLogix Warehouse" />
          </div>

          <div className="space-y-2">
            <Label>{t("settings.language")}</Label>
            <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ru">Русский</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="h-12 px-8">{t("settings.save")}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
