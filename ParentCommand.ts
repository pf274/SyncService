import { FetchConfig, ICommand } from "./ICommand";
import { SyncResourceTypes } from "./ISyncResource";
import { generateUuid } from "./uuid";


export abstract class ParentCommand implements ICommand {
  [key: string]: any;
  commandId: string;
  resourceType: SyncResourceTypes;
  commandName: string;
  constructor(resourceType: SyncResourceTypes, commandName: string, params: Record<string, any>) {
    for (const param of Object.keys(params)) {
      this[param] = params[param];
    }
    this.resourceType = resourceType;
    this.commandName = commandName;
    this.commandId = generateUuid();
  }
  abstract toFetchConfig(): FetchConfig;
  abstract merge(other: ICommand): ICommand[];
  abstract execute(): Promise<{success: boolean, newOrUpdatedResources: {resourceType: SyncResourceTypes, localId: string, data: Record<string, any>}[], deletedResources: {resourceType: SyncResourceTypes, localId: string, data: Record<string, any>}[], status: number}>;
  getBaseUrl(): string {
    return `https://4byogxqqwi.execute-api.us-east-1.amazonaws.com/`
  }
  getFullUrl(endpoint: string) {
    const baseUrl = new URL(this.getBaseUrl());
    return new URL(endpoint, baseUrl).toString();
  }
}