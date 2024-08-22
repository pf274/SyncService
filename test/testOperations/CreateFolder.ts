import { CreateCommand } from "../../src/SyncServiceBaseCommands";
import { ISyncResource } from "../../src/interfaces/ISyncResource";
import { generateUuid } from "../../src/uuid";

export class CommandCreateFolder extends CreateCommand {
  resourceInfo: ISyncResource;
  resourceType: string = "Folder";
  constructor(
    commandRecord: Record<string, any>,
    localId?: string,
    updatedAt?: Date
  ) {
    super();
    this.resourceInfo = {
      resourceType: this.resourceType,
      localId: localId || generateUuid(),
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
