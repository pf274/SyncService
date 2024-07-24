import { FetchConfig, ICommand, ICreateCommand, IDeleteCommand, IGetAllResourcesOfTypeCommand, IReadCommand, IUpdateCommand } from "./interfaces/ICommand";
import { SyncResourceTypes } from "./interfaces/ISyncResource";
import { generateUuid } from "../uuid";
import { CommandNames } from "./interfaces/ISyncService";


abstract class ParentCommand implements ICommand {
  commandId: string;
  resourceType: SyncResourceTypes;
  commandName: string;
  localId: string;
  commandRecord: Record<string, any> | undefined = undefined;
  commandCreationDate: Date;
  constructor(resourceType: SyncResourceTypes, commandName: CommandNames, localId: string) {
    this.resourceType = resourceType;
    this.commandName = commandName;
    this.localId = localId;
    this.commandId = generateUuid();
    this.commandCreationDate = new Date();
  }
  abstract merge(other: ICommand): ICommand[];
  protected getBaseUrl(): string {
    return `https://4byogxqqwi.execute-api.us-east-1.amazonaws.com/`
  }
  protected getFullUrl(endpoint: string) {
    const baseUrl = new URL(this.getBaseUrl());
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
}

export abstract class CreateCommand extends ParentCommand implements ICreateCommand {
  commandRecord: Record<string, any>;
  constructor(resourceType: SyncResourceTypes, commandName: CommandNames, localId: string, commandRecord: Record<string, any>) {
    super(resourceType, commandName, localId);
    this.commandRecord = commandRecord;
  }
  abstract sync: ICreateCommand['sync'];
}

export abstract class ReadCommand extends ParentCommand implements IReadCommand {
  abstract getCloudCopy: IReadCommand['getCloudCopy'];
}

export abstract class UpdateCommand extends ParentCommand implements IUpdateCommand {
  commandRecord: Record<string, any>;
  constructor(resourceType: SyncResourceTypes, commandName: CommandNames, localId: string, commandRecord: Record<string, any>) {
    super(resourceType, commandName, localId);
    this.commandRecord = commandRecord;
  }
  abstract sync: IUpdateCommand['sync'];
}

export abstract class DeleteCommand extends ParentCommand implements IDeleteCommand {
  commandRecord: Record<string, any>;
  constructor(resourceType: SyncResourceTypes, commandName: CommandNames, localId: string, commandRecord: Record<string, any>) {
    super(resourceType, commandName, localId);
    this.commandRecord = commandRecord;
  }
  abstract sync: IDeleteCommand['sync'];
}

export abstract class GetAllResourcesOfTypeCommand extends ParentCommand implements IGetAllResourcesOfTypeCommand {
  constructor(resourceType: SyncResourceTypes) {
    super(resourceType, CommandNames.ReadAll, generateUuid());
  }
  abstract getCloudCopies: IGetAllResourcesOfTypeCommand['getCloudCopies'];

}