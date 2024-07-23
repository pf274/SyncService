import { ICommand } from "./interfaces/ICommand";
import { SyncResourceTypes } from "./interfaces/ISyncResource";
import { CommandNames, ISyncService, ISyncServiceInstance } from "./interfaces/ISyncService";
import * as fs from 'fs';
import { CommandCreateVideo } from "./commands/CommandCreateVideo";
import { CommandUpdateVideo } from "./commands/CommandUpdateVideo";

class SyncService implements ISyncServiceInstance {
  static queue: ICommand[] = [];
  static errorQueue: ICommand[] = [];
  static inProgressQueue: ICommand[] = [];
  static syncInterval: NodeJS.Timeout | null = null;
  static maxConcurrentRequests = 3;
  static savingDataPromise = Promise.resolve();
  static savingQueuePromise = Promise.resolve();
  static completedCommands: number = 0;
  static syncDate: Date | null = null;
  /**
   * Saves a resource to a local JSON file.
   *
   * This function will wait for any previous save operation to complete before starting.
   * It will read the existing data from the file, merge it with the new data, and then write it back to the file.
   * If the file does not exist, it will be created.
   * @returns A promise that resolves when the save operation has completed.
   */
  private static async saveResource(type: SyncResourceTypes, localId: string, data: Record<string, any>): Promise<void> {
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
        if (!newData[type]) {
          newData[type] = {};
        }
        if (!newData[type][localId]) {
          newData[type][localId] = {};
        }
        newData[type][localId] = {...newData[type][localId], ...data};
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
    const fileExists = fs.existsSync('./queue.json');
    if (!fileExists) {
      return;
    }
    const file = fs.readFileSync('./queue.json', 'utf-8');
    const data = JSON.parse(file);
    SyncService.queue = [];
    for (const commandRecord of data.queue) {
      const commandInstance: ICommand | null = SyncService.generateCommand(commandRecord);
      if (commandInstance) {
        SyncService.queue.push(commandInstance);
      } else {
        console.error('Failed to restore command from JSON', commandRecord);
      }
    }
    SyncService.errorQueue = [];
    for (const commandRecord of data.errorQueue) {
      const commandInstance: ICommand | null = SyncService.generateCommand(commandRecord);
      if (commandInstance) {
        SyncService.errorQueue.push(commandInstance);
      } else {
        console.error('Failed to restore command from JSON', commandRecord);
      }
    }
    SyncService.syncDate = data.syncDate ? new Date(data.syncDate) : null;
  }
  /**
   * Generates a command instance from the specified details.
   * This method will take a command record and return a new instance of the appropriate command class.
   * If the command is not recognized, it will return null.
   * @returns The generated command instance, or null if the command record is not recognized
   */
  static generateCommand({resourceType, commandName, commandRecord, localId, commandId} : {resourceType: SyncResourceTypes, commandName: CommandNames, commandRecord?: Record<string, any>, localId?: string, commandId?: string}): ICommand | null {
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
  static async read(resourceType: SyncResourceTypes, localId: string): Promise<Record<string, any> | null> {
    const command = SyncService.generateCommand({resourceType, commandName: CommandNames.Read, localId});
    if (!command) {
      console.error('Cannot add read command: unrecognized type/command name');
      return null;
    }
    const {retrievedResources} = await command.execute();
    let cloudVersion = null;
    if (retrievedResources && retrievedResources.length > 0) {
      cloudVersion = retrievedResources[0].data;
    }
    const localVersion = await SyncService.getLocalResource(resourceType, localId);
    if (!cloudVersion) {
      return localVersion;
    } else if (!localVersion) {
      await SyncService.saveResource(resourceType, localId, cloudVersion);
      return cloudVersion;
    } else if (cloudVersion?.updatedAt > localVersion?.updatedAt) {
      await SyncService.saveResource(resourceType, localId, cloudVersion);
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
  static async addCommand(resourceType: SyncResourceTypes, commandName: CommandNames, localId?: string, commandRecord?: Record<string, any>): Promise<void | null | Record<string, any>> {
    const storedVersion = localId ? await SyncService.getLocalResource(resourceType, localId) : null;
    let newCommandName = commandName;
    if (storedVersion && commandName == CommandNames.Create) {
      newCommandName = CommandNames.Update;
    }
    // handle read operations, don't add them to the queue
    if (newCommandName == CommandNames.Read) {
      return SyncService.read(resourceType, localId!);
    }
    // handle write operations
    if (!commandRecord) {
      throw new Error('commandRecord is required for all commands except read');
    }
    const simplifiedVersion: Record<string, any> = commandRecord;
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
    const command = SyncService.generateCommand({commandRecord: simplifiedVersion, resourceType, commandName: newCommandName, localId});
    if (!command) {
      console.error('Cannot add write command: unrecognized type/command name');
      return;
    }
    SyncService.queue.push(command);
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
  static async startSync(): Promise<void> {
    await SyncService.loadQueues();
    // TODO: Get sync_date from the cloud and if it isn't what we have, add a read command for all resources
    if (this.syncInterval) {
      return;
    }
    this.syncInterval = setInterval(() => {
      this.sync();
    }, 1000);
  }
  /**
   * Executes the sync process every interval.
   * This method will check the current state of the queues and execute any commands that are eligible.
   * It will also remove any completed commands from the queue.
   * If there are no commands to execute, or the maximum number of concurrent requests has been reached, this method will do nothing.
   * If a command fails, it will be added to the error queue.
   */
  private static async sync(): Promise<void> {
    const remainingCommands = this.queue.length - this.inProgressQueue.length;
    if (this.inProgressQueue.length != 0 || remainingCommands != 0) {
      console.log(`In progress: ${this.inProgressQueue.length}, Waiting: ${remainingCommands}, Completed: ${this.completedCommands}, Errors: ${this.errorQueue.length}`);
    }
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
      this.inProgressQueue.push(command as ICommand);
      command.execute().then(async ({success, newResources, updatedResources, deletedResources, newSyncDate}) => {
        if (success) {
          if (newResources) {
            for (const resource of newResources) {
              await this.saveResource(command.resourceType, resource.localId, resource.data);
            }
          }
          if (updatedResources) {
            for (const resource of updatedResources) {
              await this.saveResource(command.resourceType, resource.localId, resource.data);
            }
          }
          this.queue = this.queue.filter((queuedCommand) => queuedCommand.commandId !== command.commandId);
          this.inProgressQueue = this.inProgressQueue.filter((inProgressCommand) => inProgressCommand.commandId !== command.commandId);
          this.completedCommands++;
          if (newSyncDate) {
            const mostRecentTime = Math.max(SyncService.syncDate?.getTime() || 0, newSyncDate.getTime());
            SyncService.syncDate = new Date(mostRecentTime);
          }
        } else {
          this.errorQueue.push(command as ICommand);
        }
        await SyncService.saveQueues();
      });
    }
  }
}

const SyncServiceStatic: ISyncService = SyncService;

export {SyncServiceStatic as SyncService};