import { SyncResourceTypes } from "./ISyncResource";

export interface FetchConfig {
  url: string;
  init: RequestInit;
}

export interface ICommand {
  execute(): Promise<{success: boolean, newOrUpdatedResources: {resourceType: SyncResourceTypes, localId: string, data: Record<string, any>}[], deletedResources: {resourceType: SyncResourceTypes, localId: string, data: Record<string, any>}[], status: number}>;
  toFetchConfig(): FetchConfig;
  merge(other: ICommand): ICommand[];
  commandId: string;
  resourceType: SyncResourceTypes;
  commandName: string;
}