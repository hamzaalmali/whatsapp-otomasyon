"use client";

import Link from "next/link";
import { useCampaigns } from "@/lib/hooks/use-campaigns";
import { CampaignCard } from "@/components/campaigns/campaign-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Send } from "lucide-react";

export default function CampaignsPage() {
  const { data: campaigns, isPending, isError, error } = useCampaigns();

  return (
    <div className="flex flex-1 flex-col gap-6 p-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kampanyalar</h1>
          <p className="text-muted-foreground text-sm">Toplu mesaj gönderimlerinizi yönetin.</p>
        </div>
        <Button nativeButton={false} render={<Link href="/campaigns/new" />}>
          <Plus className="size-4" />
          Yeni Kampanya
        </Button>
      </div>

      {isPending && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive">
          Kampanyalar yüklenemedi: {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {campaigns && campaigns.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center animate-in fade-in duration-300">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Send className="size-6" />
          </div>
          <div>
            <p className="font-medium">Henüz bir kampanya yok</p>
            <p className="text-sm text-muted-foreground mt-1">
              Başlamak için &quot;Yeni Kampanya&quot; butonuna tıklayın.
            </p>
          </div>
        </div>
      )}

      {campaigns && campaigns.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign, i) => (
            <div key={campaign.id} style={{ animationDelay: `${i * 40}ms` }}>
              <CampaignCard campaign={campaign} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
