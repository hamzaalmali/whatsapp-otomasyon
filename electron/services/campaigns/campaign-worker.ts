import log from "electron-log/main";
import { getDb } from "../../db/client";
import { sendToRenderer } from "../../ipc/broadcast";
import { IPC_CHANNELS } from "../../../shared/ipc-contracts";
import type { CampaignStatus } from "../../../shared/types";
import { getClient } from "../whatsapp/session-manager";
import { renderTemplate } from "./template-renderer";
import { getCampaignCounts } from "./campaign-summary";

// Periodic longer pause to look less like a bot hammering sends at a fixed
// cadence — not user-configurable yet, see plan risk #3 (ban-risk defaults).
const REST_EVERY_N_MESSAGES = 20;
const REST_DURATION_RANGE_MS: [number, number] = [60_000, 120_000];

interface WorkerState {
  paused: boolean;
  cancelled: boolean;
}

const activeWorkers = new Map<string, WorkerState>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelayMs(minSec: number, maxSec: number): number {
  const minMs = Math.max(1, minSec) * 1000;
  const maxMs = Math.max(minMs, maxSec * 1000);
  return minMs + Math.random() * (maxMs - minMs);
}

/**
 * On app startup, resumeRunningCampaigns() and session reconnection both
 * kick off concurrently — a session that was connected before restart takes
 * a few seconds to reconnect. Give it a grace window instead of immediately
 * pausing the campaign the instant the worker loop starts.
 */
async function waitForClient(sessionId: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let client = getClient(sessionId);
  while (!client && Date.now() < deadline) {
    await sleep(2000);
    client = getClient(sessionId);
  }
  return client;
}

async function reportProgress(campaignId: string): Promise<void> {
  const db = getDb();
  const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;
  const counts = await getCampaignCounts(campaignId);
  sendToRenderer(IPC_CHANNELS.campaignsProgressEvent, {
    campaignId,
    status: campaign.status as CampaignStatus,
    ...counts,
  });
}

export async function startCampaignWorker(campaignId: string): Promise<void> {
  if (activeWorkers.has(campaignId)) return;
  const state: WorkerState = { paused: false, cancelled: false };
  activeWorkers.set(campaignId, state);

  const db = getDb();

  // A recipient can be left stuck in "sending" if the app was force-killed
  // mid-send (crash, not a graceful quit) — the pending-lookup below would
  // otherwise skip it forever. Requeue it so it's retried.
  await db.campaignRecipient.updateMany({
    where: { campaignId, status: "sending" },
    data: { status: "pending" },
  });

  try {
    let sentSinceRest = 0;

    while (true) {
      if (state.cancelled) break;
      if (state.paused) {
        await sleep(1000);
        continue;
      }

      const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
      if (!campaign || campaign.status !== "running") break;

      if (campaign.dailyCap) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const sentToday = await db.campaignRecipient.count({
          where: { campaignId, status: "sent", sentAt: { gte: startOfDay } },
        });
        if (sentToday >= campaign.dailyCap) {
          await db.campaign.update({ where: { id: campaignId }, data: { status: "paused" } });
          log.info(`[campaign:${campaignId}] daily cap reached, pausing`);
          break;
        }
      }

      const recipient = await db.campaignRecipient.findFirst({
        where: { campaignId, status: "pending" },
        orderBy: { id: "asc" },
      });

      if (!recipient) {
        await db.campaign.update({
          where: { id: campaignId },
          data: { status: "completed", completedAt: new Date() },
        });
        log.info(`[campaign:${campaignId}] completed`);
        break;
      }

      const client = await waitForClient(campaign.sessionId, 30_000);
      if (!client) {
        await db.campaign.update({ where: { id: campaignId }, data: { status: "paused" } });
        log.error(`[campaign:${campaignId}] session ${campaign.sessionId} not connected, pausing`);
        break;
      }

      await db.campaignRecipient.update({ where: { id: recipient.id }, data: { status: "sending" } });

      try {
        const variables = JSON.parse(recipient.variables || "{}");
        const message = renderTemplate(campaign.messageTemplate, {
          name: recipient.name,
          phone: recipient.phone,
          variables,
        });
        await client.sendText(`${recipient.phone}@c.us`, message);
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "sent", sentAt: new Date() },
        });
      } catch (error) {
        await db.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: "failed", error: error instanceof Error ? error.message : String(error) },
        });
        log.error(`[campaign:${campaignId}] failed to send to ${recipient.phone}`, error);
      }

      await reportProgress(campaignId);
      sentSinceRest++;

      if (sentSinceRest >= REST_EVERY_N_MESSAGES) {
        sentSinceRest = 0;
        const restMs =
          REST_DURATION_RANGE_MS[0] + Math.random() * (REST_DURATION_RANGE_MS[1] - REST_DURATION_RANGE_MS[0]);
        log.info(`[campaign:${campaignId}] resting ${Math.round(restMs / 1000)}s`);
        await sleep(restMs);
      } else {
        await sleep(randomDelayMs(campaign.delayMinSec, campaign.delayMaxSec));
      }
    }
  } catch (error) {
    log.error(`[campaign:${campaignId}] worker crashed`, error);
  } finally {
    activeWorkers.delete(campaignId);
    await reportProgress(campaignId).catch(() => {});
  }
}

export function pauseCampaign(campaignId: string): void {
  const state = activeWorkers.get(campaignId);
  if (state) state.paused = true;
}

export async function resumeCampaign(campaignId: string): Promise<void> {
  const state = activeWorkers.get(campaignId);
  if (state) {
    state.paused = false;
    return;
  }
  const db = getDb();
  await db.campaign.update({ where: { id: campaignId }, data: { status: "running" } });
  startCampaignWorker(campaignId).catch((err) => log.error(`[campaign:${campaignId}] resume failed`, err));
}

export function cancelCampaign(campaignId: string): void {
  const state = activeWorkers.get(campaignId);
  if (state) state.cancelled = true;
}

/** Restarts workers for campaigns left "running" when the app last closed. */
export async function resumeRunningCampaigns(): Promise<void> {
  const db = getDb();
  const campaigns = await db.campaign.findMany({ where: { status: "running" } });
  for (const campaign of campaigns) {
    startCampaignWorker(campaign.id).catch((err) =>
      log.error(`[campaign:${campaign.id}] failed to resume`, err),
    );
  }
}
