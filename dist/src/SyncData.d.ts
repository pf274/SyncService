import { ICommand, ICreateCommand, IDeleteCommand, IGetAllResourcesOfTypeCommand, IReadCommand, IUpdateCommand } from "./interfaces/ICommand";
import { ISyncResource } from "./interfaces/ISyncResource";
import { mapToCommandFunc } from "./SyncTypes";
type saveToStorageHook = (name: string, data: Record<string, any> | string) => Promise<void>;
type saveToStorageHelperHook = (name: string, data: string) => Promise<void>;
type loadFromStorageHook = (name: string) => Promise<Record<string, any>>;
type loadFromStorageHelperHook = (name: string) => Promise<string | null>;
type queueType = (IUpdateCommand | ICreateCommand | IDeleteCommand)[];
export declare class SyncData {
    static queue: queueType;
    static errorQueue: queueType;
    static inProgressQueue: queueType;
    static maxConcurrentRequests: number;
    static minCommandAgeInSeconds: number;
    static secondsBetweenSyncs: number;
    static savingDataPromise: Promise<void>;
    static savingQueuePromise: Promise<void>;
    static completedCommands: number;
    static syncDate: Date | null;
    static encryptionKey: string | null;
    static online: boolean;
    static storagePrefix: string;
    static encrypt: boolean;
    static mapToCommand: mapToCommandFunc | null;
    static debug: boolean;
    static resourceListeners: Record<string, (resources: ISyncResource[]) => any>;
    static deletedLocalIds: string[];
    static updateLocalResources(cloudSyncDate: Date, initializationCommands?: IGetAllResourcesOfTypeCommand[]): Promise<void>;
    /**
     * Attempts to merge the specified command with another command in the queue. If a cancel is successful, the original command will be removed.
     * @returns True if a command was canceled, false otherwise.
     */
    static attemptCancel(command: ICommand): boolean;
    /**
     * Attempts to merge the specified command with another command in the queue. If a merge is successful, the original command will be removed.
     * @returns True if a command was merged, false otherwise.
     */
    static attemptMerge(command: ICommand): boolean;
    static simplifyCommandRecord(command: IUpdateCommand | ICreateCommand, existingResource: Record<string, any> | null): void;
    static convertCreateToUpdate(command: ICreateCommand): IUpdateCommand;
    static shouldUpdateResource(localVersion: ISyncResource | undefined, cloudVersion: ISyncResource | undefined): {
        shouldUpdate: boolean;
        versionToUse: ISyncResource;
    };
    static getRecordsToCompare(command: IReadCommand | IGetAllResourcesOfTypeCommand): Promise<{
        cloudRecords: ISyncResource[];
        localRecords: ISyncResource[];
    }>;
    /**
     * Merges two commands into a single command, or returns null if the commands cannot be merged.
     */
    static getMergedCommand(command1: ICommand, command2: ICommand): ICommand | null;
    /**
     * May be overridden to provide a custom implementation of the isOnline function.
     */
    static getIsOnline: () => Promise<boolean>;
    /**
     * Saves data to storage
     */
    static saveToStorage: saveToStorageHook;
    /**
     * Must be overridden to provide a custom implementation of the saveToStorage function.
     */
    static saveToStorageHelper: saveToStorageHelperHook;
    /**
     * Loads data from storage
     */
    static loadFromStorage: loadFromStorageHook;
    /**
     * Must be overridden to provide a custom implementation of the saveToStorage function.
     */
    static loadFromStorageHelper: loadFromStorageHelperHook;
    /**
     * Saves resources to a local JSON file.
     *
     * This function will wait for any previous save operation to complete before starting.
     * It will read the existing data from the file, merge it with the new data, and then write it back to the file.
     * If the file does not exist, it will be created.
     * @returns A promise that resolves when the save operation has completed.
     */
    static saveResources(newResources: ISyncResource[], synced: boolean, notifyListeners?: boolean): Promise<void>;
    /**
     * Deletes a resource from the local JSON file.
     *
     * This function will wait for any previous save operation to complete before starting.
     * It will read the existing data from the file, remove the specified resource, and then write it back to the file.
     * If the resource is not found, this function will do nothing.
     * @returns A promise that resolves when the delete operation has completed.
     */
    static deleteResource(resourceType: string, localId: string): Promise<void>;
    /**
     * Saves the current state of the queues and sync date.
     *
     * This method will wait for any previous save operation to complete before starting.
     * It reads the previously saved state (if it was saved before), merges it with the current state, and then writes it back to storage.
     *
     * @returns A promise that resolves when the save operation has completed.
     */
    static saveState(): Promise<void>;
    /**
     * Loads the queues from a local JSON file.
     *
     * This method will read the contents of the file and parse it as JSON.
     * It will then iterate over the queue and errorQueue arrays, creating new instances of the appropriate command classes.
     * If a command cannot be restored, it will be logged to the console.
     *
     * @returns A promise that resolves when the load operation has completed.
     */
    static loadState(): Promise<void>;
    /**
     * Retrieves a resource from the local JSON file.
     * This method will read the contents of the file, parse it as JSON, and return the specified resource.
     * If the file does not exist, or the resource is not found, it will return null.
     * @returns The specified resource, or null if it is not found
     */
    static getLocalResource(type: string, localId: string): Promise<Record<string, any> | null>;
}
export {};
