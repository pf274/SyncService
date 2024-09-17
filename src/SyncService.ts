import { ISyncResource } from "./ISyncResource";
import { StoredData, SyncData, mapToCommandFunc } from "./SyncData";

import {
  CreateCommand,
  DeleteCommand,
  GetInfoCommand,
  NewInfoCommand,
  ParentCommand,
  ModifyCommand,
  ReadAllCommand,
} from "./SyncServiceBaseCommands";

export class SyncService {
  private static syncInterval: NodeJS.Timeout | null = null;
  static getConfig() {
    return {
      maxConcurrentRequests: SyncData.maxConcurrentRequests,
      minCommandAgeInSeconds: SyncData.minCommandAgeInSeconds,
      secondsBetweenSyncs: SyncData.secondsBetweenSyncs,
      storagePrefix: SyncData.storagePrefix,
      encrypt: SyncData.encrypt,
    };
  }
  static get config() {
    return {
      enableEncryption: (encryptionKey: string) => {
        SyncData.encrypt = true;
        SyncData.encryptionKey = encryptionKey;
      },
      disableEncryption: () => {
        SyncData.encrypt = false;
        SyncData.encryptionKey = null;
      },
      setOnlineChecker: (func: () => Promise<boolean>) => {
        SyncData.getIsOnline = func;
      },
      setStoragePrefix: (prefix: string) => {
        SyncData.storagePrefix = prefix;
      },
      setMinCommandAgeInSeconds: (seconds: number) => {
        SyncData.minCommandAgeInSeconds = Math.max(0, seconds);
      },
      setMaxConcurrentRequests: (numConcurrentRequests: number) => {
        SyncData.maxConcurrentRequests = Math.max(1, numConcurrentRequests);
      },
      setSecondsBetweenSyncs: (seconds: number) => {
        SyncData.secondsBetweenSyncs = Math.max(1, seconds);
        if (SyncService.syncInterval) {
          clearInterval(SyncService.syncInterval);
          SyncService.syncInterval = setInterval(() => {
            this.sync();
          }, SyncData.secondsBetweenSyncs * 1000);
        }
      },
      setResourceListener: (
        resourceType: string,
        listener: (resources: ISyncResource[]) => any
      ) => {
        SyncData.resourceListeners[resourceType] = listener;
      },
      setDebug(enabled: boolean) {
        SyncData.debug = enabled;
      },
    };
  }
  /**
   * Reads resources from the cloud and updates the local versions if out of date.
   * This method will execute a read command immediately.
   * If the cloud version is newer than the local version, it will be saved to the local JSON file.
   * If the cloud version is not found, the local version will be returned.
   * @returns The specified resources
   */
  static async read(command: GetInfoCommand): Promise<Record<string, any>[]> {
    const { cloudRecords, localRecords } = await SyncData.getRecordsToCompare(command);
    const resourceIdsToProcess = [
      ...new Set([...cloudRecords, ...localRecords].map((record) => record.resourceId)),
    ];
    const recordsToReturn: Record<string, any>[] = [];
    const recordsToUpdate: ISyncResource[] = [];
    for (const resourceId of resourceIdsToProcess) {
      const cloudVersion = cloudRecords.find((record) => record.resourceId === resourceId);
      const localVersion = localRecords.find((record) => record.resourceId === resourceId);
      if (!localVersion && cloudVersion && SyncData.deletedResourceIds.includes(resourceId)) {
        continue; // skip deleted resources
      }
      const { shouldUpdate, versionToUse } = SyncData.shouldUpdateResource(
        localVersion,
        cloudVersion
      );
      if (shouldUpdate) {
        recordsToUpdate.push(versionToUse);
      }
      recordsToReturn.push(versionToUse.data);
    }
    if (recordsToUpdate.length > 0) {
      await SyncData.saveResources(recordsToUpdate, true);
    }
    return recordsToReturn;
  }
  /**
   * If the command is a read operation, it will be executed immediately and the result will be returned.
   *
   * If the command is a write operation, it will be added to the queue for processing.
   *
   * For read operations, you can also use SyncService.read(command) to execute the command immediately.
   * @returns A promise that resolves with the result of the command if the command is a read operation, or null if the command is a write operation.
   */
  static async addCommand(
    newCommand: ModifyCommand | GetInfoCommand,
    saveOnlyOnSuccess = false
  ): Promise<null | Record<string, any>> {
    if (newCommand instanceof GetInfoCommand) {
      return SyncService.read(newCommand);
    }
    let command = newCommand;
    // convert create commands to update commands for existing resources
    const existingResource = await SyncData.getLocalResource(
      command.resourceType,
      command.resourceId
    );
    if (existingResource && command instanceof CreateCommand) {
      command = SyncData.convertCreateToUpdate(command);
    }
    // locally handle write and delete operations immediately
    if (command instanceof NewInfoCommand) {
      SyncData.simplifyResourceInfo(command.resourceInfo, existingResource);
      if (Object.keys(command.resourceInfo.data).length == 0) {
        if (SyncData.debug) {
          console.log("No changes to save. Command not added to Sync Service.");
        }
        return null;
      }
      if (!saveOnlyOnSuccess) {
        await SyncData.saveResources([command.resourceInfo], false);
      } else {
        command.disableMerge = true;
      }
    } else if (command instanceof DeleteCommand) {
      await SyncData.deleteResource(command.resourceType, command.resourceId);
      SyncData.deletedResourceIds.push(command.resourceId);
    } else {
      throw new Error("Invalid command type");
    }
    const canceled = SyncData.attemptCancel(command);
    const merged = canceled ? false : SyncData.attemptMerge(command);
    if (!canceled && !merged) {
      if (SyncData.debug) {
        console.log("Adding command to the queue");
      }
      SyncData.queue.push(command);
    }
    await SyncData.saveState();
    return null;
  }
  static async initialize(
    getCloudSyncDate: () => Promise<Date>,
    mapToCommand: mapToCommandFunc,
    saveToStorage: (name: string, data: string) => Promise<any>,
    loadFromStorage: (name: string) => Promise<string | null>,
    initializationCommands: ReadAllCommand[]
  ) {
    SyncData.saveToStorageHelper = saveToStorage;
    SyncData.loadFromStorageHelper = loadFromStorage;
    SyncData.mapToCommand = mapToCommand;
    SyncData.initializationCommands = initializationCommands;
    SyncData.getCloudSyncDate = getCloudSyncDate;
    SyncData.initialized = true;
  }
  static get initialized() {
    return SyncData.initialized;
  }
  /**
   * Starts the sync process.
   * This method will load the queues from the local JSON file, and then start the sync interval.
   * If the sync interval is already running, this method will do nothing.
   */
  static async startSync(): Promise<void> {
    if (!SyncData.initialized) {
      throw new Error("Sync Service not initialized.");
    }
    if (this.syncInterval) {
      if (SyncData.debug) {
        console.log("Sync service already started.");
      }
      return;
    }
    if (SyncData.debug) {
      console.log("Starting sync service...");
    }
    try {
      await SyncData.loadState();
      const cloudSyncDate = await SyncData.getCloudSyncDate();
      await SyncData.updateLocalResources(cloudSyncDate, SyncData.initializationCommands);
      if (SyncData.debug) {
        console.log("Notifying resource listeners of initial data...");
      }
      const data = (await SyncData.loadFromStorage(`${SyncData.storagePrefix}-data`)) as StoredData;
      for (const resourceType of Object.keys(SyncData.resourceListeners)) {
        if (data[resourceType]) {
          const callbackFunction = SyncData.resourceListeners[resourceType];
          callbackFunction(Object.values(data[resourceType]));
        }
      }
      // check if error commands should be re-added to the queue
      for (const command of SyncData.errorQueue) {
        if (
          SyncData.syncDate &&
          command.commandCreationDate.getTime() > SyncData.syncDate.getTime()
        ) {
          SyncData.queue.push(command);
          SyncData.errorQueue = SyncData.errorQueue.filter(
            (errorCommand) => errorCommand.commandId !== command.commandId
          );
        }
      }
      SyncData.queue.sort(
        (a, b) => a.commandCreationDate.getTime() - b.commandCreationDate.getTime()
      );
      await SyncData.saveState();
      this.syncInterval = setInterval(() => {
        this.sync();
      }, SyncData.secondsBetweenSyncs * 1000);
      if (SyncData.debug) {
        console.log("Sync Service Started.");
      }
    } catch (err) {
      if (SyncData.debug) {
        console.error("Error starting sync service:", err);
      }
    }
  }
  /**
   * Executes the sync process every interval.
   * This method will check the current state of the queues and execute any commands that are eligible.
   * It will also remove any completed commands from the queue.
   * If there are no commands to execute, or the maximum number of concurrent requests has been reached, this method will do nothing.
   * If a command fails, it will be added to the error queue.
   */
  private static async sync(): Promise<void> {
    try {
      // check if device is online
      const isOnline = await SyncData.getIsOnline();
      if (isOnline !== SyncData.online) {
        SyncData.online = isOnline;
        if (SyncData.debug) {
          console.log(`Device is ${SyncData.online ? "on" : "off"}line`);
        }
      }
      const remainingCommands = SyncData.queue.length - SyncData.inProgressQueue.length;
      const availableSlots = Math.max(
        SyncData.maxConcurrentRequests - SyncData.inProgressQueue.length,
        0
      );
      if (SyncData.debug) {
        console.log(
          `In progress: ${SyncData.inProgressQueue.length}/${SyncData.maxConcurrentRequests}, Waiting: ${remainingCommands}, Completed: ${SyncData.completedCommands}, Errors: ${SyncData.errorQueue.length}`
        );
      }
      if (!SyncData.online) {
        return;
      }
      // check if there are any commands to execute
      const commandIdsInProgress = SyncData.inProgressQueue.map((command) => command.commandId);
      const resourceIdsInProgress = SyncData.inProgressQueue.map((command) => command.resourceId);
      function notAlreadyInProgress(command: ModifyCommand) {
        return (
          !commandIdsInProgress.includes(command.commandId) &&
          !resourceIdsInProgress.includes(command.resourceId)
        );
      }
      function isOldEnough(command: ParentCommand) {
        return (
          command.commandCreationDate.getTime() <=
          new Date().getTime() - SyncData.minCommandAgeInSeconds * 1000
        );
      }
      const commandsEligible = SyncData.queue.filter(notAlreadyInProgress).filter(isOldEnough);
      const commandsToRun = availableSlots == 0 ? [] : commandsEligible.slice(0, availableSlots);
      for (const command of commandsToRun) {
        SyncData.inProgressQueue.push(command);
        if (SyncData.debug) {
          console.log(`Executing command: ${command.commandName} ${command.resourceType}`, command);
        }
        new Promise(async (resolve) => {
          try {
            const response = await command.sync();
            const newSyncDate = response.newSyncDate;
            const newResourceInfo = response.newResourceInfo;
            SyncData.queue = SyncData.queue.filter(
              (queuedCommand) => queuedCommand.commandId !== command.commandId
            );
            SyncData.inProgressQueue = SyncData.inProgressQueue.filter(
              (inProgressCommand) => inProgressCommand.commandId !== command.commandId
            );
            if (command instanceof DeleteCommand) {
              SyncData.deletedResourceIds = SyncData.deletedResourceIds.filter(
                (resourceId) => resourceId !== command.resourceId
              );
            }
            if (newSyncDate) {
              SyncData.completedCommands++;
              const mostRecentTime = Math.max(
                SyncData.syncDate?.getTime() || 0,
                newSyncDate.getTime()
              );
              SyncData.syncDate = new Date(mostRecentTime);
              if (command instanceof DeleteCommand) {
                if (SyncData.debug) {
                  console.log("Deleting resource from API response:", command);
                }
                await SyncData.deleteResource(command.resourceType, command.resourceId);
              } else if (command instanceof NewInfoCommand) {
                if (!newResourceInfo) {
                  throw new Error("Create/Update command did not return a new resource.");
                }
                if (SyncData.debug) {
                  console.log("Saving resource from API response:", command);
                }
                await SyncData.saveResources([newResourceInfo], true);
              }
            } else {
              if (SyncData.debug) {
                console.log("Command did not return a new sync date:", command);
              }
              SyncData.errorQueue.push(command);
            }
            await SyncData.saveState();
          } catch (err) {
            if (SyncData.debug) {
              console.error("Command failed:", err);
            }
            SyncData.errorQueue.push(command);
          }
          resolve(true);
        });
      }
    } catch (err) {
      if (SyncData.debug) {
        console.error("Error during sync:", err);
      }
    }
  }
  static async stopSync(): Promise<void> {
    if (this.syncInterval) {
      if (SyncData.debug) {
        console.log("Stopping sync service...");
      }
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      if (SyncData.debug) {
        console.log("Sync service stopped.");
      }
    } else if (SyncData.debug) {
      console.log("Sync service already stopped.");
    }
  }
}
