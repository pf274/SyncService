import { ICommand } from "./ICommand";
import { ISyncResource, SyncResourceTypes } from "./ISyncResource";

export interface ISyncServiceInstance {
}

export interface ISyncService {
  addCommand(resourceType: SyncResourceTypes, commandName: string, localId: string, commandRecord: Record<string, any>): Promise<void | null | Record<string, any>>;
  new (): ISyncServiceInstance;
  queue: ICommand[];
  errorQueue: ICommand[];
  inProgressQueue: ICommand[];
  syncInterval: NodeJS.Timeout | null;
  startSync(): void;
}

export enum CommandNames {
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}