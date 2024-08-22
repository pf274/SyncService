import { ISyncResource } from "./ISyncResource";
import { CommandNames } from "./CommandNames";
import CryptoJS from "crypto-js";
import {
  CreateCommand,
  DeleteCommand,
  GetInfoCommand,
  NewInfoCommand,
  ParentCommand,
  QueueCommand,
  ReadAllCommand,
  UpdateCommand,
} from "./SyncServiceBaseCommands";

export type mapToCommandFunc = (
  commandName: CommandNames,
  resourceId: string,
  resourceInfo: ISyncResource
) => QueueCommand | null;

type saveToStorageHook = (
  name: string,
  data: Record<string, any> | string
) => Promise<void>;
type saveToStorageHelperHook = (name: string, data: string) => Promise<void>;
type loadFromStorageHook = (name: string) => Promise<StoredData | StoredState>;
export type StoredData = {
  [resourceType: string]: {
    [resourceId: string]: ISyncResource;
  };
};
export type StoredState = {
  queue: QueueType;
  errorQueue: QueueType;
  syncDate: string | null;
  deletedresourceIds: string[];
};
type loadFromStorageHelperHook = (name: string) => Promise<string | null>;
type QueueType = QueueCommand[];

export class SyncData {
  static queue: QueueType = [];
  static errorQueue: QueueType = [];
  static inProgressQueue: QueueType = [];
  static maxConcurrentRequests = 3;
  static minCommandAgeInSeconds = 0;
  static secondsBetweenSyncs = 5;
  static savingDataPromise = Promise.resolve();
  static savingQueuePromise = Promise.resolve();
  static completedCommands: number = 0;
  static syncDate: Date | null = null;
  static encryptionKey: string | null = null;
  static online: boolean = true;
  static storagePrefix: string = "sync-service";
  static encrypt: boolean = false;
  static mapToCommand: mapToCommandFunc | null = null;
  static debug: boolean = false;
  static resourceListeners: Record<
    string,
    (resources: ISyncResource[]) => any
  > = {};
  static deletedresourceIds: string[] = [];

  static async updateLocalResources(
    cloudSyncDate: Date,
    initializationCommands?: ReadAllCommand[]
  ) {
    if (SyncData.debug) {
      console.log("Updating local resources...");
    }
    const localResourcesOutOfDate =
      SyncData.syncDate == null || SyncData.syncDate < cloudSyncDate;
    if (!localResourcesOutOfDate) {
      return;
    }
    if (!initializationCommands) {
      if (SyncData.debug) {
        console.log(
          "Local resources are out of date. No initialization commands provided."
        );
      }
      SyncData.syncDate = cloudSyncDate;
      return;
    }
    // local resources are out of date
    let remainingCommands = [...initializationCommands];
    do {
      const promises = initializationCommands
        .slice(0, SyncData.maxConcurrentRequests)
        .map(async (command) => {
          if (SyncData.debug) {
            console.log(
              `Executing initialization command for resources of type '${command.resourceType}'...`
            );
          }
          const response = await command.getCloudCopies();
          const retrievedRecords = response.retrievedRecords;
          if (SyncData.debug) {
            console.log(
              `Retrieved ${retrievedRecords?.length || 0} resources of type '${
                command.resourceType
              }'`
            );
          }
          if (retrievedRecords && retrievedRecords.length > 0) {
            await SyncData.saveResources(retrievedRecords, true, false);
          }
          remainingCommands = remainingCommands.filter(
            (otherCommand) => otherCommand.commandId !== command.commandId
          );
        });
      await Promise.all(promises);
    } while (remainingCommands.length > 0);
    SyncData.syncDate = cloudSyncDate;
  }

  /**
   * Attempts to merge the specified command with another command in the queue. If a cancel is successful, the original command will be removed.
   * @returns True if a command was canceled, false otherwise.
   */
  static attemptCancel(command: ParentCommand): boolean {
    const cancelableCommand = SyncData.queue.find((otherCommand) =>
      otherCommand.canCancelOut(command)
    );
    if (cancelableCommand) {
      SyncData.queue = SyncData.queue.filter(
        (otherCommand) => otherCommand.commandId !== cancelableCommand.commandId
      );
      if (SyncData.debug) {
        console.log("Removed cancelled command from the queue");
      }
    }
    return Boolean(cancelableCommand);
  }

