import { SyncService } from "../src/SyncService";
import * as fs from "fs";
import { CommandDeleteFolder } from "./testOperations/DeleteFolder";
import { CommandCreateFolder } from "./testOperations/CreateFolder";
import { CommandUpdateFolder } from "./testOperations/UpdateFolder";
import { CommandNames } from "../src/CommandNames";
import { CommandReadAllFolders } from "./testOperations/ReadAllFolders";
import { ISyncResource } from "../src/ISyncResource";
import { mapToCommandFunc } from "../src/SyncData";

const mapToCommand: mapToCommandFunc = (
  commandName,
  resourceId,
  resourceInfo
) => {
  switch (commandName) {
    case CommandNames.Delete:
      return new CommandDeleteFolder(resourceId);
    case CommandNames.Create:
      return new CommandCreateFolder(
        resourceInfo!.data,
        resourceId,
        resourceInfo!.updatedAt
      );
    case CommandNames.Update:
      return new CommandUpdateFolder(
        resourceInfo!.data,
        resourceId,
        resourceInfo!.updatedAt
      );
    default:
      throw new Error("Invalid commandName");
  }
};

async function getCloudSyncDate() {
  return new Date();
}

async function saveToStorage(name: string, data: string) {
  if (!fs.existsSync("./test/data")) {
    fs.mkdirSync("./test/data");
  }
  fs.writeFileSync(`./test/data/${name}`, data);
}

async function loadFromStorage(name: string) {
  if (!fs.existsSync(`./test/data/${name}`)) {
    return null;
  }
  return fs.readFileSync(`./test/data/${name}`).toString();
}

export function setupSyncService(initialFolders: ISyncResource[]) {
  SyncService.initialize(
    getCloudSyncDate,
    mapToCommand,
    saveToStorage,
    loadFromStorage,
    [new CommandReadAllFolders(initialFolders)]
  );
  SyncService.config.setSecondsBetweenSyncs(1);
  SyncService.config.setOnlineChecker(async () => true);
  SyncService.config.setMaxConcurrentRequests(1);
  SyncService.config.setDebug(true);
  SyncService.startSync();
}

export function cleanupSyncService() {
  SyncService.stopSync();
  if (fs.existsSync("./test/data/sync-service-data")) {
    fs.unlinkSync("./test/data/sync-service-data");
  }
  if (fs.existsSync("./test/data/sync-service-state")) {
    fs.unlinkSync("./test/data/sync-service-state");
  }
  if (fs.existsSync("./test/data")) {
    fs.rmdirSync("./test/data");
  }
}
