import { FetchConfig, ICommand } from "./interfaces/ICommand";
import { SyncResourceTypes } from "./interfaces/ISyncResource";
import { generateUuid } from "../uuid";
import { CommandNames } from "./interfaces/ISyncService";


export abstract class ParentCommand implements ICommand {
  commandId: string;
  resourceType: SyncResourceTypes;
  commandName: string;
  localId: string;
  commandRecord: Record<string, any> | undefined = undefined;
  constructor(resourceType: SyncResourceTypes, commandName: CommandNames, localId: string, commandRecord?: Record<string, any>) {
    this.resourceType = resourceType;
    this.commandName = commandName;
    this.localId = localId;
    if (commandRecord) {
      this.commandRecord = commandRecord;
    }
    this.commandId = generateUuid();
  }
  abstract toFetchConfig(): FetchConfig;
  abstract merge(other: ICommand): ICommand[];
  abstract execute: ICommand['execute'];
  getBaseUrl(): string {
    return `https://4byogxqqwi.execute-api.us-east-1.amazonaws.com/`
  }
  getFullUrl(endpoint: string) {
    const baseUrl = new URL(this.getBaseUrl());
    return new URL(endpoint, baseUrl).toString();
  }
}