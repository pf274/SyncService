import { SyncService } from "./src/SyncService";
import { CreateCommand, DeleteCommand, GetAllResourcesOfTypeCommand, ReadCommand, UpdateCommand } from "./src/SyncServiceBaseCommands";

const Commands = {
  CreateCommand,
  UpdateCommand,
  ReadCommand,
  DeleteCommand,
  GetAllResourcesOfTypeCommand
};
export default { SyncService, Commands };