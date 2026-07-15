import { IPC_CHANNELS, type PingResponse } from "@/shared/ipc-contracts";
import type {
  SessionDTO,
  CampaignDTO,
  CreateCampaignInput,
  DownloadTemplateResult,
  ImportRecipientsResult,
} from "@/shared/types";

function getApi() {
  if (typeof window === "undefined" || !window.api) {
    throw new Error("window.api is not available (not running inside the Electron renderer)");
  }
  return window.api;
}

export const ipc = {
  ping: () => getApi().invoke(IPC_CHANNELS.systemPing) as Promise<PingResponse>,
  sessions: {
    list: () => getApi().invoke(IPC_CHANNELS.sessionsList) as Promise<SessionDTO[]>,
    create: (name: string) => getApi().invoke(IPC_CHANNELS.sessionsCreate, name) as Promise<SessionDTO>,
    remove: (id: string) => getApi().invoke(IPC_CHANNELS.sessionsRemove, id) as Promise<void>,
  },
  campaigns: {
    list: () => getApi().invoke(IPC_CHANNELS.campaignsList) as Promise<CampaignDTO[]>,
    downloadTemplate: () =>
      getApi().invoke(IPC_CHANNELS.campaignsDownloadTemplate) as Promise<DownloadTemplateResult>,
    parseFile: (data: ArrayBuffer) =>
      getApi().invoke(IPC_CHANNELS.campaignsParseFile, data) as Promise<ImportRecipientsResult>,
    create: (input: CreateCampaignInput) =>
      getApi().invoke(IPC_CHANNELS.campaignsCreate, input) as Promise<CampaignDTO>,
    pause: (id: string) => getApi().invoke(IPC_CHANNELS.campaignsPause, id) as Promise<void>,
    resume: (id: string) => getApi().invoke(IPC_CHANNELS.campaignsResume, id) as Promise<void>,
    cancel: (id: string) => getApi().invoke(IPC_CHANNELS.campaignsCancel, id) as Promise<void>,
  },
};
