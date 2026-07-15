"use client";

import { useState } from "react";
import { useSessions } from "@/lib/hooks/use-sessions";
import { NewSessionDialog } from "@/components/sessions/new-session-dialog";
import { SessionCard } from "@/components/sessions/session-card";
import { ConnectSessionDialog } from "@/components/sessions/connect-session-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Smartphone } from "lucide-react";

export default function SessionsPage() {
  const { data: sessions, isPending, isError, error } = useSessions();
  const [connectSessionId, setConnectSessionId] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col gap-6 p-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Oturumlar</h1>
          <p className="text-muted-foreground text-sm">
            WhatsApp hesaplarınızı bağlayın ve yönetin.
          </p>
        </div>
        <NewSessionDialog onCreated={setConnectSessionId} />
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
          Oturumlar yüklenemedi: {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {sessions && sessions.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center animate-in fade-in duration-300">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Smartphone className="size-6" />
          </div>
          <div>
            <p className="font-medium">Henüz bir oturum yok</p>
            <p className="text-sm text-muted-foreground mt-1">
              Başlamak için &quot;Yeni Oturum&quot; butonuna tıklayın.
            </p>
          </div>
        </div>
      )}

      {sessions && sessions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session, i) => (
            <div key={session.id} style={{ animationDelay: `${i * 40}ms` }}>
              <SessionCard session={session} onOpenConnect={() => setConnectSessionId(session.id)} />
            </div>
          ))}
        </div>
      )}

      <ConnectSessionDialog
        sessionId={connectSessionId}
        open={connectSessionId !== null}
        onOpenChange={(open) => !open && setConnectSessionId(null)}
      />
    </div>
  );
}
