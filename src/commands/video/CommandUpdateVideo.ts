import { FetchConfig, ICommand } from "../../interfaces/ICommand";
import { UpdateCommand } from "../../ParentCommands";
import { SyncResourceTypes } from "../../interfaces/ISyncResource";
import { CommandNames } from "../../interfaces/ISyncService";

type CommandUpdateVideoParams = {
  title?: string;
  description?: string;
  collectionLocalIds?: string[];
  promptIds?: string[];
}


export class CommandUpdateVideo extends UpdateCommand {

  constructor(commandRecord: CommandUpdateVideoParams, localId: string, commandId?: string) {
    super(SyncResourceTypes.Video, CommandNames.Update, localId, commandRecord);
    if (commandId) {
      this.commandId = commandId;
    }
  }
  merge(other: ICommand): ICommand[] {
    return [this, other];
  }
  private getFetchConfig(): FetchConfig {
    const config: FetchConfig = {
      url: `${this.getFullUrl('/video/update')}?localId=${this.localId}`,
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
  sync = async() => {
    const config = this.getFetchConfig();
    const response = await fetch(config.url, config.init);
    const body: Record<string, any> = await response.json();
    if (!response.ok) {
      return {newSyncDate: null, newRecord: {}};
    }
    const headers = this.getHeaders(response);
    if (!headers.sync_date) {
      throw new Error('Sync date not found in headers for CommandUpdateVideo');
    }
    return {
      newSyncDate: new Date(headers.sync_date),
      newRecord: body
    };
  }
  updateResource = (existingRecord: Record<string, any>) => {
    return {
      ...existingRecord,
      ...this.commandRecord
    }
  }
}