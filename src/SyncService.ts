import {
  ICommand,
  ICreateCommand,
  IDeleteCommand,
  IGetAllResourcesOfTypeCommand,
  IReadCommand,
  IUpdateCommand,
} from "./interfaces/ICommand";
import { ISyncResource } from "./interfaces/ISyncResource";
import { CommandNames } from "./interfaces/CommandNames";
import CryptoJS from "crypto-js";

type saveToStorageHook = (name: string, data: Record<string, any> | string) => Promise<void>;
type saveToStorageHelperHook = (name: string, data: Record<string, any> | string) => Promise<void>;
type loadFromStorageHook = (name: string) => Promise<Record<string, any>>;
type loadFromStorageHelperHook = (name: string) => Promise<string | null>;
/**
 * Generates a command instance from the specified details.
 *
 * This method should take the resource type, command name, and the command record and return a new instance of the appropriate command class.
 *
 * If the command is not recognized, it should return null.
 */
type mapToCommandFunc = (
  resourceType: string,
  commandName: CommandNames,
  commandRecord?: Record<string, any>
) => IUpdateCommand | ICreateCommand | IDeleteCommand | null;

export class SyncService {
  private static queue: (IUpdateCommand | ICreateCommand | IDeleteCommand)[] = [];
  private static errorQueue: (IUpdateCommand | ICreateCommand | IDeleteCommand)[] = [];
  private static inProgressQueue: (IUpdateCommand | ICreateCommand | IDeleteCommand)[] = [];
  private static syncInterval: NodeJS.Timeout | null = null;
  private static maxConcurrentRequests = 3;
  private static minCommandAgeInSeconds = 0;
  private static secondsBetweenSyncs = 5;
  private static savingDataPromise = Promise.resolve();
  private static savingQueuePromise = Promise.resolve();
  private static completedCommands: number = 0;
  private static syncDate: Date | null = null;
  private static encryptionKey: string | null = null;
  private static online: boolean = true;
  private static storagePrefix: string = "sync-service";
  private static encrypt: boolean = false;
  private static mapToCommand: mapToCommandFunc | null = null;
  private static debug: boolean = false;
  private static resourceListeners: Record<string, (resources: ISyncResource[]) => any> = {};

