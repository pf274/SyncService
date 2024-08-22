import { UpdateCommand } from "../../src/SyncServiceBaseCommands";
import { ISyncResource } from "../../src/ISyncResource";

export class CommandUpdateFolder extends UpdateCommand {
  resourceType: string = "Folder";
  resourceInfo: ISyncResource;
  constructor(
    commandRecord: Record<string, any>,
    resourceId: string,
    updatedAt?: Date
  ) {
    super();
    this.resourceInfo = {
      resourceType: this.resourceType,
      resourceId,
      data: commandRecord,
      updatedAt: updatedAt || new Date(),
    };
  }
  sync = async () => {
    return {
      newSyncDate: new Date(),
      newResourceInfo: this.resourceInfo,
    };
  };
}
