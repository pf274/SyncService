import { DeleteCommand } from "../../src/SyncServiceBaseCommands";

export class CommandDeleteFolder extends DeleteCommand {
  resourceId: string;
  resourceType: string = "Folder";
  constructor(resourceId: string) {
    super();
    this.resourceId = resourceId;
  }
  sync = async () => {
    return {
      newSyncDate: new Date(),
      newResourceInfo: null,
    };
  };
}
