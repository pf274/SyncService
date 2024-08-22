import { CreateCommand } from "../../src/SyncServiceBaseCommands";
import { CommandNames } from "../../src/interfaces/CommandNames";
import { ICommand } from "../../src/interfaces/ICommand";
import { generateUuid } from "../../src/uuid";

export class CommandCreateFolder extends CreateCommand {
  constructor(commandRecord: Record<string, any>, localId?: string) {
    super(
      "Folder",
      CommandNames.Create,
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
    if (newCommand.localId === this.localId) {
      if (newCommand.commandName === CommandNames.Delete) {
        return true;
      }
    }
    return false;
  }
  sync = async () => {
    const headers = {
      sync_date: new Date().toISOString(),
    };
    const body = {
      ...this.commandRecord,
      localId: this.localId,
    };
    return {
      newSyncDate: new Date(headers.sync_date),
      newRecord: body,
    };
  };
}
