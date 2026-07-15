"use client";

import Link from "next/link";
import { useSessions } from "@/lib/hooks/use-sessions";
import { useCampaigns } from "@/lib/hooks/use-campaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { SessionStatusBadge } from "@/components/sessions/session-status-badge";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { Smartphone, Send, CheckCircle2, Clock, Plus, ArrowRight } from "lucide-react";

export default function Home() {
  const { data: sessions } = useSessions();
  const { data: campaigns } = useCampaigns();

  const connected = sessions?.filter((s) => s.status === "connected").length ?? 0;
  const totalSessions = sessions?.length ?? 0;
  const running = campaigns?.filter((c) => c.status === "running").length ?? 0;
  const totalSent = campaigns?.reduce((sum, c) => sum + c.sentCount, 0) ?? 0;
  const totalPending = campaigns?.reduce((sum, c) => sum + c.pendingCount, 0) ?? 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-8 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Genel Bakış</h1>
          <p className="text-muted-foreground text-sm">
            WhatsApp otomasyon hesaplarınızın ve kampanyalarınızın özeti.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/sessions" />}>
            <Smartphone className="size-4" />
            Oturum Ekle
          </Button>
          <Button nativeButton={false} render={<Link href="/campaigns/new" />}>
            <Plus className="size-4" />
            Yeni Kampanya
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Smartphone}
          label="Bağlı Oturum"
          value={`${connected}/${totalSessions}`}
          accentClassName="bg-primary/10 text-primary"
        />
        <StatCard
          icon={Send}
          label="Aktif Kampanya"
          value={running}
          accentClassName="bg-chart-2/15 text-chart-2"
        />
        <StatCard
          icon={CheckCircle2}
          label="Gönderilen Mesaj"
          value={totalSent}
          accentClassName="bg-chart-3/15 text-chart-3"
        />
        <StatCard
          icon={Clock}
          label="Bekleyen Mesaj"
          value={totalPending}
          accentClassName="bg-muted text-muted-foreground"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Oturumlar</CardTitle>
            <Link
              href="/sessions"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Tümü <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {!sessions || sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Henüz oturum yok.{" "}
                <Link href="/sessions" className="text-primary hover:underline">
                  Bir tane ekleyin.
                </Link>
              </p>
            ) : (
              sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/60 transition-colors"
                >
                  <span className="text-sm font-medium truncate">{session.name}</span>
                  <SessionStatusBadge status={session.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Kampanyalar</CardTitle>
            <Link
              href="/campaigns"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              Tümü <ArrowRight className="size-3.5" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {!campaigns || campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Henüz kampanya yok.{" "}
                <Link href="/campaigns/new" className="text-primary hover:underline">
                  Bir tane oluşturun.
                </Link>
              </p>
            ) : (
              campaigns.slice(0, 5).map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/60 transition-colors"
                >
                  <span className="text-sm font-medium truncate">{campaign.name}</span>
                  <CampaignStatusBadge status={campaign.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
