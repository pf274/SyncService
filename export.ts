import { CommandNames } from "./src/interfaces/CommandNames";
import { SyncService } from "./src/SyncService";
import {
  CreateCommand,
  DeleteCommand,
  GetAllResourcesOfTypeCommand,
  ReadCommand,
  UpdateCommand,
} from "./src/SyncServiceBaseCommands";
import { ICommand } from "./src/interfaces/ICommand";

export {
  SyncService,
  CommandNames,
  ICommand,
  CreateCommand,
  ReadCommand,
  UpdateCommand,
  DeleteCommand,
  GetAllResourcesOfTypeCommand,
};

const Commands = {
  CreateCommand,
  ReadCommand,
  UpdateCommand,
  DeleteCommand,
  GetAllResourcesOfTypeCommand,
};

export default { SyncService, Commands };
