import { ReadAllCommand } from "../../src/SyncServiceBaseCommands";
import { ISyncResource } from "../../src/ISyncResource";

export class CommandReadAllFolders extends ReadAllCommand {
  resourceIds: string[];
  returnRecords: ISyncResource[];
  resourceType: string = "Folder";
  constructor(returnRecords: ISyncResource[]) {
    super();
    this.returnRecords = returnRecords;
    this.resourceIds = returnRecords.map((record) => record.resourceId);
  }
  getCloudCopies = async () => {
    return this.returnRecords;
  };
}
