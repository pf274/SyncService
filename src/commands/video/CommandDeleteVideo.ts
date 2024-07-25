import { FetchConfig, ICommand } from "../../interfaces/ICommand";
import { DeleteCommand, UpdateCommand } from "../ParentCommands";
import { SyncResourceTypes } from "../../interfaces/ISyncResource";
import { CommandNames } from "../../interfaces/ISyncService";




export class CommandDeleteVideo extends DeleteCommand {

  constructor(localId: string, commandId?: string) {
    super(SyncResourceTypes.Video, CommandNames.Delete, localId);
    if (commandId) {
      this.commandId = commandId;
    }
  }
  merge(nextCommand: ICommand): ICommand[] {
    return [this, nextCommand];
  }
  private getFetchConfig(): FetchConfig {
    const config: FetchConfig = {
      url: `${this.getFullUrl('/video/delete')}?localId=${this.localId}`,
      init: {
        method: 'DELETE',
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
}