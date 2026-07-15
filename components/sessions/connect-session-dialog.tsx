"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useSessions } from "@/lib/hooks/use-sessions";
import { cn } from "@/lib/utils";

const STEPS = ["pending", "qr", "connected"] as const;

export function ConnectSessionDialog({
  sessionId,
  open,
  onOpenChange,
}: {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: sessions } = useSessions();
  const session = sessions?.find((s) => s.id === sessionId);

  useEffect(() => {
    if (session?.status === "connected") {
      const timer = setTimeout(() => onOpenChange(false), 1800);
      return () => clearTimeout(timer);
    }
  }, [session?.status, onOpenChange]);

  if (!session) return null;

  const stepIndex = session.status === "connected" ? 2 : session.status === "qr" ? 1 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{session.name}</DialogTitle>
          <DialogDescription>WhatsApp hesabınızı bağlayın</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-1.5">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center gap-1.5">
              <div
                className={cn(
                  "size-1.5 rounded-full transition-colors duration-300",
                  i <= stepIndex ? "bg-primary" : "bg-muted",
                )}
              />
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "h-px w-8 transition-colors duration-300",
                    i < stepIndex ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4 py-2">
          {session.status === "connected" ? (
            <div className="flex flex-col items-center gap-3 py-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-8" />
              </div>
              <p className="font-medium">Bağlandı!</p>
              {session.phoneNumber && (
                <p className="text-sm text-muted-foreground">+{session.phoneNumber}</p>
              )}
            </div>
          ) : session.status === "qr" && session.qrCode ? (
            <div className="relative animate-in fade-in zoom-in-95 duration-300">
              <div className="absolute -inset-3 rounded-2xl bg-primary/20 blur-xl animate-pulse" />
              {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URI, next/image adds no value here */}
              <img
                src={session.qrCode}
                alt="WhatsApp QR kodu"
                width={260}
                height={260}
                className="relative rounded-xl ring-1 ring-foreground/10"
              />
            </div>
          ) : (
            <div className="flex size-[260px] items-center justify-center rounded-xl border bg-muted/30">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center max-w-xs text-balance">
            {session.status === "connected" ? (
              "Bu oturumdan mesaj gönderip alabilirsiniz."
            ) : session.status === "qr" ? (
              <>
                WhatsApp → <strong className="text-foreground">Bağlı Cihazlar</strong> →{" "}
                <strong className="text-foreground">Cihaz Bağla</strong> ile bu kodu okutun
              </>
            ) : (
              "QR kodu hazırlanıyor..."
            )}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
