import { FetchConfig, ICommand } from "../../interfaces/ICommand";
import { ReadCommand } from "../SyncServiceBaseCommands";
import { SyncResourceTypes } from "../../interfaces/ISyncResource";
import { CommandNames } from "../../interfaces/CommandNames";

export class CommandReadVideo extends ReadCommand {
  constructor(localId: string) {
    super(SyncResourceTypes.Video, CommandNames.Read, localId);
  }
  canMerge(other: ICommand) {
    return false;
  }
  canCancelOut(other: ICommand): boolean {
    return false;
  }
  private getFetchConfig(): FetchConfig {
    const config: FetchConfig = {
      url: `${this.getFullUrl('/video')}?localId=${this.localId}`,
      init: {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer admin'
        }
      }
    }
    return config;
  }
  getCloudCopy = async() => {
    const config = this.getFetchConfig();
    const response = await fetch(config.url, config.init);
    const body = await response.json();
    const data = body.videoInfo;
    if (!response.ok) {
      return {success: false, retrievedRecords: []};
    }
    return {
      success: true,
      retrievedRecords: [
        {
          resourceType: SyncResourceTypes.Video,
          localId: this.localId,
          data
        }
      ],
    };
  }
}