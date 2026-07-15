import { ipcMain, dialog } from "electron";
import fs from "node:fs/promises";
import log from "electron-log/main";
import { IPC_CHANNELS } from "../../shared/ipc-contracts";
import type {
  CampaignDTO,
  CampaignStatus,
  CreateCampaignInput,
  DownloadTemplateResult,
  ImportRecipientsResult,
} from "../../shared/types";
import { getDb } from "../db/client";
import { generateTemplateBuffer, parseRecipientsFile } from "../services/campaigns/excel-template";
import { getCampaignCounts } from "../services/campaigns/campaign-summary";
import {
  startCampaignWorker,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
} from "../services/campaigns/campaign-worker";

async function toCampaignDTO(campaign: {
  id: string;
  sessionId: string;
  session: { name: string };
  name: string;
  messageTemplate: string;
  status: string;
  delayMinSec: number;
  delayMaxSec: number;
  dailyCap: number | null;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
}): Promise<CampaignDTO> {
  const counts = await getCampaignCounts(campaign.id);
  return {
    id: campaign.id,
    sessionId: campaign.sessionId,
    sessionName: campaign.session.name,
    name: campaign.name,
    messageTemplate: campaign.messageTemplate,
    status: campaign.status as CampaignStatus,
    delayMinSec: campaign.delayMinSec,
    delayMaxSec: campaign.delayMaxSec,
    dailyCap: campaign.dailyCap,
    createdAt: campaign.createdAt.toISOString(),
    startedAt: campaign.startedAt?.toISOString() ?? null,
    completedAt: campaign.completedAt?.toISOString() ?? null,
    totalCount: counts.total,
    sentCount: counts.sent,
    failedCount: counts.failed,
    pendingCount: counts.pending,
  };
}

export function registerCampaignsIpc(): void {
  ipcMain.handle(IPC_CHANNELS.campaignsList, async (): Promise<CampaignDTO[]> => {
    const db = getDb();
    const campaigns = await db.campaign.findMany({
      orderBy: { createdAt: "desc" },
      include: { session: true },
    });
    return Promise.all(campaigns.map(toCampaignDTO));
  });

  ipcMain.handle(
    IPC_CHANNELS.campaignsDownloadTemplate,
    async (): Promise<DownloadTemplateResult> => {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: "Örnek Excel Şablonunu Kaydet",
        defaultPath: "whatsapp-kampanya-sablonu.xlsx",
        filters: [{ name: "Excel", extensions: ["xlsx"] }],
      });
      if (canceled || !filePath) return { saved: false };

      const buffer = await generateTemplateBuffer();
      await fs.writeFile(filePath, buffer);
      return { saved: true, filePath };
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.campaignsParseFile,
    async (_event, data: ArrayBuffer): Promise<ImportRecipientsResult> => {
      return parseRecipientsFile(Buffer.from(data));
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.campaignsCreate,
    async (_event, input: CreateCampaignInput): Promise<CampaignDTO> => {
      const db = getDb();
      const campaign = await db.campaign.create({
        data: {
          sessionId: input.sessionId,
          name: input.name,
          messageTemplate: input.messageTemplate,
          delayMinSec: input.delayMinSec,
          delayMaxSec: input.delayMaxSec,
          dailyCap: input.dailyCap,
          status: "running",
          startedAt: new Date(),
          recipients: {
            create: input.recipients.map((recipient) => ({
              phone: recipient.phone,
              name: recipient.name,
            })),
          },
        },
        include: { session: true },
      });

      startCampaignWorker(campaign.id).catch((err) =>
        log.error(`[campaign:${campaign.id}] failed to start`, err),
      );

      return toCampaignDTO(campaign);
    },
  );

  ipcMain.handle(IPC_CHANNELS.campaignsPause, async (_event, id: string): Promise<void> => {
    pauseCampaign(id);
    const db = getDb();
    await db.campaign.update({ where: { id }, data: { status: "paused" } });
  });

  ipcMain.handle(IPC_CHANNELS.campaignsResume, async (_event, id: string): Promise<void> => {
    await resumeCampaign(id);
  });

  ipcMain.handle(IPC_CHANNELS.campaignsCancel, async (_event, id: string): Promise<void> => {
    cancelCampaign(id);
    const db = getDb();
    await db.campaign.update({ where: { id }, data: { status: "cancelled" } });
  });
}
