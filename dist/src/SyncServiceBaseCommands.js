"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteCommand = exports.UpdateCommand = exports.CreateCommand = exports.NewInfoCommand = exports.ModifyCommand = exports.ReadAllCommand = exports.ReadCommand = exports.GetInfoCommand = exports.ParentCommand = void 0;
const uuid_1 = require("./uuid");
const CommandNames_1 = require("./CommandNames");
class ParentCommand {
    constructor() {
        this.commandId = (0, uuid_1.generateUuid)();
        this.commandCreationDate = new Date();
    }
}
exports.ParentCommand = ParentCommand;
class GetInfoCommand extends ParentCommand {
    canCancelOut(newCommand) {
        return false;
    }
    canMerge(newCommand) {
        return false;
    }
}
exports.GetInfoCommand = GetInfoCommand;
class ReadCommand extends GetInfoCommand {
    constructor() {
        super(...arguments);
        this.commandName = CommandNames_1.CommandNames.Read;
    }
}
exports.ReadCommand = ReadCommand;
class ReadAllCommand extends GetInfoCommand {
    constructor() {
        super(...arguments);
        this.commandName = CommandNames_1.CommandNames.ReadAll;
    }
}
exports.ReadAllCommand = ReadAllCommand;
class ModifyCommand extends ParentCommand {
    get resourceId() {
        return (this.resourceInfo.resourceId ||
            this.resourceId);
    }
}
exports.ModifyCommand = ModifyCommand;
class NewInfoCommand extends ModifyCommand {
    constructor() {
        super(...arguments);
        this.disableMerge = false;
    }
    canMerge(newCommand) {
        if (newCommand instanceof NewInfoCommand) {
            if (newCommand.resourceInfo.resourceId === this.resourceInfo.resourceId) {
                if (newCommand instanceof UpdateCommand) {
                    return true;
                }
            }
        }
        return false;
    }
}
exports.NewInfoCommand = NewInfoCommand;
class CreateCommand extends NewInfoCommand {
    constructor() {
        super(...arguments);
        this.commandName = CommandNames_1.CommandNames.Create;
    }
    canCancelOut(newCommand) {
        if (newCommand instanceof DeleteCommand) {
            if (newCommand.resourceId === this.resourceInfo.resourceId) {
                return true;
            }
        }
        return false;
    }
}
exports.CreateCommand = CreateCommand;
class UpdateCommand extends NewInfoCommand {
    constructor() {
        super(...arguments);
        this.commandName = CommandNames_1.CommandNames.Update;
    }
    canCancelOut(newCommand) {
        return false;
    }
}
exports.UpdateCommand = UpdateCommand;
class DeleteCommand extends ParentCommand {
    constructor() {
        super(...arguments);
        this.commandName = CommandNames_1.CommandNames.Delete;
    }
    canCancelOut(newCommand) {
        return false;
    }
    canMerge(newCommand) {
        return false;
    }
}
exports.DeleteCommand = DeleteCommand;
