import { SyncService } from "./src/SyncService";
import { CreateCommand, DeleteCommand, GetAllResourcesOfTypeCommand, ReadCommand, UpdateCommand } from "./src/SyncServiceBaseCommands";

export {SyncService};
export const Commands = {
  CreateCommand,
  UpdateCommand,
  ReadCommand,
  DeleteCommand,
  GetAllResourcesOfTypeCommand
};
export default { SyncService, Commands };