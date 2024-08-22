import { SyncService } from "../src/SyncService";
import * as fs from "fs";
import { CommandDeleteFolder } from "./testOperations/DeleteFolder";
import { CommandCreateFolder } from "./testOperations/CreateFolder";
import { CommandUpdateFolder } from "./testOperations/UpdateFolder";
import { CommandNames } from "../src/interfaces/CommandNames";
import { CommandReadAllFolders } from "./testOperations/ReadAllFolders";
import { ISyncResource } from "../src/interfaces/ISyncResource";
import { mapToCommandFunc } from "../src/SyncData";

const mapToCommand: mapToCommandFunc = (commandName, localId, resourceInfo) => {
  switch (commandName) {
    case CommandNames.Delete:
      return new CommandDeleteFolder(localId);
    case CommandNames.Create:
      return new CommandCreateFolder(
        resourceInfo!.data,
        localId,
        resourceInfo!.updatedAt
      );
    case CommandNames.Update:
      return new CommandUpdateFolder(
        resourceInfo!.data,
        localId,
        resourceInfo!.updatedAt
      );
    default:
      throw new Error("Invalid commandName");
  }
};

async function getCloudSyncDate() {
  return new Date();
}

export function setupSyncService(initialFolders: ISyncResource[]) {
  SyncService.config.setSaveToStorage(async (name: string, data: string) => {
    fs.writeFileSync(`./test/data/${name}`, data);
  });
  SyncService.config.setLoadFromStorage(async (name: string) => {
    if (!fs.existsSync(`./test/data/${name}`)) {
      return null;
    }
    return fs.readFileSync(`./test/data/${name}`).toString();
  });
  SyncService.config.setSecondsBetweenSyncs(1);
  SyncService.config.setOnlineChecker(async () => true);
  SyncService.config.setMaxConcurrentRequests(1);
  SyncService.config.setDebug(true);
  SyncService.startSync(getCloudSyncDate, mapToCommand, [
    new CommandReadAllFolders(initialFolders),
  ]);
}

export function cleanupSyncService() {
  SyncService.stopSync();
  if (fs.existsSync("./test/data/sync-service-data")) {
    fs.unlinkSync("./test/data/sync-service-data");
  }
  if (fs.existsSync("./test/data/sync-service-state")) {
    fs.unlinkSync("./test/data/sync-service-state");
  }
}
