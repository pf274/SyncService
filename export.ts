import { CommandNames } from "./src/interfaces/CommandNames";
import { SyncService } from "./src/SyncService";
import {
  CreateCommand,
  DeleteCommand,
  ReadAllCommand,
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
  ReadAllCommand,
};

const Commands = {
  CreateCommand,
  ReadCommand,
  UpdateCommand,
  DeleteCommand,
  ReadAllCommand,
};

export default { SyncService, Commands };
