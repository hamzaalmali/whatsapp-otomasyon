/**
 * Single source of truth for IPC channel names and their payload/response types.
 * Imported by both the Electron main process (electron/ipc/*) and the renderer
 * (lib/ipc-client.ts) so a channel can never drift out of sync between the two sides.
 */

import type {
  SessionQrEvent,
  SessionStatusEvent,
  CampaignProgressEvent,
  UpdateStatusEvent,
} from "./types";

export const IPC_CHANNELS = {
  systemPing: "system:ping",

  updatesCheck: "updates:check",
  updatesInstall: "updates:install",
  // Pushed from main -> renderer as an update check/download progresses.
  updatesStatusEvent: "updates:status",

  sessionsList: "sessions:list",
  sessionsCreate: "sessions:create",
  sessionsRemove: "sessions:remove",
  // Pushed from main -> renderer as a session's QR code or status changes.
  sessionsQrEvent: "sessions:qr",
  sessionsStatusEvent: "sessions:status",

  campaignsList: "campaigns:list",
  campaignsDownloadTemplate: "campaigns:download-template",
  campaignsParseFile: "campaigns:parse-file",
  campaignsCreate: "campaigns:create",
  campaignsPause: "campaigns:pause",
  campaignsResume: "campaigns:resume",
  campaignsCancel: "campaigns:cancel",
  // Pushed from main -> renderer as a campaign's send progress changes.
  campaignsProgressEvent: "campaigns:progress",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export interface PingResponse {
  message: string;
  dbRowCount: number;
  respondedAt: string;
}

/** Maps each push-event channel to its payload shape, so senders and listeners can't drift. */
export interface IpcEventPayloads {
  [IPC_CHANNELS.sessionsQrEvent]: SessionQrEvent;
  [IPC_CHANNELS.sessionsStatusEvent]: SessionStatusEvent;
  [IPC_CHANNELS.campaignsProgressEvent]: CampaignProgressEvent;
  [IPC_CHANNELS.updatesStatusEvent]: UpdateStatusEvent;
}
