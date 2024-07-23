import { ICommand } from "./interfaces/ICommand";
import { ISyncResource, SyncResourceTypes } from "./interfaces/ISyncResource";
import { CommandNames, ISyncService, ISyncServiceInstance } from "./interfaces/ISyncService";
import * as fs from 'fs';
import { ParentCommand } from "./ParentCommand";
import { CommandCreateVideo } from "./commands/CommandCreateVideo";
import { CommandUpdateVideo } from "./commands/CommandUpdateVideo";

class SyncService implements ISyncServiceInstance {
  static queue: ICommand[] = [];
  static errorQueue: ICommand[] = [];
  static inProgressQueue: ICommand[] = [];
  static syncInterval: NodeJS.Timeout | null = null;
  static maxConcurrentRequests = 3;
  static savingPromise = Promise.resolve();
  static completedCommands: number = 0;
  private static async saveResource(type: SyncResourceTypes, localId: string, data: Record<string, any>): Promise<void> {
    SyncService.savingPromise = SyncService.savingPromise.then(async () => {
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
    return SyncService.savingPromise;
  }
  static async saveQueues(): Promise<void> {
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
    fs.writeFileSync('./queue.json', JSON.stringify(newData, null, 2));
  }
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
  }
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
  static async addCommand(resourceType: SyncResourceTypes, commandName: CommandNames, localId?: string, commandRecord?: Record<string, any>): Promise<void | null | Record<string, any>> {
    const storedVersion = localId ? await SyncService.get(resourceType, localId) : null;
    let newCommandName = commandName;
    if (storedVersion && commandName == CommandNames.Create) {
      newCommandName = CommandNames.Update;
    }
    // handle read operations, don't add them to the queue
    if (newCommandName == CommandNames.Read) {
      const command = SyncService.generateCommand({resourceType, commandName: CommandNames.Read, localId});
      if (!command) {
        console.error('Cannot add read command: unrecognized type/command name');
        return;
      }
      const {retrievedResources} = await command.execute();
      if (!retrievedResources || retrievedResources.length == 0) {
        console.error('No resources found');
        return;
      } else {
        const remoteResource = retrievedResources[0];
        if (remoteResource.data.updatedAt > storedVersion?.updatedAt) {
          await SyncService.saveResource(resourceType, localId!, remoteResource.data);
          return remoteResource.data;
        } else {
          return storedVersion;
        }
      }
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
      console.log('No changes to save');
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
  private static async get(type: SyncResourceTypes, localId: string): Promise<Record<string, any> | null> {
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
  static async startSync(): Promise<void> {
    await SyncService.loadQueues();
    if (this.syncInterval) {
      return;
    }
    this.syncInterval = setInterval(() => {
      this.sync();
    }, 1000);
  }
  static async sync(): Promise<void> {
    const remainingCommands = this.queue.length - this.inProgressQueue.length;
    console.log(`In progress: ${this.inProgressQueue.length}, Waiting: ${remainingCommands}, Completed: ${this.completedCommands}`);
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
      command.execute().then(async ({success, newResources, updatedResources, deletedResources}) => {
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