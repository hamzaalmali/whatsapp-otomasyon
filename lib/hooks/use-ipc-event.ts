"use client";

import { useEffect, useRef } from "react";
import type { IpcEventPayloads } from "@/shared/ipc-contracts";

export function useIpcEvent<K extends keyof IpcEventPayloads>(
  channel: K,
  handler: (payload: IpcEventPayloads[K]) => void,
): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const unsubscribe = window.api.on(channel, (payload) => {
      handlerRef.current(payload as IpcEventPayloads[K]);
    });
    return unsubscribe;
  }, [channel]);
}
