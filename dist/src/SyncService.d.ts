import { ICommand, IGetAllResourcesOfTypeCommand, IReadCommand } from "./interfaces/ICommand";
import { ISyncResource } from "./interfaces/ISyncResource";
import { mapToCommandFunc } from "./SyncTypes";
export declare class SyncService {
    static syncInterval: NodeJS.Timeout | null;
    static getConfig(): {
        maxConcurrentRequests: number;
        minCommandAgeInSeconds: number;
        secondsBetweenSyncs: number;
        storagePrefix: string;
        encrypt: boolean;
    };
    static get config(): {
        setSaveToStorage: (func: (name: string, data: string) => Promise<void>) => void;
        setLoadFromStorage: (func: (name: string) => Promise<string | null>) => void;
        enableEncryption: (encryptionKey: string) => void;
        disableEncryption: () => void;
        setOnlineChecker: (func: () => Promise<boolean>) => void;
        setStoragePrefix: (prefix: string) => void;
        setMinCommandAgeInSeconds: (seconds: number) => void;
        setMaxConcurrentRequests: (numConcurrentRequests: number) => void;
        setSecondsBetweenSyncs: (seconds: number) => void;
        setResourceListener: (resourceType: string, listener: (resources: ISyncResource[]) => any) => void;
        setDebug(enabled: boolean): void;
    };
    /**
     * Reads resources from the cloud and updates the local versions if out of date.
     * This method will execute a read command immediately.
     * If the cloud version is newer than the local version, it will be saved to the local JSON file.
     * If the cloud version is not found, the local version will be returned.
     * @returns The specified resources
     */
    static read(command: IReadCommand | IGetAllResourcesOfTypeCommand): Promise<Record<string, any>[]>;
    /**
     * If the command is a read operation, it will be executed immediately and the result will be returned.
     *
     * If the command is a write operation, it will be added to the queue for processing.
     *
     * For read operations, you can also use SyncService.read(command) to execute the command immediately.
     * @returns A promise that resolves with the result of the command if the command is a read operation, or null if the command is a write operation.
     */
    static addCommand(newCommand: ICommand): Promise<null | Record<string, any>>;
    /**
     * Starts the sync process.
     * This method will load the queues from the local JSON file, and then start the sync interval.
     * If the sync interval is already running, this method will do nothing.
     */
    static startSync(getCloudSyncDateHook: () => Promise<Date>, mapToCommand: mapToCommandFunc, initializationCommands?: IGetAllResourcesOfTypeCommand[]): Promise<void>;
    /**
     * Executes the sync process every interval.
     * This method will check the current state of the queues and execute any commands that are eligible.
     * It will also remove any completed commands from the queue.
     * If there are no commands to execute, or the maximum number of concurrent requests has been reached, this method will do nothing.
     * If a command fails, it will be added to the error queue.
     */
    static sync(): Promise<void>;
}
