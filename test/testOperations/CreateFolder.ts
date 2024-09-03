import { CreateCommand } from "../../src/SyncServiceBaseCommands";
import { ISyncResource } from "../../src/ISyncResource";
import { generateUuid } from "../../src/uuid";

export class CommandCreateFolder extends CreateCommand {
  resourceInfo: ISyncResource;
  resourceType: string = "Folder";
  constructor(
    commandRecord: Record<string, any>,
    resourceId?: string,
    updatedAt?: Date
  ) {
    super();
    this.resourceInfo = {
      resourceType: this.resourceType,
      resourceId: resourceId || generateUuid(),
      data: commandRecord,
      updatedAt: updatedAt || new Date(),
    };
  }
  sync = async () => {
    const headers = {
      sync_date: new Date().toISOString(),
    };
    return {
      newSyncDate: new Date(headers.sync_date),
      newResourceInfo: this.resourceInfo,
    };
  };
}