  /**
   * Attempts to merge the specified command with another command in the queue. If a merge is successful, the original command will be removed.
   * @returns True if a command was merged, false otherwise.
   */
  static attemptMerge(command: ParentCommand): boolean {
    const mergeableCommand = SyncData.queue.find((otherCommand) =>
      otherCommand.canMerge(command)
    );
    if (mergeableCommand) {
      if (SyncData.debug) {
        console.log("Merging commands...");
      }
      const mergedCommand = SyncData.getMergedCommand(
        mergeableCommand as NewInfoCommand,
        command as NewInfoCommand
      );
      if (mergedCommand) {
        if (SyncData.debug) {
          console.log(
            `Merged command: ${JSON.stringify(mergedCommand, null, 2)}`
          );
        }
        SyncData.queue = SyncData.queue.filter(
          (otherCommand) =>
            otherCommand.commandId !== mergeableCommand.commandId
        );
        SyncData.queue.push(mergedCommand as QueueCommand);
        SyncData.queue.sort(
          (a, b) =>
            a.commandCreationDate.getTime() - b.commandCreationDate.getTime()
        );
        if (SyncData.debug) {
          console.log(
            `Added merged command to the queue. New queue:\n${JSON.stringify(
              SyncData.queue,
              null,
              2
            )}`
          );
        }
      }
      return Boolean(mergedCommand);
    }
    return false;
  }

  static simplifyResourceInfo(
    newResourceInfo: ISyncResource,
    existingResourceInfo: ISyncResource | undefined
  ) {
    let simplifiedData: Record<string, any> = newResourceInfo.data;
    if (existingResourceInfo?.data) {
      simplifiedData = Object.fromEntries(
        Object.entries(simplifiedData).filter(
          ([key, value]) => existingResourceInfo.data[key] !== value
        )
      );
    }
    if (SyncData.debug) {
      console.log("Simplified version:", simplifiedData);
    }
    newResourceInfo.data = simplifiedData;
  }

  static convertCreateToUpdate(command: CreateCommand) {
    const createCommand = command as CreateCommand;
    const updateCommand = SyncData.mapToCommand!(
      CommandNames.Update,
      createCommand.resourceId,
      createCommand.resourceInfo
    ) as UpdateCommand;
    if (updateCommand) {
      updateCommand.resourceInfo = createCommand.resourceInfo;
      updateCommand.commandCreationDate = createCommand.commandCreationDate;
      updateCommand.commandId = createCommand.commandId;
      if (SyncData.debug) {
        console.log("Converted create command to update command");
      }
      return updateCommand as UpdateCommand;
    }
    throw new Error("Cannot add create command: resource already exists");
  }

  static shouldUpdateResource(
    localVersion: ISyncResource | undefined,
    cloudVersion: ISyncResource | undefined
  ): { shouldUpdate: boolean; versionToUse: ISyncResource } {
    if (!localVersion && cloudVersion) {
      return { shouldUpdate: true, versionToUse: cloudVersion };
    } else if (localVersion && !cloudVersion) {
      return { shouldUpdate: false, versionToUse: localVersion };
    } else if (
      localVersion &&
      cloudVersion &&
      cloudVersion.updatedAt > localVersion.updatedAt
    ) {
      return { shouldUpdate: true, versionToUse: cloudVersion };
    } else {
      return { shouldUpdate: false, versionToUse: localVersion! };
    }
  }

  static async getRecordsToCompare(command: GetInfoCommand) {
    const localData = (await SyncData.loadFromStorage(
      `${SyncData.storagePrefix}-data`
    )) as StoredData;
    const cloudRecords: ISyncResource[] = (await command.getCloudCopies())
      .retrievedRecords;
    const localRecords: ISyncResource[] = Object.keys(
      localData[command.resourceType] || {}
    ).map((resourceId) => ({
      resourceId,
      resourceType: command.resourceType,
      data: localData[command.resourceType][resourceId],
      updatedAt: new Date(
        localData[command.resourceType][resourceId].updatedAt
      ),
    }));
    return { cloudRecords, localRecords };
  }

