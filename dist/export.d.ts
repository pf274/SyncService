import { CommandNames } from "./src/interfaces/CommandNames";
import { SyncService } from "./src/SyncService";
import { CreateCommand, DeleteCommand, GetAllResourcesOfTypeCommand, ReadCommand, UpdateCommand } from "./src/SyncServiceBaseCommands";
import { ICommand } from "./src/interfaces/ICommand";
export { SyncService, CommandNames, ICommand, CreateCommand, ReadCommand, UpdateCommand, DeleteCommand, GetAllResourcesOfTypeCommand, };
declare const _default: {
    SyncService: typeof SyncService;
    Commands: {
        CreateCommand: typeof CreateCommand;
        ReadCommand: typeof ReadCommand;
        UpdateCommand: typeof UpdateCommand;
        DeleteCommand: typeof DeleteCommand;
        GetAllResourcesOfTypeCommand: typeof GetAllResourcesOfTypeCommand;
    };
};
export default _default;
