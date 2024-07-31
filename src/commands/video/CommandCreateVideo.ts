import { FetchConfig, ICommand } from "../../interfaces/ICommand";
import { CreateCommand, UpdateCommand } from "../SyncServiceBaseCommands";
import { SyncResourceTypes } from "../../interfaces/ISyncResource";
import { CommandNames } from "../../interfaces/CommandNames";
import { generateUuid } from "../../../uuid";

type CreateVideoRecordType = {
  title?: string;
  id?: number;
  description?: string;
  collectionLocalIds?: string[];
  promptIds?: string[];
  fileType: 'mp4' | 'mov';
}


export class CommandCreateVideo extends CreateCommand {
  constructor(commandRecord: CreateVideoRecordType, localId?: string, commandId?: string) {
    super(SyncResourceTypes.Video, CommandNames.Create, localId || generateUuid(), commandRecord);
    if (commandId) {
      this.commandId = commandId;
    }
  }
  canMerge(other: ICommand) {
    if (other.localId === this.localId) {
      if (other.commandName == CommandNames.Update) {
        return true;
      }
    }
    return false;
  }
  canCancelOut(other: ICommand): boolean {
    if (other.localId === this.localId) {
      if (other.commandName === CommandNames.Delete) {
        return true;
      }
    }
    return false;
  }
  private getFetchConfig(): FetchConfig {
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
  sync = async() => {
    const config = this.getFetchConfig();
    const response = await fetch(config.url, config.init);
    const body: Record<string, any> = await response.json();
    if (!response.ok) {
      return {newSyncDate: null, newRecord: {}};
    }
    const headers = this.getHeaders(response);
    if (!headers.sync_date) {
      throw new Error('Sync date not found in headers for CommandCreateVideo');
    }
    return {
      newSyncDate: new Date(headers.sync_date),
      newRecord: body
    };
  }
}