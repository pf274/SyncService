"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadAllCommand = exports.DeleteCommand = exports.UpdateCommand = exports.ReadCommand = exports.CreateCommand = exports.CommandNames = exports.SyncService = void 0;
const CommandNames_1 = require("./src/CommandNames");
Object.defineProperty(exports, "CommandNames", { enumerable: true, get: function () { return CommandNames_1.CommandNames; } });
const SyncService_1 = require("./src/SyncService");
Object.defineProperty(exports, "SyncService", { enumerable: true, get: function () { return SyncService_1.SyncService; } });
const SyncServiceBaseCommands_1 = require("./src/SyncServiceBaseCommands");
Object.defineProperty(exports, "CreateCommand", { enumerable: true, get: function () { return SyncServiceBaseCommands_1.CreateCommand; } });
Object.defineProperty(exports, "DeleteCommand", { enumerable: true, get: function () { return SyncServiceBaseCommands_1.DeleteCommand; } });
Object.defineProperty(exports, "ReadAllCommand", { enumerable: true, get: function () { return SyncServiceBaseCommands_1.ReadAllCommand; } });
Object.defineProperty(exports, "ReadCommand", { enumerable: true, get: function () { return SyncServiceBaseCommands_1.ReadCommand; } });
Object.defineProperty(exports, "UpdateCommand", { enumerable: true, get: function () { return SyncServiceBaseCommands_1.UpdateCommand; } });
const Commands = {
    CreateCommand: SyncServiceBaseCommands_1.CreateCommand,
    ReadCommand: SyncServiceBaseCommands_1.ReadCommand,
    UpdateCommand: SyncServiceBaseCommands_1.UpdateCommand,
    DeleteCommand: SyncServiceBaseCommands_1.DeleteCommand,
    ReadAllCommand: SyncServiceBaseCommands_1.ReadAllCommand,
};
exports.default = { SyncService: SyncService_1.SyncService, Commands, CommandNames: CommandNames_1.CommandNames };
