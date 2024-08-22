import { CommandNames } from "./src/CommandNames";
import { SyncService } from "./src/SyncService";
import {
  CreateCommand,
  DeleteCommand,
  ReadAllCommand,
  ReadCommand,
  UpdateCommand,
} from "./src/SyncServiceBaseCommands";

import { ISyncResource } from "./src/ISyncResource";

export {
  SyncService,
  CommandNames,
  CreateCommand,
  ReadCommand,
  UpdateCommand,
  DeleteCommand,
  ReadAllCommand,
  ISyncResource,
};

const Commands = {
  CreateCommand,
  ReadCommand,
  UpdateCommand,
  DeleteCommand,
  ReadAllCommand,
};

export default { SyncService, Commands, CommandNames };
