import { UpdateCommand } from "../../src/SyncServiceBaseCommands";
import { CommandNames } from "../../src/interfaces/CommandNames";
import { ICommand } from "../../src/interfaces/ICommand";
import { ISyncResource } from "../../src/interfaces/ISyncResource";
import { generateUuid } from "../../src/uuid";

export class CommandUpdateFolder extends UpdateCommand {
  resourceType: string = "Folder";
  resourceInfo: ISyncResource;
  constructor(
    commandRecord: Record<string, any>,
    localId: string,
    updatedAt?: Date
  ) {
    super();
    this.resourceInfo = {
      resourceType: this.resourceType,
      localId,
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
