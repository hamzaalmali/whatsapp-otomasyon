"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ipc } from "@/lib/ipc-client";
import { useIpcEvent } from "@/lib/hooks/use-ipc-event";
import { IPC_CHANNELS } from "@/shared/ipc-contracts";
import type { CampaignDTO } from "@/shared/types";

const CAMPAIGNS_QUERY_KEY = ["campaigns"];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useCampaigns() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CAMPAIGNS_QUERY_KEY,
    queryFn: () => ipc.campaigns.list(),
  });

  useIpcEvent(IPC_CHANNELS.campaignsProgressEvent, (event) => {
    const previous = queryClient
      .getQueryData<CampaignDTO[]>(CAMPAIGNS_QUERY_KEY)
      ?.find((c) => c.id === event.campaignId);

    queryClient.setQueryData<CampaignDTO[]>(CAMPAIGNS_QUERY_KEY, (old) =>
      old?.map((campaign) =>
        campaign.id === event.campaignId
          ? {
              ...campaign,
              status: event.status,
              totalCount: event.total,
              sentCount: event.sent,
              failedCount: event.failed,
              pendingCount: event.pending,
            }
          : campaign,
      ),
    );

    if (previous && previous.status !== "completed" && event.status === "completed") {
      toast.success(`"${previous.name}" kampanyası tamamlandı (${event.sent} mesaj gönderildi)`);
    } else if (previous && previous.status === "running" && event.status === "paused") {
      toast.warning(`"${previous.name}" duraklatıldı — oturum bağlantısını kontrol edin`);
    }
  });

  return query;
}

export function useDownloadTemplate() {
  return useMutation({
    mutationFn: () => ipc.campaigns.downloadTemplate(),
    onSuccess: (result) => {
      if (result.saved) toast.success("Şablon kaydedildi");
    },
    onError: (error) => toast.error(`Şablon indirilemedi: ${errorMessage(error)}`),
  });
}

export function useParseRecipientsFile() {
  return useMutation({
    mutationFn: (data: ArrayBuffer) => ipc.campaigns.parseFile(data),
    onError: (error) => toast.error(`Dosya okunamadı: ${errorMessage(error)}`),
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ipc.campaigns.create,
    onSuccess: (campaign) => {
      queryClient.setQueryData<CampaignDTO[]>(CAMPAIGNS_QUERY_KEY, (old) =>
        old ? [campaign, ...old] : [campaign],
      );
      toast.success(`"${campaign.name}" kampanyası başlatıldı`);
    },
    onError: (error) => toast.error(`Kampanya başlatılamadı: ${errorMessage(error)}`),
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc.campaigns.pause(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<CampaignDTO[]>(CAMPAIGNS_QUERY_KEY, (old) =>
        old?.map((c) => (c.id === id ? { ...c, status: "paused" } : c)),
      );
    },
    onError: (error) => toast.error(`Duraklatılamadı: ${errorMessage(error)}`),
  });
}

export function useResumeCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc.campaigns.resume(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<CampaignDTO[]>(CAMPAIGNS_QUERY_KEY, (old) =>
        old?.map((c) => (c.id === id ? { ...c, status: "running" } : c)),
      );
    },
    onError: (error) => toast.error(`Devam ettirilemedi: ${errorMessage(error)}`),
  });
}

export function useCancelCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc.campaigns.cancel(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<CampaignDTO[]>(CAMPAIGNS_QUERY_KEY, (old) =>
        old?.map((c) => (c.id === id ? { ...c, status: "cancelled" } : c)),
      );
      toast("Kampanya iptal edildi");
    },
    onError: (error) => toast.error(`İptal edilemedi: ${errorMessage(error)}`),
  });
}
