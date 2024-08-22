import { ReadCommand } from "../../src/SyncServiceBaseCommands";
import { ISyncResource } from "../../src/ISyncResource";

export class CommandReadFolder extends ReadCommand {
  returnRecord: Record<string, any>;
  resourceInfo: ISyncResource;
  resourceType: string = "Folder";
  resourceIds: string[] = [];
  constructor(resourceId: string, returnRecord: Record<string, any>) {
    super();
    this.returnRecord = returnRecord;
    this.resourceIds = [resourceId];
  }
  getCloudCopies = async () => {
    return [this.resourceInfo];
  };
}
