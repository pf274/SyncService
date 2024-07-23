import { ICommand } from "./ICommand";
import { ISyncResource, SyncResourceTypes } from "./ISyncResource";
import { ISyncService, ISyncServiceInstance } from "./ISyncService";
import * as fs from 'fs';
import { ParentCommand } from "./ParentCommand";
import { CommandCreateVideo } from "./commands/CommandCreateVideo";

class SyncService implements ISyncServiceInstance {
  static queue: ICommand[] = [];
  static errorQueue: ICommand[] = [];
  static inProgressQueue: ICommand[] = [];
  static syncInterval: NodeJS.Timeout | null = null;
  static maxConcurrentRequests = 3;
  static async saveResource(type: SyncResourceTypes, localId: string, data: Record<string, any>): Promise<void> {
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
    newData[type][localId] = data;
    fs.writeFileSync('./data.json', JSON.stringify(newData, null, 2));
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
      const commandInstance: ICommand | null = SyncService.restoreCommandFromJSON(commandRecord);
      if (commandInstance) {
        SyncService.queue.push(commandInstance);
      } else {
        console.error('Failed to restore command from JSON', commandRecord);
      }
    }
    SyncService.errorQueue = [];
    for (const commandRecord of data.errorQueue) {
      const commandInstance: ICommand | null = SyncService.restoreCommandFromJSON(commandRecord);
      if (commandInstance) {
        SyncService.errorQueue.push(commandInstance);
      } else {
        console.error('Failed to restore command from JSON', commandRecord);
      }
    }
  }
  static restoreCommandFromJSON(commandRecord: Record<string, any>): ICommand | null {
    if (commandRecord.resourceType = SyncResourceTypes.Video) {
      if (commandRecord.commandName === 'create') {
        return new CommandCreateVideo(commandRecord as any, commandRecord.commandId);
      }
    }
    return null;
  }
  static async addWrite(resourceType: SyncResourceTypes, localId: string, command: ICommand): Promise<void> {
    const storedVersion = await SyncService.get(resourceType, localId);
    SyncService.queue.push(command);
    await SyncService.saveQueues();
  }
  static async get(type: SyncResourceTypes, localId: string): Promise<Record<string, any> | null> {
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
    console.log(`In progress: ${this.inProgressQueue.length}, Waiting: ${remainingCommands}`);
    if (this.queue.length === 0) {
      return;
    }
    if (this.inProgressQueue.length >= SyncService.maxConcurrentRequests) {
      return;
    }
    const command = this.queue.find((command) => this.inProgressQueue.map((command) => command.commandId).includes(command.commandId) == false);
    if (!command) {
      return;
    }
    this.inProgressQueue.push(command as ICommand);
    const {success, newOrUpdatedResources, deletedResources} = await command.execute();
    if (success) {
      console.log('Command succeeded');
      for (const resource of newOrUpdatedResources) {
        await this.saveResource(command.resourceType, resource.localId, resource.data);
      }
      this.queue = this.queue.filter((queuedCommand) => queuedCommand.commandId !== command.commandId);
      this.inProgressQueue = this.inProgressQueue.filter((inProgressCommand) => inProgressCommand.commandId !== command.commandId);
    } else {
      console.log('Command failed');
      this.errorQueue.push(command as ICommand);
    }
    await SyncService.saveQueues();
  }
}

const SyncServiceStatic: ISyncService = SyncService;

export {SyncServiceStatic as SyncService};