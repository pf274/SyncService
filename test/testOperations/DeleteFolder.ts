import { DeleteCommand } from "../../src/SyncServiceBaseCommands";
import { CommandNames } from "../../src/interfaces/CommandNames";
import { ICommand } from "../../src/interfaces/ICommand";

export class CommandDeleteFolder extends DeleteCommand {
  constructor(localId: string) {
    super("Folder", CommandNames.Delete, localId);
  }
  canMerge(newCommand: ICommand) {
    if (newCommand.localId === this.localId) {
      if (newCommand.commandName == CommandNames.Update) {
        return true;
      } else if (newCommand.commandName == CommandNames.Create) {
        return true;
      }
    }
    return false;
  }
  canCancelOut(newCommand: ICommand): boolean {
    return false;
  }
  sync = async () => {
    return {
      newSyncDate: new Date(),
    };
  };
}
