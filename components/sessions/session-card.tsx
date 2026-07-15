"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, Smartphone, QrCode } from "lucide-react";
import { SessionStatusBadge } from "@/components/sessions/session-status-badge";
import { useRemoveSession } from "@/lib/hooks/use-sessions";
import type { SessionDTO } from "@/shared/types";

export function SessionCard({
  session,
  onOpenConnect,
}: {
  session: SessionDTO;
  onOpenConnect: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const removeSession = useRemoveSession();

  return (
    <Card className="transition-all hover:shadow-md hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-1 duration-300">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Smartphone className="size-4.5" />
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate">{session.name}</CardTitle>
            {session.phoneNumber && (
              <p className="text-sm text-muted-foreground truncate">+{session.phoneNumber}</p>
            )}
          </div>
        </div>
        <SessionStatusBadge status={session.status} />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {(session.status === "qr" || session.status === "pending") && (
          <button
            type="button"
            onClick={onOpenConnect}
            className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-3 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
          >
            {session.status === "qr" ? (
              <QrCode className="size-4 text-primary" />
            ) : (
              <Loader2 className="size-4 animate-spin" />
            )}
            {session.status === "qr" ? "QR kodunu göster ve okut" : "QR kodu hazırlanıyor..."}
          </button>
        )}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger render={<Button variant="outline" size="sm" className="self-start" />}>
            <Trash2 className="size-4" />
            Kaldır
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Oturumu kaldır</AlertDialogTitle>
              <AlertDialogDescription>
                &quot;{session.name}&quot; oturumu kaldırılacak ve WhatsApp bağlantısı kesilecek.
                Bu işlem geri alınamaz, tekrar bağlanmak için yeniden QR okutmanız gerekir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Vazgeç</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => removeSession.mutate(session.id)}
                disabled={removeSession.isPending}
              >
                Kaldır
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
