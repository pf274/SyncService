import { SyncResourceTypes } from "./ISyncResource";

export interface FetchConfig {
  url: string;
  init: RequestInit;
}

export type ResourceArray = {resourceType: SyncResourceTypes, localId: string, data: Record<string, any>}[];

export interface ICommand {
  /**
   * Attempts to merge the current command with another command.
   * 
   * If they cancel out, this will return zero commands.
   * 
   * If they can merge, this will return one command.
   * 
   * If they cannot merge, this will return the two original commands.
   */
  merge(nextCommand: ICommand): ICommand[];
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
  commandRecord: Record<string, any>;
}

export interface IUpdateCommand extends ICommand {
  sync(): Promise<{
    newSyncDate: Date | null,
    newRecord: Record<string, any>,
  }>;
  commandRecord: Record<string, any>;
}

export interface IDeleteCommand extends ICommand {
  sync(): Promise<{
    newSyncDate: Date | null,
  }>;
}

export interface IGetAllResourcesOfTypeCommand extends ICommand {
  getCloudCopies(): Promise<{
    retrievedRecords: ResourceArray,
  }>;
}