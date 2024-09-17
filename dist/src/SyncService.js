"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncService = void 0;
const SyncData_1 = require("./SyncData");
const SyncServiceBaseCommands_1 = require("./SyncServiceBaseCommands");
class SyncService {
    static getConfig() {
        return {
            maxConcurrentRequests: SyncData_1.SyncData.maxConcurrentRequests,
            minCommandAgeInSeconds: SyncData_1.SyncData.minCommandAgeInSeconds,
            secondsBetweenSyncs: SyncData_1.SyncData.secondsBetweenSyncs,
            storagePrefix: SyncData_1.SyncData.storagePrefix,
            encrypt: SyncData_1.SyncData.encrypt,
        };
    }
    static get config() {
        return {
            enableEncryption: (encryptionKey) => {
                SyncData_1.SyncData.encrypt = true;
                SyncData_1.SyncData.encryptionKey = encryptionKey;
            },
            disableEncryption: () => {
                SyncData_1.SyncData.encrypt = false;
                SyncData_1.SyncData.encryptionKey = null;
            },
            setOnlineChecker: (func) => {
                SyncData_1.SyncData.getIsOnline = func;
            },
            setStoragePrefix: (prefix) => {
                SyncData_1.SyncData.storagePrefix = prefix;
            },
            setMinCommandAgeInSeconds: (seconds) => {
                SyncData_1.SyncData.minCommandAgeInSeconds = Math.max(0, seconds);
            },
            setMaxConcurrentRequests: (numConcurrentRequests) => {
                SyncData_1.SyncData.maxConcurrentRequests = Math.max(1, numConcurrentRequests);
            },
            setSecondsBetweenSyncs: (seconds) => {
                SyncData_1.SyncData.secondsBetweenSyncs = Math.max(1, seconds);
                if (SyncService.syncInterval) {
                    clearInterval(SyncService.syncInterval);
                    SyncService.syncInterval = setInterval(() => {
                        this.sync();
                    }, SyncData_1.SyncData.secondsBetweenSyncs * 1000);
                }
            },
            setResourceListener: (resourceType, listener) => {
                SyncData_1.SyncData.resourceListeners[resourceType] = listener;
            },
            setDebug(enabled) {
                SyncData_1.SyncData.debug = enabled;
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
    static read(command) {
        return __awaiter(this, void 0, void 0, function* () {
            const { cloudRecords, localRecords } = yield SyncData_1.SyncData.getRecordsToCompare(command);
            const resourceIdsToProcess = [
                ...new Set([...cloudRecords, ...localRecords].map((record) => record.resourceId)),
            ];
            const recordsToReturn = [];
            const recordsToUpdate = [];
            for (const resourceId of resourceIdsToProcess) {
                const cloudVersion = cloudRecords.find((record) => record.resourceId === resourceId);
                const localVersion = localRecords.find((record) => record.resourceId === resourceId);
                if (!localVersion && cloudVersion && SyncData_1.SyncData.deletedResourceIds.includes(resourceId)) {
                    continue; // skip deleted resources
                }
                const { shouldUpdate, versionToUse } = SyncData_1.SyncData.shouldUpdateResource(localVersion, cloudVersion);
                if (shouldUpdate) {
                    recordsToUpdate.push(versionToUse);
                }
                recordsToReturn.push(versionToUse.data);
            }
            if (recordsToUpdate.length > 0) {
                yield SyncData_1.SyncData.saveResources(recordsToUpdate, true);
            }
            return recordsToReturn;
        });
    }
    /**
     * If the command is a read operation, it will be executed immediately and the result will be returned.
     *
     * If the command is a write operation, it will be added to the queue for processing.
     *
     * For read operations, you can also use SyncService.read(command) to execute the command immediately.
     * @returns A promise that resolves with the result of the command if the command is a read operation, or null if the command is a write operation.
     */
    static addCommand(newCommand) {
        return __awaiter(this, void 0, void 0, function* () {
            if (newCommand instanceof SyncServiceBaseCommands_1.GetInfoCommand) {
                return SyncService.read(newCommand);
            }
            let command = newCommand;
            // convert create commands to update commands for existing resources
            const existingResource = yield SyncData_1.SyncData.getLocalResource(command.resourceType, command.resourceId);
            if (existingResource && command instanceof SyncServiceBaseCommands_1.CreateCommand) {
                command = SyncData_1.SyncData.convertCreateToUpdate(command);
            }
            // locally handle write and delete operations immediately
            if (command instanceof SyncServiceBaseCommands_1.NewInfoCommand) {
                SyncData_1.SyncData.simplifyResourceInfo(command.resourceInfo, existingResource);
                if (Object.keys(command.resourceInfo.data).length == 0) {
                    if (SyncData_1.SyncData.debug) {
                        console.log("No changes to save. Command not added to Sync Service.");
                    }
                    return null;
                }
                yield SyncData_1.SyncData.saveResources([command.resourceInfo], false);
            }
            else if (command instanceof SyncServiceBaseCommands_1.DeleteCommand) {
                yield SyncData_1.SyncData.deleteResource(command.resourceType, command.resourceId);
                SyncData_1.SyncData.deletedResourceIds.push(command.resourceId);
            }
            else {
                throw new Error("Invalid command type");
            }
            const canceled = SyncData_1.SyncData.attemptCancel(command);
            const merged = canceled ? false : SyncData_1.SyncData.attemptMerge(command);
            if (!canceled && !merged) {
                if (SyncData_1.SyncData.debug) {
                    console.log("Adding command to the queue");
                }
                SyncData_1.SyncData.queue.push(command);
            }
            yield SyncData_1.SyncData.saveState();
            return null;
        });
    }
    static initialize(getCloudSyncDate, mapToCommand, saveToStorage, loadFromStorage, initializationCommands) {
        return __awaiter(this, void 0, void 0, function* () {
            SyncData_1.SyncData.saveToStorageHelper = saveToStorage;
            SyncData_1.SyncData.loadFromStorageHelper = loadFromStorage;
            SyncData_1.SyncData.mapToCommand = mapToCommand;
            SyncData_1.SyncData.initializationCommands = initializationCommands;
            SyncData_1.SyncData.getCloudSyncDate = getCloudSyncDate;
            SyncData_1.SyncData.initialized = true;
        });
    }
    static get initialized() {
        return SyncData_1.SyncData.initialized;
    }
    /**
     * Starts the sync process.
     * This method will load the queues from the local JSON file, and then start the sync interval.
     * If the sync interval is already running, this method will do nothing.
     */
    static startSync() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!SyncData_1.SyncData.initialized) {
                throw new Error("Sync Service not initialized.");
            }
            if (this.syncInterval) {
                if (SyncData_1.SyncData.debug) {
                    console.log("Sync service already started.");
                }
                return;
            }
            if (SyncData_1.SyncData.debug) {
                console.log("Starting sync service...");
            }
            try {
                yield SyncData_1.SyncData.loadState();
                const cloudSyncDate = yield SyncData_1.SyncData.getCloudSyncDate();
                yield SyncData_1.SyncData.updateLocalResources(cloudSyncDate, SyncData_1.SyncData.initializationCommands);
                if (SyncData_1.SyncData.debug) {
                    console.log("Notifying resource listeners of initial data...");
                }
                const data = (yield SyncData_1.SyncData.loadFromStorage(`${SyncData_1.SyncData.storagePrefix}-data`));
                for (const resourceType of Object.keys(SyncData_1.SyncData.resourceListeners)) {
                    if (data[resourceType]) {
                        const callbackFunction = SyncData_1.SyncData.resourceListeners[resourceType];
                        callbackFunction(Object.values(data[resourceType]));
                    }
                }
                // check if error commands should be re-added to the queue
                for (const command of SyncData_1.SyncData.errorQueue) {
                    if (SyncData_1.SyncData.syncDate &&
                        command.commandCreationDate.getTime() > SyncData_1.SyncData.syncDate.getTime()) {
                        SyncData_1.SyncData.queue.push(command);
                        SyncData_1.SyncData.errorQueue = SyncData_1.SyncData.errorQueue.filter((errorCommand) => errorCommand.commandId !== command.commandId);
                    }
                }
                SyncData_1.SyncData.queue.sort((a, b) => a.commandCreationDate.getTime() - b.commandCreationDate.getTime());
                yield SyncData_1.SyncData.saveState();
                this.syncInterval = setInterval(() => {
                    this.sync();
                }, SyncData_1.SyncData.secondsBetweenSyncs * 1000);
                if (SyncData_1.SyncData.debug) {
                    console.log("Sync Service Started.");
                }
            }
            catch (err) {
                if (SyncData_1.SyncData.debug) {
                    console.error("Error starting sync service:", err);
                }
            }
        });
    }
    /**
     * Executes the sync process every interval.
     * This method will check the current state of the queues and execute any commands that are eligible.
     * It will also remove any completed commands from the queue.
     * If there are no commands to execute, or the maximum number of concurrent requests has been reached, this method will do nothing.
     * If a command fails, it will be added to the error queue.
     */
    static sync() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // check if device is online
                const isOnline = yield SyncData_1.SyncData.getIsOnline();
                if (isOnline !== SyncData_1.SyncData.online) {
                    SyncData_1.SyncData.online = isOnline;
                    if (SyncData_1.SyncData.debug) {
                        console.log(`Device is ${SyncData_1.SyncData.online ? "on" : "off"}line`);
                    }
                }
                const remainingCommands = SyncData_1.SyncData.queue.length - SyncData_1.SyncData.inProgressQueue.length;
                const availableSlots = Math.max(SyncData_1.SyncData.maxConcurrentRequests - SyncData_1.SyncData.inProgressQueue.length, 0);
                if (SyncData_1.SyncData.debug) {
                    console.log(`In progress: ${SyncData_1.SyncData.inProgressQueue.length}/${SyncData_1.SyncData.maxConcurrentRequests}, Waiting: ${remainingCommands}, Completed: ${SyncData_1.SyncData.completedCommands}, Errors: ${SyncData_1.SyncData.errorQueue.length}`);
                }
                if (!SyncData_1.SyncData.online) {
                    return;
                }
                // check if there are any commands to execute
                const commandIdsInProgress = SyncData_1.SyncData.inProgressQueue.map((command) => command.commandId);
                const resourceIdsInProgress = SyncData_1.SyncData.inProgressQueue.map((command) => command.resourceId);
                function notAlreadyInProgress(command) {
                    return (!commandIdsInProgress.includes(command.commandId) &&
                        !resourceIdsInProgress.includes(command.resourceId));
                }
                function isOldEnough(command) {
                    return (command.commandCreationDate.getTime() <=
                        new Date().getTime() - SyncData_1.SyncData.minCommandAgeInSeconds * 1000);
                }
                const commandsEligible = SyncData_1.SyncData.queue.filter(notAlreadyInProgress).filter(isOldEnough);
                const commandsToRun = availableSlots == 0 ? [] : commandsEligible.slice(0, availableSlots);
                for (const command of commandsToRun) {
                    SyncData_1.SyncData.inProgressQueue.push(command);
                    if (SyncData_1.SyncData.debug) {
                        console.log(`Executing command: ${command.commandName} ${command.resourceType}`, command);
                    }
                    new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
                        var _a;
                        try {
                            const response = yield command.sync();
                            const newSyncDate = response.newSyncDate;
                            const newResourceInfo = response.newResourceInfo;
                            SyncData_1.SyncData.queue = SyncData_1.SyncData.queue.filter((queuedCommand) => queuedCommand.commandId !== command.commandId);
                            SyncData_1.SyncData.inProgressQueue = SyncData_1.SyncData.inProgressQueue.filter((inProgressCommand) => inProgressCommand.commandId !== command.commandId);
                            if (command instanceof SyncServiceBaseCommands_1.DeleteCommand) {
                                SyncData_1.SyncData.deletedResourceIds = SyncData_1.SyncData.deletedResourceIds.filter((resourceId) => resourceId !== command.resourceId);
                            }
                            if (newSyncDate) {
                                SyncData_1.SyncData.completedCommands++;
                                const mostRecentTime = Math.max(((_a = SyncData_1.SyncData.syncDate) === null || _a === void 0 ? void 0 : _a.getTime()) || 0, newSyncDate.getTime());
                                SyncData_1.SyncData.syncDate = new Date(mostRecentTime);
                                if (command instanceof SyncServiceBaseCommands_1.DeleteCommand) {
                                    if (SyncData_1.SyncData.debug) {
                                        console.log("Deleting resource from API response:", command);
                                    }
                                    yield SyncData_1.SyncData.deleteResource(command.resourceType, command.resourceId);
                                }
                                else if (command instanceof SyncServiceBaseCommands_1.NewInfoCommand) {
                                    if (!newResourceInfo) {
                                        throw new Error("Create/Update command did not return a new resource.");
                                    }
                                    if (SyncData_1.SyncData.debug) {
                                        console.log("Saving resource from API response:", command);
                                    }
                                    yield SyncData_1.SyncData.saveResources([newResourceInfo], true);
                                }
                            }
                            else {
                                if (SyncData_1.SyncData.debug) {
                                    console.log("Command did not return a new sync date:", command);
                                }
                                SyncData_1.SyncData.errorQueue.push(command);
                            }
                            yield SyncData_1.SyncData.saveState();
                        }
                        catch (err) {
                            if (SyncData_1.SyncData.debug) {
                                console.error("Command failed:", err);
                            }
                            SyncData_1.SyncData.errorQueue.push(command);
                        }
                        resolve(true);
                    }));
                }
            }
            catch (err) {
                if (SyncData_1.SyncData.debug) {
                    console.error("Error during sync:", err);
                }
            }
        });
    }
    static stopSync() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.syncInterval) {
                if (SyncData_1.SyncData.debug) {
                    console.log("Stopping sync service...");
                }
                clearInterval(this.syncInterval);
                this.syncInterval = null;
                if (SyncData_1.SyncData.debug) {
                    console.log("Sync service stopped.");
                }
            }
            else if (SyncData_1.SyncData.debug) {
                console.log("Sync service already stopped.");
            }
        });
    }
}
exports.SyncService = SyncService;
SyncService.syncInterval = null;
