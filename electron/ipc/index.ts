import { registerSystemIpc } from "./system";
import { registerSessionsIpc } from "./sessions";
import { registerCampaignsIpc } from "./campaigns";
import { registerUpdatesIpc } from "./updates";

export function registerIpcHandlers(): void {
  registerSystemIpc();
  registerSessionsIpc();
  registerCampaignsIpc();
  registerUpdatesIpc();
}
