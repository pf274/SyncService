import { CommandNames } from "./CommandNames";
import { ISyncResource } from "./ISyncResource";
export declare abstract class ParentCommand {
    abstract resourceType: string;
    abstract commandName: CommandNames;
    abstract canMerge(newCommand: ParentCommand): boolean;
    abstract canCancelOut(newCommand: ParentCommand): boolean;
    commandId: string;
    commandCreationDate: Date;
}
export declare abstract class GetInfoCommand extends ParentCommand {
    abstract resourceIds: string[];
    abstract getCloudCopies(): Promise<ISyncResource[]>;
    canCancelOut(newCommand: ParentCommand): boolean;
    canMerge(newCommand: ParentCommand): boolean;
}
export declare abstract class ReadCommand extends GetInfoCommand {
    commandName: CommandNames;
}
export declare abstract class ReadAllCommand extends GetInfoCommand {
    commandName: CommandNames;
}
export declare abstract class ModifyCommand extends ParentCommand {
    get resourceId(): string;
    abstract sync(): Promise<{
        newSyncDate: Date | null;
        newResourceInfo: ISyncResource | null;
    }>;
}
export declare abstract class NewInfoCommand extends ModifyCommand {
    abstract resourceInfo: ISyncResource;
    canMerge(newCommand: ParentCommand): boolean;
}
export declare abstract class CreateCommand extends NewInfoCommand {
    commandName: CommandNames;
    canCancelOut(newCommand: ParentCommand): boolean;
}
export declare abstract class UpdateCommand extends NewInfoCommand {
    commandName: CommandNames;
    canCancelOut(newCommand: ParentCommand): boolean;
}
export declare abstract class DeleteCommand extends ParentCommand {
    abstract resourceId: string;
    commandName: CommandNames;
    canCancelOut(newCommand: ParentCommand): boolean;
    canMerge(newCommand: ParentCommand): boolean;
}
