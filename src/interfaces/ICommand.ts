export interface ICommand {
  canMerge(other: ICommand): boolean;
  canCancelOut(other: ICommand): boolean;
  commandId: string;
  resourceType: string;
  commandName: string;
  commandCreationDate: Date;
}
