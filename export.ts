import { SyncService } from "./src/SyncService";
import { CreateCommand, DeleteCommand, GetAllResourcesOfTypeCommand, ReadCommand, UpdateCommand } from "./src/SyncServiceBaseCommands";

exports = {
  SyncService,
  commands: {
    CreateCommand,
    UpdateCommand,
    ReadCommand,
    DeleteCommand,
    GetAllResourcesOfTypeCommand
  }
}