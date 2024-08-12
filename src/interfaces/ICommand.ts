import { ISyncResource } from "./ISyncResource";

export interface ICommand {
  // TODO: remove localId from ICommand and add it to each resource being processed. Use ISyncResource.
  canMerge(other: ICommand): boolean;
  canCancelOut(other: ICommand): boolean;
  commandId: string;
  resourceType: string;
  commandName: string;
  localId: string;
  commandCreationDate: Date;
}

export interface IReadCommand extends ICommand {
  getCloudCopy(): Promise<{
    success: boolean;
    retrievedRecords: {
      resourceType: string;
      localId: string;
      data: Record<string, any>;
    }[];
  }>;
}

export interface ICreateCommand extends ICommand {
  sync(): Promise<{
    newSyncDate: Date | null;
    newRecord: Record<string, any>;
  }>;
  commandRecord: Record<string, any>;
}

export interface IUpdateCommand extends ICommand {
  sync(): Promise<{
    newSyncDate: Date | null;
    newRecord: Record<string, any>;
  }>;
  commandRecord: Record<string, any>;
}

export interface IDeleteCommand extends ICommand {
  sync(): Promise<{
    newSyncDate: Date | null;
  }>;
}

export interface IGetAllResourcesOfTypeCommand extends ICommand {
  getCloudCopies(): Promise<{
    retrievedRecords: ISyncResource[];
  }>;
}
