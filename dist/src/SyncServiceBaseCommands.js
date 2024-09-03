"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetAllResourcesOfTypeCommand = exports.DeleteCommand = exports.UpdateCommand = exports.ReadCommand = exports.CreateCommand = void 0;
const uuid_1 = require("./uuid");
const CommandNames_1 = require("./interfaces/CommandNames");
class ParentCommand {
    constructor(resourceType, commandName, localId) {
        this.commandRecord = undefined;
        this.resourceType = resourceType;
        this.commandName = commandName;
        this.localId = localId;
        this.commandId = (0, uuid_1.generateUuid)();
        this.commandCreationDate = new Date();
    }
    getFullUrl(baseUrl, endpoint) {
        return new URL(endpoint, baseUrl).toString();
    }
    getHeaders(response) {
        const headers = response.headers;
        const headersObject = {};
        headers.forEach((value, key) => {
            headersObject[key] = value;
        });
        return headersObject;
    }
    copy() {
        const clone = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
        clone.commandId = (0, uuid_1.generateUuid)();
        clone.commandName = this.commandName;
        clone.resourceType = this.resourceType;
        clone.localId = this.localId;
        clone.commandCreationDate = this.commandCreationDate;
        if (this instanceof UpdateCommand || this instanceof CreateCommand) {
            clone.commandRecord = JSON.parse(JSON.stringify(this.commandRecord));
        }
        return clone;
    }
}
class CreateCommand extends ParentCommand {
    constructor(resourceType, commandName, localId, commandRecord) {
        super(resourceType, commandName, localId);
        this.commandRecord = commandRecord;
    }
}
exports.CreateCommand = CreateCommand;
class ReadCommand extends ParentCommand {
}
exports.ReadCommand = ReadCommand;
class UpdateCommand extends ParentCommand {
    constructor(resourceType, commandName, localId, commandRecord) {
        super(resourceType, commandName, localId);
        this.commandRecord = commandRecord;
    }
}
exports.UpdateCommand = UpdateCommand;
class DeleteCommand extends ParentCommand {
    constructor(resourceType, commandName, localId) {
        super(resourceType, commandName, localId);
    }
}
exports.DeleteCommand = DeleteCommand;
class GetAllResourcesOfTypeCommand extends ParentCommand {
    constructor(resourceType) {
        super(resourceType, CommandNames_1.CommandNames.ReadAll, (0, uuid_1.generateUuid)());
    }
}
exports.GetAllResourcesOfTypeCommand = GetAllResourcesOfTypeCommand;
