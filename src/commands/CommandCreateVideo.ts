import { FetchConfig, ICommand } from "../interfaces/ICommand";
import { ParentCommand } from "../ParentCommand";
import { SyncResourceTypes } from "../interfaces/ISyncResource";
import { CommandNames } from "../interfaces/ISyncService";
import { generateUuid } from "../../uuid";

type CommandCreateVideoParams = {
  title?: string;
  id?: number;
  description?: string;
  collectionLocalIds?: string[];
  promptIds?: string[];
  fileType: 'mp4' | 'mov';
}


export class CommandCreateVideo extends ParentCommand {
  constructor(commandRecord: CommandCreateVideoParams, localId?: string, commandId?: string) {
    super(SyncResourceTypes.Video, CommandNames.Create, localId || generateUuid(), commandRecord);
    if (commandId) {
      this.commandId = commandId;
    }
  }
  merge(other: ICommand): ICommand[] {
    return [this, other];
  }
  toFetchConfig(): FetchConfig {
    const config: FetchConfig = {
      url: this.getFullUrl('/video/create'),
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
    // const config = this.toFetchConfig();
    // const response = await fetch(config.url, config.init);
    // if (!response.ok) {
    //   return {success: false};
    // }
    // body = await response.json();
    // const status = response.status;
    await new Promise((resolve) => setTimeout(resolve, 5000));
    body = JSON.parse(this.toFetchConfig().init.body as string) as Record<string, any>;
    return {
      success: true,
      updatedResources: [],
      newResources: [
        {
          resourceType: SyncResourceTypes.Video,
          localId: this.localId,
          data: body
        }
      ],
      newSyncDate: new Date()
    };
  }
}