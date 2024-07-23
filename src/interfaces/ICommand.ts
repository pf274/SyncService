import { SyncResourceTypes } from "./ISyncResource";

export interface FetchConfig {
  url: string;
  init: RequestInit;
}

type ResourceArray = {resourceType: SyncResourceTypes, localId: string, data: Record<string, any>}[];

export interface ICommand {
  execute(): Promise<{
    success: boolean,
    newResources?: ResourceArray,
    updatedResources?: ResourceArray,
    retrievedResources?: ResourceArray,
    deletedResources?: ResourceArray,
    newSyncDate?: Date,
  }>;
  toFetchConfig(): FetchConfig;
  merge(other: ICommand): ICommand[];
  commandId: string;
  resourceType: SyncResourceTypes;
  commandName: string;
  localId: string;
}