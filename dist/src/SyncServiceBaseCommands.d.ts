import { ICommand, ICreateCommand, IDeleteCommand, IGetAllResourcesOfTypeCommand, IReadCommand, IUpdateCommand } from "./interfaces/ICommand";
import { CommandNames } from "./interfaces/CommandNames";
declare abstract class ParentCommand implements ICommand {
    commandId: string;
    resourceType: string;
    commandName: string;
    localId: string;
    commandRecord: Record<string, any> | undefined;
    commandCreationDate: Date;
    constructor(resourceType: string, commandName: CommandNames, localId: string);
    abstract canMerge(other: ICommand): boolean;
    abstract canCancelOut(other: ICommand): boolean;
    protected getFullUrl(baseUrl: string, endpoint: string): string;
    protected getHeaders(response: Response): Record<string, string>;
    copy(): ICommand;
}
export declare abstract class CreateCommand extends ParentCommand implements ICreateCommand {
    commandRecord: Record<string, any>;
    constructor(resourceType: string, commandName: CommandNames, localId: string, commandRecord: Record<string, any>);
    abstract sync: ICreateCommand["sync"];
}
export declare abstract class ReadCommand extends ParentCommand implements IReadCommand {
    abstract getCloudCopy: IReadCommand["getCloudCopy"];
}
export declare abstract class UpdateCommand extends ParentCommand implements IUpdateCommand {
    commandRecord: Record<string, any>;
    constructor(resourceType: string, commandName: CommandNames, localId: string, commandRecord: Record<string, any>);
    abstract sync: IUpdateCommand["sync"];
}
export declare abstract class DeleteCommand extends ParentCommand implements IDeleteCommand {
    constructor(resourceType: string, commandName: CommandNames, localId: string);
    abstract sync: IDeleteCommand["sync"];
}
export declare abstract class GetAllResourcesOfTypeCommand extends ParentCommand implements IGetAllResourcesOfTypeCommand {
    constructor(resourceType: string);
    abstract getCloudCopies: IGetAllResourcesOfTypeCommand["getCloudCopies"];
}
export {};
