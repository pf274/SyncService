import { ICommand } from "./ICommand";
import { ISyncResource, SyncResourceTypes } from "./ISyncResource";

export interface ISyncServiceInstance {
}

export interface ISyncService {
  get(type: ISyncResource, localId: string): Promise<Record<string, any> | null>;
  saveResource(type: ISyncResource, localId: string, data: Record<string, any>): Promise<void>;
  saveQueues(): Promise<void>;
  addWrite(resourceType: SyncResourceTypes, localId: string, command: ICommand): Promise<void>;
  new (): ISyncServiceInstance;
  queue: ICommand[];
  errorQueue: ICommand[];
  inProgressQueue: ICommand[];
  syncInterval: NodeJS.Timeout | null;
  startSync(): void;
}