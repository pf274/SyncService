import { CommandNames } from "./src/CommandNames";
import { SyncService } from "./src/SyncService";
import { CreateCommand, DeleteCommand, ReadAllCommand, ReadCommand, UpdateCommand } from "./src/SyncServiceBaseCommands";
import { ISyncResource } from "./src/ISyncResource";
export { SyncService, CommandNames, CreateCommand, ReadCommand, UpdateCommand, DeleteCommand, ReadAllCommand, ISyncResource, };
declare const _default: {
    SyncService: typeof SyncService;
    Commands: {
        CreateCommand: typeof CreateCommand;
        ReadCommand: typeof ReadCommand;
        UpdateCommand: typeof UpdateCommand;
        DeleteCommand: typeof DeleteCommand;
        ReadAllCommand: typeof ReadAllCommand;
    };
    CommandNames: typeof CommandNames;
};
export default _default;
