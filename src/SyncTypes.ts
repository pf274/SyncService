import { ICreateCommand, IDeleteCommand, IUpdateCommand } from "./interfaces/ICommand";
import { CommandNames } from "./interfaces/CommandNames";
/**
 * Generates a command instance from the specified details.
 *
 * This method should take the resource type, command name, and the command record and return a new instance of the appropriate command class.
 *
 * If the command is not recognized, it should return null.
 */
export type mapToCommandFunc = (
  resourceType: string,
  commandName: CommandNames,
  commandRecord?: Record<string, any>
) => IUpdateCommand | ICreateCommand | IDeleteCommand | null;