  static getConfig() {
    return {
      maxConcurrentRequests: SyncService.maxConcurrentRequests,
      minCommandAgeInSeconds: SyncService.minCommandAgeInSeconds,
      secondsBetweenSyncs: SyncService.secondsBetweenSyncs,
      storagePrefix: SyncService.storagePrefix,
      encrypt: SyncService.encrypt,
    };
  }
  private static getIsOnline: () => Promise<boolean> = async () => {
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
  private static saveToStorage: saveToStorageHook = async (
    name: string,
    data: Record<string, any> | string
  ) => {
    if (SyncService.encrypt && SyncService.encryptionKey) {
      const encryptedData = CryptoJS.AES.encrypt(
        typeof data == "string" ? data : JSON.stringify(data),
        SyncService.encryptionKey
      );
      await SyncService.saveToStorageHelper(name, encryptedData);
      return;
    }
    await SyncService.saveToStorageHelper(name, data);
  };
  private static saveToStorageHelper: saveToStorageHelperHook = async (name, data) => {
    throw new Error("No storage available");
  };
  private static loadFromStorage: loadFromStorageHook = async (name: string) => {
    const data = await SyncService.loadFromStorageHelper(name);
    if (!data) {
      return {};
    }
    if (SyncService.encrypt && SyncService.encryptionKey && typeof data === "string") {
      const decryptedData = CryptoJS.AES.decrypt(data, SyncService.encryptionKey).toString(
        CryptoJS.enc.Utf8
      );
      return JSON.parse(decryptedData);
    }
    return JSON.parse(data);
  };
  private static loadFromStorageHelper: loadFromStorageHelperHook = async (name) => {
    throw new Error("No storage available");
  };

  static get config() {
    return {
      /**
       * Test
       * @param func
       */
      setSaveToStorage: (
        func: (name: string, data: Record<string, any> | string) => Promise<void>
      ) => {
        SyncService.saveToStorageHelper = func;
      },
      setLoadFromStorage: (func: (name: string) => Promise<string | null>) => {
        SyncService.loadFromStorageHelper = func;
      },
      enableEncryption: (encryptionKey: string) => {
        SyncService.encrypt = true;
        SyncService.encryptionKey = encryptionKey;
      },
      disableEncryption: () => {
        SyncService.encrypt = false;
        SyncService.encryptionKey = null;
      },
      setOnlineChecker: (func: () => Promise<boolean>) => {
        SyncService.getIsOnline = func;
      },
      setStoragePrefix: (prefix: string) => {
        SyncService.storagePrefix = prefix;
      },
      setMinCommandAgeInSeconds: (seconds: number) => {
        SyncService.minCommandAgeInSeconds = Math.max(0, seconds);
      },
      setMaxConcurrentRequests: (numConcurrentRequests: number) => {
        SyncService.maxConcurrentRequests = Math.max(1, numConcurrentRequests);
      },
      setSecondsBetweenSyncs: (seconds: number) => {
        SyncService.secondsBetweenSyncs = Math.max(1, seconds);
        if (SyncService.syncInterval) {
          clearInterval(SyncService.syncInterval);
          SyncService.syncInterval = setInterval(() => {
            this.sync();
          }, SyncService.secondsBetweenSyncs * 1000);
        }
      },
      setResourceListener: (
        resourceType: string,
        listener: (resources: ISyncResource[]) => any
      ) => {
        SyncService.resourceListeners[resourceType] = listener;
      },
      setDebug(enabled: boolean) {
        SyncService.debug = enabled;
      },
    };
  }

  /**
   * Saves resources to a local JSON file.
   *
   * This function will wait for any previous save operation to complete before starting.
   * It will read the existing data from the file, merge it with the new data, and then write it back to the file.
   * If the file does not exist, it will be created.
   * @returns A promise that resolves when the save operation has completed.
   */
  private static async saveResources(newResources: ISyncResource[], synced: boolean) {
    if (SyncService.debug) {
      const resourceTypes = [...new Set(newResources.map((resource) => resource.resourceType))];
      console.log(
        `Saving ${synced ? "synced " : " "}resources of type${
          resourceTypes.length > 1 ? "s" : ""
        } ${resourceTypes.join(", ")}`
      );
    }
    SyncService.savingDataPromise = SyncService.savingDataPromise.then(async () => {
      const newData = await SyncService.loadFromStorage(`${SyncService.storagePrefix}-data`);
      for (const { localId, data, resourceType } of newResources) {
        if (!newData[resourceType]) {
          newData[resourceType] = {};
        }
        if (!newData[resourceType][localId]) {
          newData[resourceType][localId] = {};
        }
        newData[resourceType][localId] = {
          ...newData[resourceType][localId],
          ...data,
        };
      }
      await SyncService.saveToStorage(`${SyncService.storagePrefix}-data`, newData);
      const listenersToRun = new Set(newResources.map((resource) => resource.resourceType));
      for (const resourceType of listenersToRun) {
        if (SyncService.resourceListeners[resourceType]) {
          const callbackFunction = SyncService.resourceListeners[resourceType];
          callbackFunction(Object.values(newData[resourceType]));
        }
      }
    });
    return SyncService.savingDataPromise;
  }
  /**
   * Deletes a resource from the local JSON file.
   *
   * This function will wait for any previous save operation to complete before starting.
   * It will read the existing data from the file, remove the specified resource, and then write it back to the file.
   * If the resource is not found, this function will do nothing.
   * @returns A promise that resolves when the delete operation has completed.
   */
  private static async deleteResource(resourceType: string, localId: string): Promise<void> {
    if (SyncService.debug) {
      console.log(`Deleting resource ${resourceType} with localId ${localId}`);
    }
    SyncService.savingDataPromise = SyncService.savingDataPromise.then(async () => {
      const newData = await SyncService.loadFromStorage(`${SyncService.storagePrefix}-data`);
      if (!newData[resourceType]) {
        newData[resourceType] = {};
      }
      if (newData[resourceType][localId]) {
        delete newData[resourceType][localId];
      }
      await SyncService.saveToStorage(`${SyncService.storagePrefix}-data`, newData);
      if (SyncService.resourceListeners[resourceType]) {
        const callbackFunction = SyncService.resourceListeners[resourceType];
        callbackFunction(Object.values(newData[resourceType]));
      }
    });
    return SyncService.savingDataPromise;
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
    SyncService.savingQueuePromise = SyncService.savingQueuePromise.then(async () => {
      const newData = {
        queue: SyncService.queue,
        errorQueue: SyncService.errorQueue,
        syncDate: SyncService.syncDate,
      };
      await SyncService.saveToStorage(`${SyncService.storagePrefix}-state`, newData);
    });
    return SyncService.savingQueuePromise;
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
  private static async loadState(): Promise<void> {
    if (!SyncService.mapToCommand) {
      throw new Error("Map to command function is not set");
    }
    const data = await SyncService.loadFromStorage(`${SyncService.storagePrefix}-state`);
    SyncService.queue = [];
    for (const commandRecord of data.queue || []) {
      const commandInstance = SyncService.mapToCommand!(
        commandRecord.resourceType,
        commandRecord.commandName,
        commandRecord?.commandRecord
      );
      if (commandInstance) {
        if (commandRecord.commandId) {
          commandInstance.commandId = commandRecord.commandId;
        }
        if (commandRecord.commandCreationDate) {
          commandInstance.commandCreationDate = new Date(commandRecord.commandCreationDate);
        }
        if (commandRecord.localId) {
          commandInstance.localId = commandRecord.localId;
        }
        SyncService.queue.push(commandInstance);
      } else if (SyncService.debug) {
        console.error("Failed to restore command from JSON", commandRecord);
      }
    }
    SyncService.errorQueue = [];
    for (const commandRecord of data.errorQueue || []) {
      const commandInstance = SyncService.mapToCommand!(
        commandRecord.resourceType,
        commandRecord.commandName,
        commandRecord?.commandRecord
      );
      if (commandInstance) {
        if (commandRecord.commandId) {
          commandInstance.commandId = commandRecord.commandId;
        }
        if (commandRecord.commandCreationDate) {
          commandInstance.commandCreationDate = new Date(commandRecord.commandCreationDate);
        }
        if (commandRecord.localId) {
          commandInstance.localId = commandRecord.localId;
        }
        SyncService.errorQueue.push(commandInstance);
      } else if (SyncService.debug) {
        console.error("Failed to restore command from JSON", commandRecord);
      }
    }
    SyncService.syncDate = data.syncDate ? new Date(data.syncDate) : null;
  }
  /**
   * Reads resources from the cloud and updates the local versions if out of date.
   * This method will execute a read command immediately.
   * If the cloud version is newer than the local version, it will be saved to the local JSON file.
   * If the cloud version is not found, the local version will be returned.
   * @returns The specified resources
   */
  static async read(command: IReadCommand): Promise<Record<string, any>[]> {
    const { retrievedRecords } = await command.getCloudCopy();
    const recordsToReturn = [];
    for (const record of retrievedRecords) {
      const cloudVersion = record.data;
      const localVersion = await SyncService.getLocalResource(command.resourceType, record.localId);
      if (!localVersion) {
        await SyncService.saveResources(
          [
            {
              resourceType: command.resourceType,
              localId: command.localId,
              data: cloudVersion,
            },
          ],
          true
        );
        recordsToReturn.push(cloudVersion);
      } else if (cloudVersion.updatedAt > localVersion.updatedAt) {
        await SyncService.saveResources(
          [
            {
              resourceType: command.resourceType,
              localId: command.localId,
              data: cloudVersion,
            },
          ],
          true
        );
        recordsToReturn.push(cloudVersion);
      } else {
        recordsToReturn.push(localVersion);
      }
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
  static async addCommand(command: ICommand): Promise<void | null | Record<string, any>> {
    // handle read operations, don't add them to the queue
    if (command.commandName == CommandNames.Read) {
      return SyncService.read(command as IReadCommand);
    } else if (command.commandName == CommandNames.ReadAll) {
      throw new Error(
        "Cannot add get all resources command to queue. These must be run when the sync service starts."
      );
    }
    // try to convert create commands to update commands for existing resources
    let newCommand = command as ICreateCommand | IUpdateCommand | IDeleteCommand;
    const storedVersion = await SyncService.getLocalResource(
      newCommand.resourceType,
      newCommand.localId
    );
    if (storedVersion && newCommand.commandName == CommandNames.Create) {
      const createCommand = newCommand as ICreateCommand;
      const potentialNewCommand = SyncService.mapToCommand!(
        createCommand.resourceType,
        CommandNames.Update,
        createCommand?.commandRecord
      );
      if (potentialNewCommand) {
        potentialNewCommand.localId = createCommand.localId;
        potentialNewCommand.commandCreationDate = createCommand.commandCreationDate;
        potentialNewCommand.commandId = createCommand.commandId;
        newCommand = potentialNewCommand as IUpdateCommand;
      } else {
        throw new Error("Cannot add create command: resource already exists");
      }
    }
    // handle write and delete operations locally
    if (newCommand.commandName == CommandNames.Delete) {
      await SyncService.deleteResource(newCommand.resourceType, newCommand.localId);
    } else {
      const writeCommand = newCommand as ICreateCommand | IUpdateCommand;
      const simplifiedVersion: Record<string, any> = writeCommand.commandRecord;
      if (storedVersion) {
        for (const key of Object.keys(simplifiedVersion)) {
          if (storedVersion[key] === simplifiedVersion[key]) {
            delete simplifiedVersion[key];
          }
        }
      }
      if (Object.keys(simplifiedVersion).length == 0) {
        return;
      }
      writeCommand.commandRecord = simplifiedVersion;
      await SyncService.saveResources(
        [
          {
            resourceType: writeCommand.resourceType,
            localId: writeCommand.localId,
            data: writeCommand.commandRecord,
          },
        ],
        false
      );
    }
    // check if the command can be merged with any existing commands
    const mergeableCommand = SyncService.queue.find((otherCommand) =>
      otherCommand.canMerge(newCommand)
    );
    if (mergeableCommand) {
      const mergedCommand = mergeableCommand.mergeWithCommand(newCommand);
      SyncService.queue = SyncService.queue.filter(
        (otherCommand) => otherCommand.commandId !== mergeableCommand.commandId
      );
      SyncService.queue.push(mergedCommand as ICreateCommand | IUpdateCommand | IDeleteCommand);
      SyncService.queue.sort(
        (a, b) => a.commandCreationDate.getTime() - b.commandCreationDate.getTime()
      );
    } else {
      SyncService.queue.push(newCommand);
    }
    await SyncService.saveState();
  }
  /**
   * Retrieves a resource from the local JSON file.
   * This method will read the contents of the file, parse it as JSON, and return the specified resource.
   * If the file does not exist, or the resource is not found, it will return null.
   * @returns The specified resource, or null if it is not found
   */
  private static async getLocalResource(
    type: string,
    localId: string
  ): Promise<Record<string, any> | null> {
    const data = await SyncService.loadFromStorage(`${SyncService.storagePrefix}-data`);
    if (!data[type]) {
      return null;
    }
    if (!data[type][localId]) {
      return null;
    }
    return data[type][localId];
  }
  /**
   * Starts the sync process.
   * This method will load the queues from the local JSON file, and then start the sync interval.
   * If the sync interval is already running, this method will do nothing.
   */
  static async startSync(
    getCloudSyncDateHook: () => Promise<Date>,
    mapToCommand: mapToCommandFunc,
    initializationCommands?: IGetAllResourcesOfTypeCommand[]
  ): Promise<void> {
    try {
      if (this.syncInterval) {
        return;
      }
      SyncService.mapToCommand = mapToCommand;
      if (SyncService.debug) {
        console.log("Starting sync service...");
      }
      // make sure data is up to date
      await SyncService.loadState();
      const cloudSyncDate = await getCloudSyncDateHook();
      if (SyncService.syncDate !== cloudSyncDate) {
        if (initializationCommands) {
          let remainingCommands = [...initializationCommands];
          do {
            const promises = initializationCommands
              .slice(0, SyncService.maxConcurrentRequests)
              .map((command) =>
                command.getCloudCopies().then(async (response) => {
                  const retrievedRecords = response.retrievedRecords;
                  if (retrievedRecords) {
                    await SyncService.saveResources(retrievedRecords, true);
                  }
                  remainingCommands = remainingCommands.filter(
                    (otherCommand) => otherCommand.commandId !== command.commandId
                  );
                })
              );
            await Promise.all(promises);
          } while (remainingCommands.length > 0);
        }
        SyncService.syncDate = cloudSyncDate;
      }
      await SyncService.loadState();
      // check if error commands should be re-added to the queue
      for (const command of SyncService.errorQueue) {
        if (command.commandCreationDate.getTime() > SyncService.syncDate.getTime()) {
          SyncService.queue.push(command);
        } else {
          SyncService.errorQueue = SyncService.errorQueue.filter(
            (errorCommand) => errorCommand.commandId !== command.commandId
          );
        }
      }
      SyncService.queue.sort(
        (a, b) => a.commandCreationDate.getTime() - b.commandCreationDate.getTime()
      );
      await SyncService.saveState();
      this.syncInterval = setInterval(() => {
        this.sync();
      }, SyncService.secondsBetweenSyncs * 1000);
      if (SyncService.debug) {
        console.log("Sync Service Started.");
      }
    } catch (err) {
      if (SyncService.debug) {
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
      const newIsOnline = await SyncService.getIsOnline();
      if (newIsOnline !== SyncService.online) {
        SyncService.online = newIsOnline;
        if (SyncService.debug) {
          console.log(`Device is ${SyncService.online ? "on" : "off"}line`);
        }
      }
      if (!SyncService.online) {
        return;
      }
      // check if there are any commands to execute
      if (SyncService.debug) {
        const remainingCommands = this.queue.length - this.inProgressQueue.length;
        console.log(
          `In progress: ${this.inProgressQueue.length}, Waiting: ${remainingCommands}, Completed: ${this.completedCommands}, Errors: ${this.errorQueue.length}`
        );
      }
      if (this.queue.length === 0) {
        return;
      }
      if (this.inProgressQueue.length >= SyncService.maxConcurrentRequests) {
        return;
      }
      const commandsWaiting = this.queue.filter(
        (command) =>
          this.inProgressQueue.map((command) => command.commandId).includes(command.commandId) ==
          false
      );
      if (!commandsWaiting) {
        return;
      }
      const commandsEligible = commandsWaiting.filter((command) => {
        const localIdNotAlreadyInProgress = !this.inProgressQueue
          .map((command) => command.localId)
          .includes(command.localId);
        const isOlderThanMinCommandAge =
          command.commandCreationDate.getTime() <=
          new Date().getTime() - SyncService.minCommandAgeInSeconds * 1000;
        return localIdNotAlreadyInProgress && isOlderThanMinCommandAge;
      });
      if (commandsEligible.length == 0) {
        return;
      }
      const commandsToRun = commandsEligible.slice(
        0,
        SyncService.maxConcurrentRequests - this.inProgressQueue.length
      );
      for (const command of commandsToRun) {
        this.inProgressQueue.push(command);
        command.sync().then(async (response: any) => {
          const newSyncDate = response.newSyncDate;
          const newRecord = response?.newRecord;
          this.queue = this.queue.filter(
            (queuedCommand) => queuedCommand.commandId !== command.commandId
          );
          this.inProgressQueue = this.inProgressQueue.filter(
            (inProgressCommand) => inProgressCommand.commandId !== command.commandId
          );
          if (newSyncDate) {
            this.completedCommands++;
            const mostRecentTime = Math.max(
              SyncService.syncDate?.getTime() || 0,
              newSyncDate.getTime()
            );
            SyncService.syncDate = new Date(mostRecentTime);
            if (newRecord) {
              await SyncService.saveResources(
                [
                  {
                    resourceType: command.resourceType,
                    localId: command.localId,
                    data: newRecord,
                  },
                ],
                true
              );
            }
          } else {
            this.errorQueue.push(command);
          }
          await SyncService.saveState();
        });
      }
    } catch (err) {
      if (SyncService.debug) {
        console.error("Error during sync:", err);
      }
    }
  }
}
