"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pause, Play, X, Send } from "lucide-react";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { usePauseCampaign, useResumeCampaign, useCancelCampaign } from "@/lib/hooks/use-campaigns";
import { cn } from "@/lib/utils";
import type { CampaignDTO } from "@/shared/types";

export function CampaignCard({ campaign }: { campaign: CampaignDTO }) {
  const pauseCampaign = usePauseCampaign();
  const resumeCampaign = useResumeCampaign();
  const cancelCampaign = useCancelCampaign();

  const total = campaign.totalCount || 1;
  const sentPct = (campaign.sentCount / total) * 100;
  const failedPct = (campaign.failedCount / total) * 100;

  const canPause = campaign.status === "running";
  const canResume = campaign.status === "paused";
  const canCancel = campaign.status === "running" || campaign.status === "paused";

  return (
    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-chart-2/15 text-chart-2">
            <Send className="size-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{campaign.name}</CardTitle>
            <p className="text-sm text-muted-foreground truncate">{campaign.sessionName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {campaign.status === "running" && (
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          )}
          <CampaignStatusBadge status={campaign.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted flex">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${sentPct}%` }}
          />
          <div
            className="h-full bg-destructive transition-all duration-500"
            style={{ width: `${failedPct}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {campaign.sentCount + campaign.failedCount}/{campaign.totalCount} tamamlandı —{" "}
          <span className={cn(campaign.sentCount > 0 && "text-foreground")}>
            {campaign.sentCount} gönderildi
          </span>
          {campaign.failedCount > 0 && (
            <span className="text-destructive">, {campaign.failedCount} başarısız</span>
          )}
        </p>

        <div className="flex gap-2">
          {canPause && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => pauseCampaign.mutate(campaign.id)}
              disabled={pauseCampaign.isPending}
            >
              <Pause className="size-4" />
              Duraklat
            </Button>
          )}
          {canResume && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => resumeCampaign.mutate(campaign.id)}
              disabled={resumeCampaign.isPending}
            >
              <Play className="size-4" />
              Devam Et
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelCampaign.mutate(campaign.id)}
              disabled={cancelCampaign.isPending}
            >
              <X className="size-4" />
              İptal
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
