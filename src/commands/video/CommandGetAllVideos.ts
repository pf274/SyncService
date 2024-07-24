import { FetchConfig, ICommand } from "../../interfaces/ICommand";
import { SyncResourceTypes } from "../../interfaces/ISyncResource";
import { GetAllResourcesOfTypeCommand } from "../ParentCommands";


export class CommandGetAllVideos extends GetAllResourcesOfTypeCommand {
  constructor() {
    super(SyncResourceTypes.Video);
  }
  private getFetchConfig(): FetchConfig {
    const config: FetchConfig = {
      url: this.getFullUrl('/video/list'),
      init: {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer admin'
        }
      }
    }
    return config;
  }
  getCloudCopies = async () => {
    const config = this.getFetchConfig();
    const response = await fetch(config.url, config.init);
    const body: Record<string, any> = await response.json();
    if (!response.ok) {
      return { newSyncDate: null, retrievedRecords: [] };
    }
    return {
      retrievedRecords: body.map((video: Record<string, any>) => {
        return {
          resourceType: SyncResourceTypes.Video,
          localId: video.localId,
          data: video
        }
      })
    }
  }
  merge(other: ICommand): ICommand[] {
    return [this, other];
  }
}