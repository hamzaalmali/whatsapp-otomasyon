import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { IPC_CHANNELS, type IpcChannel } from "../shared/ipc-contracts";

const ALLOWED_CHANNELS = new Set<string>(Object.values(IPC_CHANNELS));

function assertAllowed(channel: string): asserts channel is IpcChannel {
  if (!ALLOWED_CHANNELS.has(channel)) {
    throw new Error(`Blocked IPC access on unregistered channel: ${channel}`);
  }
}

function invoke(channel: IpcChannel, ...args: unknown[]): Promise<unknown> {
  assertAllowed(channel);
  return ipcRenderer.invoke(channel, ...args);
}

function on(channel: IpcChannel, listener: (...args: unknown[]) => void): () => void {
  assertAllowed(channel);
  const wrapped = (_event: IpcRendererEvent, ...args: unknown[]) => listener(...args);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

const api = { invoke, on };

export type ElectronApi = typeof api;

contextBridge.exposeInMainWorld("api", api);
