import { UpdateCommand } from "../../src/SyncServiceBaseCommands";
import { CommandNames } from "../../src/interfaces/CommandNames";
import { ICommand } from "../../src/interfaces/ICommand";
import { generateUuid } from "../../src/uuid";

export class CommandUpdateFolder extends UpdateCommand {
  constructor(commandRecord: Record<string, any>, localId?: string) {
    super(
      "Folder",
      CommandNames.Update,
      localId || generateUuid(),
      commandRecord
    );
  }
  canMerge(newCommand: ICommand) {
    if (newCommand.localId === this.localId) {
      if (newCommand.commandName == CommandNames.Update) {
        return true;
      }
    }
    return false;
  }
  canCancelOut(newCommand: ICommand): boolean {
    return false;
  }
  sync = async () => {
    const body = {
      ...this.commandRecord,
      localId: this.localId,
    };
    return {
      newSyncDate: new Date(),
      newRecord: body,
    };
  };
}