  /**
   * Merges two commands into a single command, or returns null if the commands cannot be merged.
   */
  static getMergedCommand(
    command1: NewInfoCommand,
    command2: NewInfoCommand
  ): NewInfoCommand | null {
    const commands = [command1, command2].sort(
      (a, b) =>
        a.commandCreationDate.getTime() - b.commandCreationDate.getTime()
    );
    const resourceDeleted = commands[1] instanceof DeleteCommand;
    if (resourceDeleted) {
      return commands[1];
    }
    const mergedCommand = SyncData.mapToCommand!(
      commands[0].commandName,
      commands[0].resourceId,
      commands[0].resourceInfo
    ) as NewInfoCommand | null;
    if (mergedCommand) {
      mergedCommand.commandCreationDate = commands[0].commandCreationDate;
      mergedCommand.commandId = commands[0].commandId;
      // update command record
      const earlierRecord = commands[0].resourceInfo.data;
      const laterRecord = commands[1].resourceInfo.data;
      if (earlierRecord && laterRecord) {
        mergedCommand.resourceInfo.data = {
          ...earlierRecord,
          ...laterRecord,
        };
      } else if (laterRecord) {
        mergedCommand.resourceInfo.data = laterRecord;
      }
      return mergedCommand;
    } else {
      if (SyncData.debug) {
        console.error("Cannot merge commands.");
      }
      return null;
    }
  }
  /**
   * May be overridden to provide a custom implementation of the isOnline function.
   */
  static getIsOnline: () => Promise<boolean> = async () => {
    try {
      const response = await fetch("https://www.google.com", {
        method: "HEAD",
        mode: "no-cors",
      });
      return response.ok;
    } catch (err) {
      return false;
    }
  };
  /**
   * Saves data to storage
   */
  static saveToStorage: saveToStorageHook = async (
    name: string,
    data: Record<string, any> | string
  ) => {
    let dataString = typeof data == "string" ? data : JSON.stringify(data);
    if (SyncData.encrypt && SyncData.encryptionKey) {
      dataString = CryptoJS.AES.encrypt(
        dataString,
        SyncData.encryptionKey
      ).toString();
    }
    await SyncData.saveToStorageHelper(name, dataString);
  };
  /**
   * Must be overridden to provide a custom implementation of the saveToStorage function.
   */
  static saveToStorageHelper: saveToStorageHelperHook = async (name, data) => {
    throw new Error("No storage available");
  };
  /**
   * Loads data from storage
   */
  static loadFromStorage: loadFromStorageHook = async (name: string) => {
    let data = await SyncData.loadFromStorageHelper(name);
    if (!data) {
      return {};
    }
    if (
      SyncData.encrypt &&
      SyncData.encryptionKey &&
      typeof data === "string"
    ) {
      data = CryptoJS.AES.decrypt(data, SyncData.encryptionKey).toString(
        CryptoJS.enc.Utf8
      );
    }
    let returnVal = JSON.parse(data);
    while (typeof returnVal === "string") {
      returnVal = JSON.parse(returnVal);
    }
    return returnVal;
  };
  /**
   * Must be overridden to provide a custom implementation of the saveToStorage function.
   */
  static loadFromStorageHelper: loadFromStorageHelperHook = async (name) => {
    throw new Error("No storage available");
  };
  /**
   * Saves resources to a local JSON file.
   *
   * This function will wait for any previous save operation to complete before starting.
   * It will read the existing data from the file, merge it with the new data, and then write it back to the file.
   * If the file does not exist, it will be created.
   * @returns A promise that resolves when the save operation has completed.
   */
  static async saveResources(
    newResources: ISyncResource[],
    synced: boolean,
    notifyListeners: boolean = true
  ) {
    if (newResources.length == 0) {
      return;
    }
    const resourceTypes = [
      ...new Set(newResources.map((resource) => resource.resourceType)),
    ];
    if (SyncData.debug) {
      console.log(
        `Saving ${synced ? "synced " : ""}resources of type${
          resourceTypes.length > 1 ? "s" : ""
        } ${resourceTypes.join(", ")}`
      );
    }
    SyncData.savingDataPromise = SyncData.savingDataPromise.then(async () => {
      const newData = (await SyncData.loadFromStorage(
        `${SyncData.storagePrefix}-data`
      )) as StoredData;
      for (const newResource of newResources) {
        const resourceType = newResource.resourceType;
        const resourceId = newResource.resourceId;
        if (!newData[resourceType]) {
          newData[resourceType] = {};
        }
        newData[resourceType][resourceId] = newResource;
      }
      await SyncData.saveToStorage(`${SyncData.storagePrefix}-data`, newData);
      if (notifyListeners) {
        for (const resourceType of resourceTypes) {
          if (SyncData.resourceListeners[resourceType]) {
            const callbackFunction = SyncData.resourceListeners[resourceType];
            callbackFunction(Object.values(newData[resourceType]));
          }
        }
      }
    });
    return SyncData.savingDataPromise;
  }
  /**
   * Deletes a resource from the local JSON file.
   *
   * This function will wait for any previous save operation to complete before starting.
   * It will read the existing data from the file, remove the specified resource, and then write it back to the file.
   * If the resource is not found, this function will do nothing.
   * @returns A promise that resolves when the delete operation has completed.
   */
  static async deleteResource(
    resourceType: string,
    resourceId: string
  ): Promise<void> {
    if (SyncData.debug) {
      console.log(`Deleting ${resourceType} with resourceId ${resourceId}`);
    }
    SyncData.savingDataPromise = SyncData.savingDataPromise.then(async () => {
      const newData = (await SyncData.loadFromStorage(
        `${SyncData.storagePrefix}-data`
      )) as StoredData;
      if (!newData[resourceType]) {
        newData[resourceType] = {};
      }
      if (newData[resourceType][resourceId]) {
        delete newData[resourceType][resourceId];
      }
      await SyncData.saveToStorage(`${SyncData.storagePrefix}-data`, newData);
      if (SyncData.resourceListeners[resourceType]) {
        const callbackFunction = SyncData.resourceListeners[resourceType];
        callbackFunction(Object.values(newData[resourceType]));
      }
    });
    return SyncData.savingDataPromise;
  }
  /**
   * Saves the current state of the queues and sync date.
   *
   * This method will wait for any previous save operation to complete before starting.
   * It reads the previously saved state (if it was saved before), merges it with the current state, and then writes it back to storage.
   *
   * @returns A promise that resolves when the save operation has completed.
   */
  static async saveState(): Promise<void> {
    SyncData.savingQueuePromise = SyncData.savingQueuePromise.then(async () => {
      const newData = {
        queue: SyncData.queue,
        errorQueue: SyncData.errorQueue,
        syncDate: SyncData.syncDate,
        deletedresourceIds: SyncData.deletedresourceIds,
      };
      await SyncData.saveToStorage(`${SyncData.storagePrefix}-state`, newData);
    });
    return SyncData.savingQueuePromise;
  }
  /**
   * Loads the queues from a local JSON file.
   *
   * This method will read the contents of the file and parse it as JSON.
   * It will then iterate over the queue and errorQueue arrays, creating new instances of the appropriate command classes.
   * If a command cannot be restored, it will be logged to the console.
   *
   * @returns A promise that resolves when the load operation has completed.
   */
  static async loadState(): Promise<void> {
    if (!SyncData.mapToCommand) {
      throw new Error("Map to command function is not set");
    }
    const data = (await SyncData.loadFromStorage(
      `${SyncData.storagePrefix}-state`
    )) as StoredState;
    SyncData.queue = [];
    SyncData.errorQueue = [];
    const queues = { queue: SyncData.queue, errorQueue: SyncData.errorQueue };
    for (const [queueName, queueArray] of Object.entries(queues)) {
      for (const savedCommand of queueName == "queue"
        ? data.queue
        : queueName == "errorQueue"
        ? data.errorQueue
        : []) {
        const commandInstance = SyncData.mapToCommand!(
          savedCommand.commandName,
          savedCommand.resourceId,
          (savedCommand as any)?.resourceInfo
        );
        if (!commandInstance) {
          if (SyncData.debug) {
            console.error("Failed to restore command from JSON", savedCommand);
          }
          continue;
        }
        if (savedCommand.commandId) {
          commandInstance.commandId = savedCommand.commandId;
        }
        if (savedCommand.commandCreationDate) {
          commandInstance.commandCreationDate = new Date(
            savedCommand.commandCreationDate
          );
        }
        queueArray.push(commandInstance);
      }
    }
    SyncData.syncDate = data.syncDate ? new Date(data.syncDate) : null;
    SyncData.deletedresourceIds = data.deletedresourceIds || [];
  }

  /**
   * Retrieves a resource from the local JSON file.
   * This method will read the contents of the file, parse it as JSON, and return the specified resource.
   * If the file does not exist, or the resource is not found, it will return null.
   * @returns The specified resource, or null if it is not found
   */
  static async getLocalResource(
    type: string,
    resourceId: string
  ): Promise<ISyncResource | undefined> {
    const data = (await SyncData.loadFromStorage(
      `${SyncData.storagePrefix}-data`
    )) as StoredData;
    if (!data[type]) {
      return undefined;
    }
    if (!data[type][resourceId]) {
      return undefined;
    }
    return data[type][resourceId];
  }
}
