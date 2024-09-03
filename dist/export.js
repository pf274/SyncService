"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAllResourcesOfTypeCommand = exports.DeleteCommand = exports.UpdateCommand = exports.ReadCommand = exports.CreateCommand = exports.CommandNames = exports.SyncService = void 0;
const CommandNames_1 = require("./src/interfaces/CommandNames");
Object.defineProperty(exports, "CommandNames", { enumerable: true, get: function () { return CommandNames_1.CommandNames; } });
const SyncService_1 = require("./src/SyncService");
Object.defineProperty(exports, "SyncService", { enumerable: true, get: function () { return SyncService_1.SyncService; } });
const SyncServiceBaseCommands_1 = require("./src/SyncServiceBaseCommands");
Object.defineProperty(exports, "CreateCommand", { enumerable: true, get: function () { return SyncServiceBaseCommands_1.CreateCommand; } });
Object.defineProperty(exports, "DeleteCommand", { enumerable: true, get: function () { return SyncServiceBaseCommands_1.DeleteCommand; } });
Object.defineProperty(exports, "GetAllResourcesOfTypeCommand", { enumerable: true, get: function () { return SyncServiceBaseCommands_1.GetAllResourcesOfTypeCommand; } });
Object.defineProperty(exports, "ReadCommand", { enumerable: true, get: function () { return SyncServiceBaseCommands_1.ReadCommand; } });
Object.defineProperty(exports, "UpdateCommand", { enumerable: true, get: function () { return SyncServiceBaseCommands_1.UpdateCommand; } });
const Commands = {
    CreateCommand: SyncServiceBaseCommands_1.CreateCommand,
    ReadCommand: SyncServiceBaseCommands_1.ReadCommand,
    UpdateCommand: SyncServiceBaseCommands_1.UpdateCommand,
    DeleteCommand: SyncServiceBaseCommands_1.DeleteCommand,
    GetAllResourcesOfTypeCommand: SyncServiceBaseCommands_1.GetAllResourcesOfTypeCommand,
};
exports.default = { SyncService: SyncService_1.SyncService, Commands };
