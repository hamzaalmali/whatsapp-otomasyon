import { getDb } from "../../db/client";

export interface CampaignCounts {
  total: number;
  sent: number;
  failed: number;
  pending: number;
}

export async function getCampaignCounts(campaignId: string): Promise<CampaignCounts> {
  const db = getDb();
  const groups = await db.campaignRecipient.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: true,
  });

  const byStatus: Record<string, number> = {};
  for (const group of groups) byStatus[group.status] = group._count;
  const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0);

  return {
    total,
    sent: byStatus.sent ?? 0,
    failed: byStatus.failed ?? 0,
    pending: (byStatus.pending ?? 0) + (byStatus.sending ?? 0),
  };
}
