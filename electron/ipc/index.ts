import { registerSystemIpc } from "./system";
import { registerSessionsIpc } from "./sessions";
import { registerCampaignsIpc } from "./campaigns";

export function registerIpcHandlers(): void {
  registerSystemIpc();
  registerSessionsIpc();
  registerCampaignsIpc();
}
