import type { IpcChannel } from "@/shared/ipc-contracts";

declare global {
  interface Window {
    api: {
      invoke(channel: IpcChannel, ...args: unknown[]): Promise<unknown>;
      on(channel: IpcChannel, listener: (...args: unknown[]) => void): () => void;
    };
  }
}

export {};
