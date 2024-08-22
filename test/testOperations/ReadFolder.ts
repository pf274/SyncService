import { ReadCommand } from "../../src/SyncServiceBaseCommands";
import { CommandNames } from "../../src/interfaces/CommandNames";
import { ICommand } from "../../src/interfaces/ICommand";

export class CommandReadFolder extends ReadCommand {
  returnRecord: Record<string, any>;
  getCloudCopy = async () => {
    return {
      success: true,
      retrievedRecords: [
        {
          resourceType: "Folder",
          localId: this.localId,
          data: {
            ...this.returnRecord,
            localId: this.localId,
          },
        },
      ],
    };
  };
  constructor(localId: string, returnRecord: Record<string, any>) {
    super("Folder", CommandNames.Read, localId);
    this.returnRecord = returnRecord;
  }
  canMerge(newCommand: ICommand) {
    return false;
  }
  canCancelOut(newCommand: ICommand): boolean {
    return false;
  }
}
