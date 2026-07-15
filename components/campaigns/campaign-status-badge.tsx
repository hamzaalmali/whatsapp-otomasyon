import { Badge } from "@/components/ui/badge";
import type { CampaignStatus } from "@/shared/types";

const STATUS_LABEL: Record<CampaignStatus, string> = {
  draft: "Taslak",
  running: "Gönderiliyor",
  paused: "Duraklatıldı",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};

const STATUS_VARIANT: Record<CampaignStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  running: "default",
  paused: "secondary",
  completed: "secondary",
  cancelled: "destructive",
};

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
