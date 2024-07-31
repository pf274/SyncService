import { SyncService } from "./src/SyncService";
import { CreateCommand, DeleteCommand, GetAllResourcesOfTypeCommand, ReadCommand, UpdateCommand } from "./src/SyncServiceBaseCommands";

export { SyncService };
export * from './commands';

export const Commands = {
  CreateCommand,
  ReadCommand,
  UpdateCommand,
  DeleteCommand,
  GetAllResourcesOfTypeCommand
};
export default { SyncService, Commands };