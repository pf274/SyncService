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

  public copy(): ParentCommand {
    const clone: ParentCommand = Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this
    );
    clone.commandId = generateUuid();
    clone.commandName = this.commandName;
    clone.resourceType = this.resourceType;
    clone.commandCreationDate = this.commandCreationDate;
    if (this instanceof NewInfoCommand) {
      (clone as any as NewInfoCommand).resourceInfo = JSON.parse(
        JSON.stringify(this.resourceInfo)
      );
    }
    return clone;
  }
}

export abstract class GetInfoCommand extends ParentCommand {
  abstract resourceIds: string[];
  abstract getCloudCopies(): Promise<{
    success: boolean;
    retrievedRecords: ISyncResource[];
  }>;
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

export abstract class QueueCommand extends ParentCommand {
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

export abstract class NewInfoCommand extends QueueCommand {
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
