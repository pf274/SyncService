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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncData = void 0;
const CommandNames_1 = require("./CommandNames");
const crypto_js_1 = __importDefault(require("crypto-js"));
const SyncServiceBaseCommands_1 = require("./SyncServiceBaseCommands");
class SyncData {
    static updateLocalResources(cloudSyncDate, initializationCommands) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_a.debug) {
                console.log("Updating local resources...");
            }
            const localResourcesOutOfDate = _a.syncDate == null || _a.syncDate < cloudSyncDate;
            if (!localResourcesOutOfDate) {
                return;
            }
            if (!initializationCommands) {
                if (_a.debug) {
                    console.log("Local resources are out of date. No initialization commands provided.");
                }
                _a.syncDate = cloudSyncDate;
                return;
            }
            // local resources are out of date
            let remainingCommands = [...initializationCommands];
            do {
                const promises = initializationCommands
                    .slice(0, _a.maxConcurrentRequests)
                    .map((command) => __awaiter(this, void 0, void 0, function* () {
                    if (_a.debug) {
                        console.log(`Executing initialization command for resources of type '${command.resourceType}'...`);
                    }
                    const retrievedRecords = yield command.getCloudCopies();
                    if (_a.debug) {
                        console.log(`Retrieved ${(retrievedRecords === null || retrievedRecords === void 0 ? void 0 : retrievedRecords.length) || 0} resources of type '${command.resourceType}'`);
                    }
                    if (retrievedRecords && retrievedRecords.length > 0) {
                        yield _a.saveResources(retrievedRecords, true, false);
                    }
                    remainingCommands = remainingCommands.filter((otherCommand) => otherCommand.commandId !== command.commandId);
                }));
                yield Promise.all(promises);
            } while (remainingCommands.length > 0);
            _a.syncDate = cloudSyncDate;
        });
    }
    /**
     * Attempts to merge the specified command with another command in the queue. If a cancel is successful, the original command will be removed.
     * @returns True if a command was canceled, false otherwise.
     */
    static attemptCancel(command) {
        const cancelableCommand = _a.queue.find((otherCommand) => otherCommand.canCancelOut(command));
        if (cancelableCommand) {
            _a.queue = _a.queue.filter((otherCommand) => otherCommand.commandId !== cancelableCommand.commandId);
            if (_a.debug) {
                console.log("Removed cancelled command from the queue");
            }
        }
        return Boolean(cancelableCommand);
    }
    /**
     * Attempts to merge the specified command with another command in the queue. If a merge is successful, the original command will be removed.
     * @returns True if a command was merged, false otherwise.
     */
    static attemptMerge(command) {
        const mergeableCommand = _a.queue.find((otherCommand) => otherCommand.canMerge(command));
        if (mergeableCommand) {
            if (_a.debug) {
                console.log("Merging commands...");
            }
            const mergedCommand = _a.getMergedCommand(mergeableCommand, command);
            if (mergedCommand) {
                if (_a.debug) {
                    console.log(`Merged command: ${JSON.stringify(mergedCommand, null, 2)}`);
                }
                _a.queue = _a.queue.filter((otherCommand) => otherCommand.commandId !== mergeableCommand.commandId);
                _a.queue.push(mergedCommand);
                _a.queue.sort((a, b) => a.commandCreationDate.getTime() - b.commandCreationDate.getTime());
                if (_a.debug) {
                    console.log(`Added merged command to the queue. New queue:\n${JSON.stringify(_a.queue, null, 2)}`);
                }
            }
            return Boolean(mergedCommand);
        }
        return false;
    }
    static simplifyResourceInfo(newResourceInfo, existingResourceInfo) {
        let simplifiedData = newResourceInfo.data;
        if (existingResourceInfo === null || existingResourceInfo === void 0 ? void 0 : existingResourceInfo.data) {
            simplifiedData = Object.fromEntries(Object.entries(simplifiedData).filter(([key, value]) => existingResourceInfo.data[key] !== value));
        }
        if (_a.debug) {
            console.log("Simplified version:", simplifiedData);
        }
        newResourceInfo.data = simplifiedData;
    }
    static convertCreateToUpdate(command) {
        const createCommand = command;
        const updateCommand = _a.mapToCommand(CommandNames_1.CommandNames.Update, createCommand.resourceId, createCommand.resourceInfo);
        if (updateCommand) {
            updateCommand.resourceInfo = createCommand.resourceInfo;
            updateCommand.commandCreationDate = createCommand.commandCreationDate;
            updateCommand.commandId = createCommand.commandId;
            if (_a.debug) {
                console.log("Converted create command to update command");
            }
            return updateCommand;
        }
        throw new Error("Cannot add create command: resource already exists");
    }
    static shouldUpdateResource(localVersion, cloudVersion) {
        if (!localVersion && cloudVersion) {
            return { shouldUpdate: true, versionToUse: cloudVersion };
        }
        else if (localVersion && !cloudVersion) {
            return { shouldUpdate: false, versionToUse: localVersion };
        }
        else if (localVersion &&
            cloudVersion &&
            cloudVersion.updatedAt > localVersion.updatedAt) {
            return { shouldUpdate: true, versionToUse: cloudVersion };
        }
        else {
            return { shouldUpdate: false, versionToUse: localVersion };
        }
    }
    static getRecordsToCompare(command) {
        return __awaiter(this, void 0, void 0, function* () {
            const localData = (yield _a.loadFromStorage(`${_a.storagePrefix}-data`));
            const cloudRecords = yield command.getCloudCopies();
            const localRecords = Object.keys(localData[command.resourceType] || {}).map((resourceId) => ({
                resourceId,
                resourceType: command.resourceType,
                data: localData[command.resourceType][resourceId],
                updatedAt: new Date(localData[command.resourceType][resourceId].updatedAt),
            }));
            return { cloudRecords, localRecords };
        });
    }
    /**
     * Merges two commands into a single command, or returns null if the commands cannot be merged.
     */
    static getMergedCommand(command1, command2) {
        const commands = [command1, command2].sort((a, b) => a.commandCreationDate.getTime() - b.commandCreationDate.getTime());
        const resourceDeleted = commands[1] instanceof SyncServiceBaseCommands_1.DeleteCommand;
        if (resourceDeleted) {
            return commands[1];
        }
        const mergedCommand = _a.mapToCommand(commands[0].commandName, commands[0].resourceId, commands[0].resourceInfo);
        if (mergedCommand) {
            mergedCommand.commandCreationDate = commands[0].commandCreationDate;
            mergedCommand.commandId = commands[0].commandId;
            // update command record
            const earlierRecord = commands[0].resourceInfo.data;
            const laterRecord = commands[1].resourceInfo.data;
            if (earlierRecord && laterRecord) {
                mergedCommand.resourceInfo.data = Object.assign(Object.assign({}, earlierRecord), laterRecord);
            }
            else if (laterRecord) {
                mergedCommand.resourceInfo.data = laterRecord;
            }
            return mergedCommand;
        }
        else {
            if (_a.debug) {
                console.error("Cannot merge commands.");
            }
            return null;
        }
    }
    /**
     * Saves resources to a local JSON file.
     *
     * This function will wait for any previous save operation to complete before starting.
     * It will read the existing data from the file, merge it with the new data, and then write it back to the file.
     * If the file does not exist, it will be created.
     * @returns A promise that resolves when the save operation has completed.
     */
    static saveResources(newResources_1, synced_1) {
        return __awaiter(this, arguments, void 0, function* (newResources, synced, notifyListeners = true) {
            if (newResources.length == 0) {
                return;
            }
            const resourceTypes = [
                ...new Set(newResources.map((resource) => resource.resourceType)),
            ];
            if (_a.debug) {
                console.log(`Saving ${synced ? "synced " : ""}resources of type${resourceTypes.length > 1 ? "s" : ""} ${resourceTypes.join(", ")}`);
            }
            _a.savingDataPromise = _a.savingDataPromise.then(() => __awaiter(this, void 0, void 0, function* () {
                const newData = (yield _a.loadFromStorage(`${_a.storagePrefix}-data`));
                for (const newResource of newResources) {
                    const resourceType = newResource.resourceType;
                    const resourceId = newResource.resourceId;
                    if (!newData[resourceType]) {
                        newData[resourceType] = {};
                    }
                    newData[resourceType][resourceId] = newResource;
                }
                yield _a.saveData(newData);
                if (notifyListeners) {
                    for (const resourceType of resourceTypes) {
                        if (_a.resourceListeners[resourceType]) {
                            const callbackFunction = _a.resourceListeners[resourceType];
                            callbackFunction(Object.values(newData[resourceType]));
                        }
                    }
                }
            }));
            return _a.savingDataPromise;
        });
    }
    /**
     * Deletes a resource from the local JSON file.
     *
     * This function will wait for any previous save operation to complete before starting.
     * It will read the existing data from the file, remove the specified resource, and then write it back to the file.
     * If the resource is not found, this function will do nothing.
     * @returns A promise that resolves when the delete operation has completed.
     */
    static deleteResource(resourceType, resourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_a.debug) {
                console.log(`Deleting ${resourceType} with resourceId ${resourceId}`);
            }
            _a.savingDataPromise = _a.savingDataPromise.then(() => __awaiter(this, void 0, void 0, function* () {
                const newData = (yield _a.loadFromStorage(`${_a.storagePrefix}-data`));
                if (!newData[resourceType]) {
                    newData[resourceType] = {};
                }
                if (newData[resourceType][resourceId]) {
                    delete newData[resourceType][resourceId];
                }
                yield _a.saveData(newData);
                if (_a.resourceListeners[resourceType]) {
                    const callbackFunction = _a.resourceListeners[resourceType];
                    callbackFunction(Object.values(newData[resourceType]));
                }
            }));
            return _a.savingDataPromise;
        });
    }
    /**
     * Saves the current state of the queues and sync date.
     *
     * This method will wait for any previous save operation to complete before starting.
     * It reads the previously saved state (if it was saved before), merges it with the current state, and then writes it back to storage.
     *
     * @returns A promise that resolves when the save operation has completed.
     */
    static saveState() {
        return __awaiter(this, void 0, void 0, function* () {
            _a.savingQueuePromise = _a.savingQueuePromise.then(() => __awaiter(this, void 0, void 0, function* () {
                const newData = {
                    queue: _a.queue,
                    errorQueue: _a.errorQueue,
                    syncDate: _a.syncDate,
                    deletedResourceIds: _a.deletedResourceIds,
                };
                yield _a.saveToStorage(`${_a.storagePrefix}-state`, newData);
            }));
            return _a.savingQueuePromise;
        });
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
    static loadState() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!_a.mapToCommand) {
                throw new Error("Map to command function is not set");
            }
            const data = (yield _a.loadFromStorage(`${_a.storagePrefix}-state`));
            _a.queue = [];
            _a.errorQueue = [];
            const queues = { queue: _a.queue, errorQueue: _a.errorQueue };
            for (const [queueName, queueArray] of Object.entries(queues)) {
                for (const savedCommand of queueName == "queue"
                    ? data.queue
                    : queueName == "errorQueue"
                        ? data.errorQueue
                        : []) {
                    const commandInstance = _a.mapToCommand(savedCommand.commandName, savedCommand.resourceId, savedCommand === null || savedCommand === void 0 ? void 0 : savedCommand.resourceInfo);
                    if (!commandInstance) {
                        if (_a.debug) {
                            console.error("Failed to restore command from JSON", savedCommand);
                        }
                        continue;
                    }
                    if (savedCommand.commandId) {
                        commandInstance.commandId = savedCommand.commandId;
                    }
                    if (savedCommand.commandCreationDate) {
                        commandInstance.commandCreationDate = new Date(savedCommand.commandCreationDate);
                    }
                    queueArray.push(commandInstance);
                }
            }
            _a.syncDate = data.syncDate ? new Date(data.syncDate) : null;
            _a.deletedResourceIds = data.deletedResourceIds || [];
        });
    }
    /**
     * Retrieves a resource from the local JSON file.
     * This method will read the contents of the file, parse it as JSON, and return the specified resource.
     * If the file does not exist, or the resource is not found, it will return null.
     * @returns The specified resource, or null if it is not found
     */
    static getLocalResource(type, resourceId) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = (yield _a.loadFromStorage(`${_a.storagePrefix}-data`));
            if (!data[type]) {
                return undefined;
            }
            if (!data[type][resourceId]) {
                return undefined;
            }
            return data[type][resourceId];
        });
    }
}
exports.SyncData = SyncData;
_a = SyncData;
SyncData.queue = [];
SyncData.errorQueue = [];
SyncData.inProgressQueue = [];
SyncData.maxConcurrentRequests = 3;
SyncData.minCommandAgeInSeconds = 0;
SyncData.secondsBetweenSyncs = 5;
SyncData.savingDataPromise = Promise.resolve();
SyncData.savingQueuePromise = Promise.resolve();
SyncData.completedCommands = 0;
SyncData.syncDate = null;
SyncData.encryptionKey = null;
SyncData.online = true;
SyncData.storagePrefix = "sync-service";
SyncData.encrypt = false;
SyncData.mapToCommand = null;
SyncData.debug = false;
SyncData.resourceListeners = {};
SyncData.deletedResourceIds = [];
SyncData.getCloudSyncDate = () => __awaiter(void 0, void 0, void 0, function* () {
    throw new Error("getCloudSyncDate not set");
});
SyncData.initialized = false;
/**
 * May be overridden to provide a custom implementation of the isOnline function.
 */
