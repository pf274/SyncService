import { SyncResourceTypes } from "./ISyncResource";

export interface FetchConfig {
  url: string;
  init: RequestInit;
}

export type ResourceArray = {resourceType: SyncResourceTypes, localId: string, data: Record<string, any>}[];

export interface ICommand {
  merge(other: ICommand): ICommand[];
  commandId: string;
  resourceType: SyncResourceTypes;
  commandName: string;
  localId: string;
  commandCreationDate: Date;
}

export interface IReadCommand extends ICommand {
  getCloudCopy(): Promise<{success: boolean, retrievedRecords: {resourceType: SyncResourceTypes, localId: string, data: Record<string, any>}[]}>;
}

export interface ICreateCommand extends ICommand {
  sync(): Promise<{
    newSyncDate: Date | null,
    newRecord: Record<string, any>,
  }>;
  createResource(): Record<string, any>;
  commandRecord: Record<string, any>;
}

export interface IUpdateCommand extends ICommand {
  sync(): Promise<{
    newSyncDate: Date | null,
    newRecord: Record<string, any>,
  }>;
  updateResource(existingRecord: Record<string, any>): Record<string, any>;
  commandRecord: Record<string, any>;
}

export interface IDeleteCommand extends ICommand {
  sync(): Promise<{
    newSyncDate: Date | null,
  }>;
  deleteResource(existingRecord: Record<string, any>): Record<string, any>;
  commandRecord: Record<string, any>;
}

export interface IGetAllResourcesOfTypeCommand extends ICommand {
  getCloudCopies(): Promise<{
    retrievedRecords: ResourceArray,
  }>;
}