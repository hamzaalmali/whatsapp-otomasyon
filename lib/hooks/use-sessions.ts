"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ipc } from "@/lib/ipc-client";
import { useIpcEvent } from "@/lib/hooks/use-ipc-event";
import { IPC_CHANNELS } from "@/shared/ipc-contracts";
import type { SessionDTO } from "@/shared/types";

const SESSIONS_QUERY_KEY = ["sessions"];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useSessions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: () => ipc.sessions.list(),
  });

  useIpcEvent(IPC_CHANNELS.sessionsQrEvent, (event) => {
    queryClient.setQueryData<SessionDTO[]>(SESSIONS_QUERY_KEY, (old) =>
      old?.map((session) =>
        session.id === event.sessionId
          ? { ...session, status: "qr", qrCode: event.qrDataUrl }
          : session,
      ),
    );
  });

  useIpcEvent(IPC_CHANNELS.sessionsStatusEvent, (event) => {
    const previous = queryClient
      .getQueryData<SessionDTO[]>(SESSIONS_QUERY_KEY)
      ?.find((s) => s.id === event.sessionId);

    queryClient.setQueryData<SessionDTO[]>(SESSIONS_QUERY_KEY, (old) =>
      old?.map((session) =>
        session.id === event.sessionId
          ? {
              ...session,
              status: event.status,
              phoneNumber: event.phoneNumber ?? session.phoneNumber,
              qrCode: event.status === "connected" ? null : session.qrCode,
            }
          : session,
      ),
    );

    if (previous && previous.status !== "connected" && event.status === "connected") {
      toast.success(`"${previous.name}" bağlandı`);
    } else if (previous && previous.status === "connected" && event.status === "disconnected") {
      toast.error(`"${previous.name}" bağlantısı kesildi`);
    }
  });

  return query;
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => ipc.sessions.create(name),
    onSuccess: (session) => {
      queryClient.setQueryData<SessionDTO[]>(SESSIONS_QUERY_KEY, (old) =>
        old ? [...old, session] : [session],
      );
      toast.success(`"${session.name}" oturumu oluşturuldu, QR kod bekleniyor`);
    },
    onError: (error) => toast.error(`Oturum oluşturulamadı: ${errorMessage(error)}`),
  });
}

export function useReconnectSession() {
  return useMutation({
    mutationFn: (id: string) => ipc.sessions.reconnect(id),
    onSuccess: () => toast.success("Yeniden bağlanılıyor, QR kod bekleniyor"),
    onError: (error) => toast.error(`Yeniden bağlanılamadı: ${errorMessage(error)}`),
  });
}

export function useRemoveSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ipc.sessions.remove(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<SessionDTO[]>(SESSIONS_QUERY_KEY, (old) =>
        old?.filter((session) => session.id !== id),
      );
      toast.success("Oturum kaldırıldı");
    },
    onError: (error) => toast.error(`Oturum kaldırılamadı: ${errorMessage(error)}`),
  });
}
