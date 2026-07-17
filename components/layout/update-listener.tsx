"use client";

import { toast } from "sonner";
import { IPC_CHANNELS } from "@/shared/ipc-contracts";
import { useIpcEvent } from "@/lib/hooks/use-ipc-event";
import { ipc } from "@/lib/ipc-client";

export function UpdateListener() {
  useIpcEvent(IPC_CHANNELS.updatesStatusEvent, (event) => {
    if (event.status === "downloaded") {
      toast.success(`Güncelleme hazır (v${event.version})`, {
        description: "Yeniden başlatmak için tıklayın.",
        duration: Infinity,
        action: {
          label: "Yeniden Başlat",
          onClick: () => ipc.updates.install(),
        },
      });
    } else if (event.status === "error") {
      toast.error("Güncelleme kontrolü başarısız oldu", {
        description: event.message,
      });
    }
  });

  return null;
}
