export type SessionStatus = "pending" | "qr" | "connected" | "disconnected";

export interface SessionDTO {
  id: string;
  name: string;
  phoneNumber: string | null;
  status: SessionStatus;
  qrCode: string | null;
  createdAt: string;
  lastConnectedAt: string | null;
}

export interface SessionQrEvent {
  sessionId: string;
  qrDataUrl: string;
  attempt: number;
}

export interface SessionStatusEvent {
  sessionId: string;
  status: SessionStatus;
  phoneNumber: string | null;
}

export type CampaignStatus = "draft" | "running" | "paused" | "completed" | "cancelled";

export interface CampaignDTO {
  id: string;
  sessionId: string;
  sessionName: string;
  name: string;
  messageTemplate: string;
  status: CampaignStatus;
  delayMinSec: number;
  delayMaxSec: number;
  dailyCap: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  totalCount: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
}

export interface CampaignProgressEvent {
  campaignId: string;
  status: CampaignStatus;
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export interface RecipientInput {
  phone: string;
  name: string | null;
}

export interface CreateCampaignInput {
  sessionId: string;
  name: string;
  messageTemplate: string;
  delayMinSec: number;
  delayMaxSec: number;
  dailyCap: number | null;
  recipients: RecipientInput[];
}

export interface ParsedRecipientRow {
  row: number;
  phone: string;
  name: string | null;
}

export interface InvalidRecipientRow {
  row: number;
  raw: string;
  reason: string;
}

export interface ImportRecipientsResult {
  valid: ParsedRecipientRow[];
  invalid: InvalidRecipientRow[];
}

export interface DownloadTemplateResult {
  saved: boolean;
  filePath?: string;
}

export type UpdateStatus =
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateStatusEvent {
  status: UpdateStatus;
  version?: string;
  percent?: number;
  message?: string;
}
