import { SyncService } from "./src/SyncService";
import { CreateCommand, DeleteCommand, GetAllResourcesOfTypeCommand, ReadCommand, UpdateCommand } from "./src/SyncServiceBaseCommands";

export { SyncService };
export const commands = {
  CreateCommand,
  UpdateCommand,
  ReadCommand,
  DeleteCommand,
  GetAllResourcesOfTypeCommand
};