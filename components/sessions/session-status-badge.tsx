import { Badge } from "@/components/ui/badge";
import type { SessionStatus } from "@/shared/types";

const STATUS_LABEL: Record<SessionStatus, string> = {
  pending: "Başlatılıyor",
  qr: "QR bekleniyor",
  connected: "Bağlı",
  disconnected: "Bağlantı kesildi",
};

const STATUS_VARIANT: Record<SessionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  qr: "secondary",
  connected: "default",
  disconnected: "destructive",
};

export function SessionStatusBadge({ status }: { status: SessionStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
