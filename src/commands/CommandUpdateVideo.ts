import { FetchConfig, ICommand } from "../interfaces/ICommand";
import { ParentCommand } from "../ParentCommand";
import { SyncResourceTypes } from "../interfaces/ISyncResource";
import { CommandNames } from "../interfaces/ISyncService";

type CommandUpdateVideoParams = {
  title?: string;
  description?: string;
  collectionLocalIds?: string[];
  promptIds?: string[];
}


export class CommandUpdateVideo extends ParentCommand {

  constructor(commandRecord: CommandUpdateVideoParams, localId: string, commandId?: string) {
    super(SyncResourceTypes.Video, CommandNames.Update, localId, commandRecord);
    if (commandId) {
      this.commandId = commandId;
    }
  }
  merge(other: ICommand): ICommand[] {
    return [this, other];
  }
  toFetchConfig(): FetchConfig {
    const config: FetchConfig = {
      url: this.getFullUrl('/video/update'),
      init: {
        method: 'POST',
        body: JSON.stringify({
          ...this.commandRecord,
          localId: this.localId,
        }),
        headers: {
          'Authorization': 'Bearer admin'
        }
      }
    }
    return config;
  }
  execute = async() => {
    let body: Record<string, any> = {};
    let status = 500;
    // const config = this.toFetchConfig();
    // const response = await fetch(config.url, config.init);
    // body = await response.json();
    // status = response.status;
    // if (!response.ok) {
    //   return {success: false, newOrUpdatedResources: [], deletedResources: [], status};
    // }
    await new Promise((resolve) => setTimeout(resolve, 2000));
    body = JSON.parse(this.toFetchConfig().init.body as string) as Record<string, any>;
    status = 200;
    return {success: true, newResources: [], updatedResources: [{resourceType: SyncResourceTypes.Video, localId: this.localId, data: body}], retrievedResources: [], deletedResources: [], status};
  }
}