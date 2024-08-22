import { ReadAllCommand } from "../../src/SyncServiceBaseCommands";
import { ISyncResource } from "../../src/interfaces/ISyncResource";

export class CommandReadAllFolders extends ReadAllCommand {
  localIds: string[];
  returnRecords: ISyncResource[];
  resourceType: string = "Folder";
  constructor(returnRecords: ISyncResource[]) {
    super();
    this.returnRecords = returnRecords;
    this.localIds = returnRecords.map((record) => record.localId);
  }
  getCloudCopies = async () => {
    return {
      success: true,
      retrievedRecords: this.returnRecords,
    };
  };
}
