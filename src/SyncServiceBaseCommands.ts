import { generateUuid } from "./uuid";
import { CommandNames } from "./CommandNames";
import { ISyncResource } from "./ISyncResource";

export abstract class ParentCommand {
  abstract resourceType: string;
  abstract commandName: CommandNames;
  abstract canMerge(newCommand: ParentCommand): boolean;
  abstract canCancelOut(newCommand: ParentCommand): boolean;
  commandId: string = generateUuid();
  commandCreationDate: Date = new Date();
}

export abstract class GetInfoCommand extends ParentCommand {
  abstract resourceIds: string[];
  abstract getCloudCopies(): Promise<ISyncResource[]>;
  canCancelOut(newCommand: ParentCommand): boolean {
    return false;
  }
  canMerge(newCommand: ParentCommand): boolean {
    return false;
  }
}

export abstract class ReadCommand extends GetInfoCommand {
  commandName = CommandNames.Read;
}

export abstract class ReadAllCommand extends GetInfoCommand {
  commandName = CommandNames.ReadAll;
}

export abstract class ModifyCommand extends ParentCommand {
  get resourceId(): string {
    return (
      (this as any as NewInfoCommand).resourceInfo.resourceId ||
      (this as any as DeleteCommand).resourceId
    );
  }
  abstract sync(): Promise<{
    newSyncDate: Date | null;
    newResourceInfo: ISyncResource | null;
  }>;
}

export abstract class NewInfoCommand extends ModifyCommand {
  abstract resourceInfo: ISyncResource;
  canMerge(newCommand: ParentCommand): boolean {
    if (newCommand instanceof NewInfoCommand) {
      if (newCommand.resourceInfo.resourceId === this.resourceInfo.resourceId) {
        if (newCommand instanceof UpdateCommand) {
          return true;
        }
      }
    }
    return false;
  }
  disableMerge = false;
}
export abstract class CreateCommand extends NewInfoCommand {
  commandName = CommandNames.Create;
  canCancelOut(newCommand: ParentCommand): boolean {
    if (newCommand instanceof DeleteCommand) {
      if (newCommand.resourceId === this.resourceInfo.resourceId) {
        return true;
      }
    }
    return false;
  }
}

export abstract class UpdateCommand extends NewInfoCommand {
  commandName = CommandNames.Update;
  canCancelOut(newCommand: ParentCommand): boolean {
    return false;
  }
}

export abstract class DeleteCommand extends ParentCommand {
  abstract resourceId: string;
  commandName = CommandNames.Delete;
  canCancelOut(newCommand: ParentCommand): boolean {
    return false;
  }
  canMerge(newCommand: ParentCommand): boolean {
    return false;
  }
}
