import { DeleteCommand } from "../../src/SyncServiceBaseCommands";
import { CommandNames } from "../../src/interfaces/CommandNames";
import { ICommand } from "../../src/interfaces/ICommand";

export class CommandDeleteFolder extends DeleteCommand {
  localId: string;
  resourceType: string = "Folder";
  constructor(localId: string) {
    super();
    this.localId = localId;
  }
  sync = async () => {
    return {
      newSyncDate: new Date(),
      newResourceInfo: null,
    };
  };
}
