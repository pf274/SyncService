import { ICommand, ICreateCommand, IDeleteCommand, IGetAllResourcesOfTypeCommand, IReadCommand, IUpdateCommand, ResourceArray } from "./interfaces/ICommand";
import { SyncResourceTypes } from "./interfaces/ISyncResource";
import { CommandNames } from "./interfaces/ISyncService";
import * as fs from 'fs';
import { CommandCreateVideo } from "./commands/video/CommandCreateVideo";
import { CommandUpdateVideo } from "./commands/video/CommandUpdateVideo";

export class SyncService {
  // TODO: replace fetch with Requester
  // TODO: create command to get sync date from the cloud to pass into startSync
  static queue: (IUpdateCommand | ICreateCommand | IDeleteCommand)[] = [];
  static errorQueue: (IUpdateCommand | ICreateCommand | IDeleteCommand)[] = [];
  static inProgressQueue: (IUpdateCommand | ICreateCommand | IDeleteCommand)[] = [];
  static syncInterval: NodeJS.Timeout | null = null;
  static maxConcurrentRequests = 3;
  static savingDataPromise = Promise.resolve();
  static savingQueuePromise = Promise.resolve();
  static completedCommands: number = 0;
  static syncDate: Date | null = null;
  static online: boolean = true;
  /**
   * Saves a resource to a local JSON file.
   *
   * This function will wait for any previous save operation to complete before starting.
   * It will read the existing data from the file, merge it with the new data, and then write it back to the file.
   * If the file does not exist, it will be created.
   * @returns A promise that resolves when the save operation has completed.
   */
  private static async saveResource(resourceType: SyncResourceTypes, localId: string, data: Record<string, any>, synced: boolean): Promise<void> {
    // TODO: implement AsyncStorage
    console.log(`Saving ${synced ? "synced " : ""}resource ${resourceType} with localId ${localId}`);
    SyncService.savingDataPromise = SyncService.savingDataPromise.then(async () => {
      await new Promise((resolve) => setTimeout(() => {
        const fileExists = fs.existsSync('./data.json');
        let newData: Record<any, any>;
        if (fileExists) {
          const file = fs.readFileSync('./data.json', 'utf-8');
          newData = JSON.parse(file);
        } else {
          newData = {};
        }
        if (!newData[resourceType]) {
          newData[resourceType] = {};
        }
        if (!newData[resourceType][localId]) {
          newData[resourceType][localId] = {};
        }
        newData[resourceType][localId] = {...newData[resourceType][localId], ...data};
        fs.writeFileSync('./data.json', JSON.stringify(newData, null, 2));
        resolve(true);
      }, 100));
    });
    return SyncService.savingDataPromise;
  }
  private static async saveResources(newResources: ResourceArray, synced: boolean) {
    // TODO: implement AsyncStorage
    const resourceTypes = [...new Set(newResources.map((resource) => resource.resourceType))];
    console.log(`Saving ${synced ? "synced " : " "}resources of type${resourceTypes.length > 1 ? 's' : ''} ${resourceTypes.join(", ")}`);
    SyncService.savingDataPromise = SyncService.savingDataPromise.then(async () => {
      await new Promise((resolve) => setTimeout(() => {
        const fileExists = fs.existsSync('./data.json');
        let newData: Record<any, any>;
        if (fileExists) {
          const file = fs.readFileSync('./data.json', 'utf-8');
          newData = JSON.parse(file);
        } else {
          newData = {};
        }
        for (const {localId, data, resourceType} of newResources) {
          if (!newData[resourceType]) {
            newData[resourceType] = {};
          }
          if (!newData[resourceType][localId]) {
            newData[resourceType][localId] = {};
          }
          newData[resourceType][localId] = {...newData[resourceType][localId], ...data};
        }
        fs.writeFileSync('./data.json', JSON.stringify(newData, null, 2));
        resolve(true);
      }, 100));
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
  private static async deleteResource(resourceType: SyncResourceTypes, localId: string): Promise<void> {
    // TODO: implement AsyncStorage
    console.log(`Deleting resource ${resourceType} with localId ${localId}`);
    SyncService.savingDataPromise = SyncService.savingDataPromise.then(async () => {
      await new Promise((resolve) => setTimeout(() => {
        const fileExists = fs.existsSync('./data.json');
        let newData: Record<any, any>;
        if (fileExists) {
          const file = fs.readFileSync('./data.json', 'utf-8');
          newData = JSON.parse(file);
        } else {
          newData = {};
        }
        if (!newData[resourceType]) {
          newData[resourceType] = {};
        }
        if (newData[resourceType][localId]) {
          delete newData[resourceType][localId];
        }
        fs.writeFileSync('./data.json', JSON.stringify(newData, null, 2));
        resolve(true);
      }, 100));
    });
    return SyncService.savingDataPromise;
  }
  /**
   * Saves the current state of the queues to a local JSON file.
   *
   * This method will wait for any previous save operation to complete before starting.
   * It reads the existing data from the file, merges it with the current state of the queues, and then writes it back to the file.
   * If the file does not exist, it will be created.
   *
   * @returns A promise that resolves when the save operation has completed.
   */
  static async saveQueues(): Promise<void> {
    // TODO: implement AsyncStorage
    SyncService.savingQueuePromise = SyncService.savingQueuePromise.then(async () => {
      await new Promise((resolve) => setTimeout(() => {
        const fileExists = fs.existsSync('./queue.json');
        let newData: Record<any, any>;
        if (fileExists) {
          const file = fs.readFileSync('./queue.json', 'utf-8');
          newData = JSON.parse(file);
        } else {
          newData = {};
        }
        newData.queue = SyncService.queue;
        newData.errorQueue = SyncService.errorQueue;
        newData.syncDate = SyncService.syncDate;
        fs.writeFileSync('./queue.json', JSON.stringify(newData, null, 2));
        resolve(true);
      }, 1000));
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
  static async loadQueues(): Promise<void> {
    // TODO: implement AsyncStorage
    const fileExists = fs.existsSync('./queue.json');
    if (!fileExists) {
      return;
    }
    const file = fs.readFileSync('./queue.json', 'utf-8');
    const data = JSON.parse(file);
    SyncService.queue = [];
    for (const commandRecord of data.queue) {
      const commandInstance = SyncService.generateCommand(commandRecord);
      if (commandInstance) {
        SyncService.queue.push(commandInstance);
      } else {
        console.error('Failed to restore command from JSON', commandRecord);
      }
    }
    SyncService.errorQueue = [];
    for (const commandRecord of data.errorQueue) {
      const commandInstance = SyncService.generateCommand(commandRecord);
      if (commandInstance) {
        SyncService.errorQueue.push(commandInstance);
      } else {
        console.error('Failed to restore command from JSON', commandRecord);
      }
    }
  }
  static async loadLocalSyncDate() {
    // TODO: implement AsyncStorage
    const fileExists = fs.existsSync('./queue.json');
    if (!fileExists) {
      return new Date();
    }
    const file = fs.readFileSync('./queue.json', 'utf-8');
    const data = JSON.parse(file);
    SyncService.syncDate = data.syncDate ? new Date(data.syncDate) : null;
  }
  /**
   * Generates a command instance from the specified details.
   * This method will take a command record and return a new instance of the appropriate command class.
   * If the command is not recognized, it will return null.
   * @returns The generated command instance, or null if the command record is not recognized
   */
  static generateCommand({resourceType, commandName, commandRecord, localId, commandId} : {resourceType: SyncResourceTypes, commandName: CommandNames, commandRecord?: Record<string, any>, localId?: string, commandId?: string}): IUpdateCommand | ICreateCommand | IDeleteCommand | null {
    if (resourceType == SyncResourceTypes.Video) {
      if (commandName == CommandNames.Create) {
        return new CommandCreateVideo(commandRecord as any, localId, commandId);
      } else if (commandName == CommandNames.Update) {
        return new CommandUpdateVideo(commandRecord as any, localId!, commandId);
      }
    }
    return null;
  }
  /**
   * Reads a resource from the cloud and updates the local version if out of date.
   * This method will create a read command and execute it immediately.
   * If the cloud version is newer than the local version, it will be saved to the local JSON file.
   * If the cloud version is not found, the local version will be returned.
   * @returns The specified resource, or null if it is not found
   */
  static async read(command: IReadCommand): Promise<Record<string, any> | null> {
    const {retrievedRecords} = await command.getCloudCopy();
    const cloudVersion = retrievedRecords && retrievedRecords.length > 0 ? retrievedRecords[0].data : null;
    const localVersion = await SyncService.getLocalResource(command.resourceType, command.localId);
    if (!cloudVersion) {
      return localVersion;
    } else if (!localVersion) {
      await SyncService.saveResource(command.resourceType, command.localId, cloudVersion, true);
      return cloudVersion;
    } else if (cloudVersion?.updatedAt > localVersion?.updatedAt) {
      await SyncService.saveResource(command.resourceType, command.localId, cloudVersion, true);
      return cloudVersion;
    } else {
      return localVersion;
    }

  }
  /**
   * Adds a command to the queue.
   *
   * This method will create a new command instance based on the specified details.
   * If the command is a read operation, it will be executed immediately and the result will be returned.
   * If the command is a write operation, it will be added to the queue for processing.
   * @returns A promise that resolves with the result of the command, or null if the command is a write operation.
   */
  static async addCommand(command: ICommand): Promise<void | null | Record<string, any>> {
    // handle read operations, don't add them to the queue
    if (command.commandName == CommandNames.Read) {
      return SyncService.read(command as IReadCommand);
    } else if (command.commandName == CommandNames.ReadAll) {
      throw new Error('Cannot add get all resources command to queue. These must be run when the sync service starts.');
    }
    // try to convert create commands to update commands for existing resources
    let newCommand = command as ICreateCommand | IUpdateCommand | IDeleteCommand;
    const storedVersion = await SyncService.getLocalResource(newCommand.resourceType, newCommand.localId);
    if (storedVersion && newCommand.commandName == CommandNames.Create) {
      const potentialNewCommand = SyncService.generateCommand({resourceType: newCommand.resourceType, commandName: CommandNames.Update, commandRecord: newCommand.commandRecord, localId: newCommand.localId, commandId: newCommand.commandId});
      if (potentialNewCommand) {
        newCommand = potentialNewCommand as ICreateCommand | IUpdateCommand | IDeleteCommand;
      } else {
        throw new Error('Cannot add create command: resource already exists');
      }
    }
    // handle write and delete operations locally
    if (newCommand.commandName == CommandNames.Delete) {
      await SyncService.deleteResource(newCommand.resourceType, newCommand.localId);
    } else {
      const simplifiedVersion: Record<string, any> = newCommand.commandRecord;
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
      newCommand.commandRecord = simplifiedVersion;
      await SyncService.saveResource(newCommand.resourceType, newCommand.localId, newCommand.commandRecord, false);
    }
    // TODO: check if the command can be merged with any existing commands
    SyncService.queue.push(newCommand);
    await SyncService.saveQueues();
  }
  /**
   * Retrieves a resource from the local JSON file.
   * This method will read the contents of the file, parse it as JSON, and return the specified resource.
   * If the file does not exist, or the resource is not found, it will return null.
   * @returns The specified resource, or null if it is not found
   */
  private static async getLocalResource(type: SyncResourceTypes, localId: string): Promise<Record<string, any> | null> {
    const fileExists = fs.existsSync('./data.json');
    if (!fileExists) {
      return null;
    }
    const file = fs.readFileSync('./data.json', {encoding: 'utf-8'});
    const data = JSON.parse(file);
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
  static async startSync(getCloudSyncDate: () => Promise<Date>, initializationCommands?: IGetAllResourcesOfTypeCommand[]): Promise<void> {
    if (this.syncInterval) {
      return;
    }
    console.log('Starting sync service...');
    // make sure data is up to date
    await SyncService.loadLocalSyncDate();
    const cloudSyncDate = await getCloudSyncDate();
    if (SyncService.syncDate !== cloudSyncDate) {
      if (initializationCommands) {
        let remainingCommands = [...initializationCommands];
        do {
          const promises = initializationCommands.slice(0, SyncService.maxConcurrentRequests).map((command) => command.getCloudCopies().then(async (response) => {
            const retrievedRecords = response.retrievedRecords;
            if (retrievedRecords) {
              await SyncService.saveResources(retrievedRecords, true);
            }
            remainingCommands = remainingCommands.filter((otherCommand) => otherCommand.commandId !== command.commandId);
          }));
          await Promise.all(promises);
        } while (remainingCommands.length > 0);
      }
      SyncService.syncDate = cloudSyncDate;
    }
    await SyncService.loadQueues();
    // check if error commands should be re-added to the queue
    for (const command of SyncService.errorQueue) {
      if (command.commandCreationDate.getTime() > SyncService.syncDate.getTime()) {
        SyncService.queue.push(command);
      } else {
        SyncService.errorQueue = SyncService.errorQueue.filter((errorCommand) => errorCommand.commandId !== command.commandId);
      }
    }
    SyncService.queue.sort((a, b) => a.commandCreationDate.getTime() - b.commandCreationDate.getTime());
    await SyncService.saveQueues();
    this.syncInterval = setInterval(() => {
      this.sync();
    }, 1000);
    console.log('Sync service started...');
  }
  /**
   * Executes the sync process every interval.
   * This method will check the current state of the queues and execute any commands that are eligible.
   * It will also remove any completed commands from the queue.
   * If there are no commands to execute, or the maximum number of concurrent requests has been reached, this method will do nothing.
   * If a command fails, it will be added to the error queue.
   */
  private static async sync(): Promise<void> {
    // TODO: Replace with real offline detection
    if (SyncService.online && Math.random() > 0.8) {
      SyncService.online = false;
      console.log('Device has gone offline. Pausing sync service.');
      return;
    } else if (!SyncService.online) {
      if (Math.random() > 0.8) {
        SyncService.online = true;
        console.log('Device is back online. Resuming sync service.');
      } else {
        return;
      }
    }
    // check if there are any commands to execute
    const remainingCommands = this.queue.length - this.inProgressQueue.length;
    console.log(`In progress: ${this.inProgressQueue.length}, Waiting: ${remainingCommands}, Completed: ${this.completedCommands}, Errors: ${this.errorQueue.length}`);
    if (this.queue.length === 0) {
      return;
    }
    if (this.inProgressQueue.length >= SyncService.maxConcurrentRequests) {
      return;
    }
    const commandsWaiting = this.queue.filter((command) => this.inProgressQueue.map((command) => command.commandId).includes(command.commandId) == false);
    if (!commandsWaiting) {
      return;
    }
    const commandsEligible = commandsWaiting.filter((command) => !this.inProgressQueue.map((command) => command.localId).includes(command.localId));
    if (commandsEligible.length == 0) {
      return;
    }
    const commandsToRun = commandsEligible.slice(0, SyncService.maxConcurrentRequests - this.inProgressQueue.length);
    for (const command of commandsToRun) {
      this.inProgressQueue.push(command);
      command.sync().then(async (response: any) => {
        const newSyncDate = response.newSyncDate;
        const newRecord = response?.newRecord;
        this.queue = this.queue.filter((queuedCommand) => queuedCommand.commandId !== command.commandId);
        this.inProgressQueue = this.inProgressQueue.filter((inProgressCommand) => inProgressCommand.commandId !== command.commandId);
        if (newSyncDate) {
          this.completedCommands++;
          const mostRecentTime = Math.max(SyncService.syncDate?.getTime() || 0, newSyncDate.getTime());
          SyncService.syncDate = new Date(mostRecentTime);
          if (newRecord) {
            await SyncService.saveResource(command.resourceType, command.localId, newRecord, true);
          }
        } else {
          this.errorQueue.push(command);
        }
        await SyncService.saveQueues();
      });
    }
  }
}