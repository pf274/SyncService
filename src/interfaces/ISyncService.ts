import { ICommand, IGetAllResourcesOfTypeCommand } from "./ICommand";

export interface ISyncServiceInstance {
}

export interface ISyncService {
  addCommand(command: ICommand): Promise<void | null | Record<string, any>>;
  new (): ISyncServiceInstance;
  queue: ICommand[];
  errorQueue: ICommand[];
  inProgressQueue: ICommand[];
  syncInterval: NodeJS.Timeout | null;
  startSync(getCloudSyncDate: () => Promise<Date>, initializationCommands?: IGetAllResourcesOfTypeCommand[]): void;
}

export enum CommandNames {
  Create = 'create',
  Read = 'read',
  ReadAll = 'readAll',
  Update = 'update',
  Delete = 'delete',
}