import { CommandNames } from "./src/interfaces/CommandNames";
import { SyncService } from "./src/SyncService";
import { CreateCommand, DeleteCommand, GetAllResourcesOfTypeCommand, ReadCommand, UpdateCommand } from "./src/SyncServiceBaseCommands";
import { ICommand } from './src/interfaces/ICommand';

export { SyncService };
export * from './commands';

export { CommandNames, ICommand }; // Re-export the CommandNames enum

export const Commands = {
  CreateCommand,
  ReadCommand,
  UpdateCommand,
  DeleteCommand,
  GetAllResourcesOfTypeCommand
};
export default { SyncService, Commands };