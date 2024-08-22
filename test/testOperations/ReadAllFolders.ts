import { GetAllResourcesOfTypeCommand } from "../../src/SyncServiceBaseCommands";
import { ICommand } from "../../src/interfaces/ICommand";
import { ISyncResource } from "../../src/interfaces/ISyncResource";
import { generateUuid } from "../../src/uuid";

export class CommandReadAllFolders extends GetAllResourcesOfTypeCommand {
  returnRecords: ISyncResource[];
  constructor(returnRecords: ISyncResource[]) {
    super("Folder");
    this.returnRecords = returnRecords;
  }
  canMerge(newCommand: ICommand) {
    return false;
  }
  canCancelOut(newCommand: ICommand): boolean {
    return false;
  }
  getCloudCopies = async () => {
    return {
      success: true,
      retrievedRecords: this.returnRecords,
    };
  };
}
