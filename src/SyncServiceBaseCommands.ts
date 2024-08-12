import {
  ICommand,
  ICreateCommand,
  IDeleteCommand,
  IGetAllResourcesOfTypeCommand,
  IReadCommand,
  IUpdateCommand,
} from "./interfaces/ICommand";
import { generateUuid } from "./uuid";
import { CommandNames } from "./interfaces/CommandNames";

abstract class ParentCommand implements ICommand {
  commandId: string;
  resourceType: string;
  commandName: string;
  localId: string;
  commandRecord: Record<string, any> | undefined = undefined;
  commandCreationDate: Date;
  constructor(resourceType: string, commandName: CommandNames, localId: string) {
    this.resourceType = resourceType;
    this.commandName = commandName;
    this.localId = localId;
    this.commandId = generateUuid();
    this.commandCreationDate = new Date();
  }
  abstract canMerge(other: ICommand): boolean;
  abstract canCancelOut(other: ICommand): boolean;
  protected getFullUrl(baseUrl: string, endpoint: string) {
    return new URL(endpoint, baseUrl).toString();
  }
  protected getHeaders(response: Response) {
    const headers = response.headers;
    const headersObject: Record<string, string> = {};
    headers.forEach((value, key) => {
      headersObject[key] = value;
    });
    return headersObject;
  }
  /**
   * Merges two commands together. The earlier command is the one that is kept and updated, unless the later command is a delete command.
   */
  mergeWithCommand(otherCommand: ICommand): ICommand {
    const earlierCommand: any =
      this.commandCreationDate < otherCommand.commandCreationDate ? this : otherCommand;
    const laterCommand: any =
      this.commandCreationDate < otherCommand.commandCreationDate ? otherCommand : this;
    if (laterCommand.commandName === CommandNames.Delete) {
      return laterCommand.copy();
    }
    const mergedCommand = earlierCommand.copy();
    // update command record
    if (earlierCommand.commandRecord && laterCommand.commandRecord) {
      mergedCommand.commandRecord = {
        ...earlierCommand.commandRecord,
        ...laterCommand.commandRecord,
      };
    } else if (laterCommand.commandRecord) {
      mergedCommand.commandRecord = laterCommand.commandRecord;
    }
    // update creation date
    mergedCommand.commandCreationDate = earlierCommand.commandCreationDate;
    return mergedCommand;
  }

  public copy(): ICommand {
    const clone: ICommand = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    clone.commandId = generateUuid();
    clone.commandName = this.commandName;
    clone.resourceType = this.resourceType;
    clone.localId = this.localId;
    clone.commandCreationDate = this.commandCreationDate;
    if (this instanceof UpdateCommand || this instanceof CreateCommand) {
      (clone as UpdateCommand | CreateCommand).commandRecord = JSON.parse(
        JSON.stringify(this.commandRecord)
      );
    }
    return clone;
  }
}

export abstract class CreateCommand extends ParentCommand implements ICreateCommand {
  commandRecord: Record<string, any>;
  constructor(
    resourceType: string,
    commandName: CommandNames,
    localId: string,
    commandRecord: Record<string, any>
  ) {
    super(resourceType, commandName, localId);
    this.commandRecord = commandRecord;
  }
  abstract sync: ICreateCommand["sync"];
}

export abstract class ReadCommand extends ParentCommand implements IReadCommand {
  abstract getCloudCopy: IReadCommand["getCloudCopy"];
}

export abstract class UpdateCommand extends ParentCommand implements IUpdateCommand {
  commandRecord: Record<string, any>;
  constructor(
    resourceType: string,
    commandName: CommandNames,
    localId: string,
    commandRecord: Record<string, any>
  ) {
    super(resourceType, commandName, localId);
    this.commandRecord = commandRecord;
  }
  abstract sync: IUpdateCommand["sync"];
}

export abstract class DeleteCommand extends ParentCommand implements IDeleteCommand {
  constructor(resourceType: string, commandName: CommandNames, localId: string) {
    super(resourceType, commandName, localId);
  }
  abstract sync: IDeleteCommand["sync"];
}

export abstract class GetAllResourcesOfTypeCommand
  extends ParentCommand
  implements IGetAllResourcesOfTypeCommand
{
  constructor(resourceType: string) {
    super(resourceType, CommandNames.ReadAll, generateUuid());
  }
  abstract getCloudCopies: IGetAllResourcesOfTypeCommand["getCloudCopies"];
}