SyncData.getIsOnline = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch("https://www.google.com", {
            method: "HEAD",
            mode: "no-cors",
        });
        return response.ok;
    }
    catch (err) {
        return false;
    }
});
/**
 * Saves the resource data document to storage.
 */
SyncData.saveData = (data) => __awaiter(void 0, void 0, void 0, function* () {
    yield _a.saveToStorage(`${_a.storagePrefix}-data`, data);
});
/**
 * Saves data to storage
 */
SyncData.saveToStorage = (name, data) => __awaiter(void 0, void 0, void 0, function* () {
    let dataString = typeof data == "string" ? data : JSON.stringify(data);
    if (_a.encrypt && _a.encryptionKey) {
        dataString = crypto_js_1.default.AES.encrypt(dataString, _a.encryptionKey).toString();
    }
    yield _a.saveToStorageHelper(name, dataString);
});
/**
 * Must be overridden to provide a custom implementation of the saveToStorage function.
 */
SyncData.saveToStorageHelper = (name, data) => __awaiter(void 0, void 0, void 0, function* () {
    throw new Error("No storage available");
});
/**
 * Loads data from storage
 */
SyncData.loadFromStorage = (name) => __awaiter(void 0, void 0, void 0, function* () {
    let data = yield _a.loadFromStorageHelper(name);
    if (!data) {
        return {};
    }
    if (_a.encrypt &&
        _a.encryptionKey &&
        typeof data === "string") {
        data = crypto_js_1.default.AES.decrypt(data, _a.encryptionKey).toString(crypto_js_1.default.enc.Utf8);
    }
    let returnVal = JSON.parse(data);
    while (typeof returnVal === "string") {
        returnVal = JSON.parse(returnVal);
    }
    return returnVal;
});
/**
 * Must be overridden to provide a custom implementation of the loadFromStorage function.
 */
SyncData.loadFromStorageHelper = (name) => __awaiter(void 0, void 0, void 0, function* () {
    throw new Error("No storage available");
});
