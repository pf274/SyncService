import { CommandNames } from "./src/CommandNames";
import { SyncService } from "./src/SyncService";
import {
  CreateCommand,
  DeleteCommand,
  ReadAllCommand,
  ReadCommand,
  UpdateCommand,
} from "./src/SyncServiceBaseCommands";

export {
  SyncService,
  CommandNames,
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
