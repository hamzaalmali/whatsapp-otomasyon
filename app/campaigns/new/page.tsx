"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useSessions } from "@/lib/hooks/use-sessions";
import {
  useDownloadTemplate,
  useParseRecipientsFile,
  useCreateCampaign,
} from "@/lib/hooks/use-campaigns";
import type { ImportRecipientsResult } from "@/shared/types";

export default function NewCampaignPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sessions } = useSessions();
  const connectedSessions = sessions?.filter((s) => s.status === "connected") ?? [];

  const [sessionId, setSessionId] = useState<string>("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [delayMinSec, setDelayMinSec] = useState(10);
  const [delayMaxSec, setDelayMaxSec] = useState(25);
  const [dailyCap, setDailyCap] = useState<string>("");
  const [parseResult, setParseResult] = useState<ImportRecipientsResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const downloadTemplate = useDownloadTemplate();
  const parseRecipientsFile = useParseRecipientsFile();
  const createCampaign = useCreateCampaign();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const result = await parseRecipientsFile.mutateAsync(buffer);
    setParseResult(result);
  }

  const canSubmit =
    sessionId &&
    name.trim() &&
    message.trim() &&
    parseResult &&
    parseResult.valid.length > 0 &&
    !createCampaign.isPending;

  async function handleSubmit() {
    if (!parseResult) return;
    const campaign = await createCampaign.mutateAsync({
      sessionId,
      name: name.trim(),
      messageTemplate: message,
      delayMinSec,
      delayMaxSec,
      dailyCap: dailyCap ? Number(dailyCap) : null,
      recipients: parseResult.valid.map((r) => ({ phone: r.phone, name: r.name })),
    });
    router.push(`/campaigns?highlight=${campaign.id}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-8 max-w-2xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Yeni Kampanya</h1>
        <p className="text-muted-foreground text-sm">
          Numaraları yükleyin, mesajı yazın ve gönderin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Kişi listesi</CardTitle>
          <CardDescription>
            Örnek şablonu indirip numara sütununu doldurun, sonra buradan yükleyin.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            variant="outline"
            className="self-start"
            onClick={() => downloadTemplate.mutate()}
            disabled={downloadTemplate.isPending}
          >
            <Download className="size-4" />
            Örnek Şablonu İndir
          </Button>

          <div className="flex flex-col gap-2">
            <Label htmlFor="recipients-file">Excel dosyası (.xlsx)</Label>
            <input
              ref={fileInputRef}
              id="recipients-file"
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="text-sm file:mr-3 file:rounded-md file:border file:bg-background file:px-2.5 file:py-1.5 file:text-sm"
            />
            {parseRecipientsFile.isPending && (
              <p className="text-sm text-muted-foreground">{fileName} okunuyor...</p>
            )}
          </div>

          {parseResult && (
            <div className="flex flex-col gap-2">
              <Alert>
                <CheckCircle2 className="size-4" />
                <AlertTitle>{parseResult.valid.length} geçerli numara bulundu</AlertTitle>
                {parseResult.invalid.length > 0 && (
                  <AlertDescription>
                    {parseResult.invalid.length} satır atlandı (geçersiz veya tekrarlanan numara).
                  </AlertDescription>
                )}
              </Alert>
              {parseResult.invalid.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="size-4" />
                  <AlertTitle>Atlanan satırlar</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4">
                      {parseResult.invalid.slice(0, 5).map((row) => (
                        <li key={row.row}>
                          Satır {row.row}: &quot;{row.raw}&quot; — {row.reason}
                        </li>
                      ))}
                      {parseResult.invalid.length > 5 && <li>...ve {parseResult.invalid.length - 5} tane daha</li>}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Gönderim ayarları</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Gönderen oturum</Label>
            <Select value={sessionId} onValueChange={(value) => setSessionId(value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Bağlı bir oturum seçin" />
              </SelectTrigger>
              <SelectContent>
                {connectedSessions.map((session) => (
                  <SelectItem key={session.id} value={session.id}>
                    {session.name} {session.phoneNumber ? `(+${session.phoneNumber})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {connectedSessions.length === 0 && (
              <p className="text-sm text-destructive">
                Bağlı oturum yok — önce Oturumlar sayfasından bir hesap bağlayın.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="campaign-name">Kampanya adı</Label>
            <Input
              id="campaign-name"
              placeholder="Örn. Ekim Kampanyası"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="campaign-message">Mesaj</Label>
            <Textarea
              id="campaign-message"
              placeholder="Merhaba {{isim}}, ..."
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Kişiselleştirmek için mesajın içinde {"{{isim}}"} kullanabilirsiniz.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="delay-min">Min. gecikme (sn)</Label>
              <Input
                id="delay-min"
                type="number"
                min={1}
                value={delayMinSec}
                onChange={(e) => setDelayMinSec(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="delay-max">Maks. gecikme (sn)</Label>
              <Input
                id="delay-max"
                type="number"
                min={1}
                value={delayMaxSec}
                onChange={(e) => setDelayMaxSec(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Her mesaj arasında bu aralıkta rastgele bir bekleme yapılır; spam engeline
            takılma riskini azaltmak için düşük tutmanızı öneririz.
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="daily-cap">Günlük gönderim sınırı (opsiyonel)</Label>
            <Input
              id="daily-cap"
              type="number"
              min={1}
              placeholder="ör. 200"
              value={dailyCap}
              onChange={(e) => setDailyCap(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button size="lg" onClick={handleSubmit} disabled={!canSubmit}>
        {createCampaign.isPending ? "Başlatılıyor..." : "Kampanyayı Başlat"}
      </Button>
    </div>
  );
}
