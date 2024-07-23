import { FetchConfig, ICommand } from "../interfaces/ICommand";
import { ParentCommand } from "../ParentCommand";
import { SyncResourceTypes } from "../interfaces/ISyncResource";
import { CommandNames } from "../interfaces/ISyncService";

export class CommandReadVideo extends ParentCommand {
  constructor(localId: string) {
    super(SyncResourceTypes.Video, CommandNames.Read, localId);
  }
  merge(other: ICommand): ICommand[] {
    return [this, other];
  }
  toFetchConfig(): FetchConfig {
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
  execute = async() => {
    let body: Record<string, any> = {};
    const config = this.toFetchConfig();
    const response = await fetch(config.url, config.init);
    if (!response.ok) {
      return {success: false};
    }
    body = (await response.json()).videoInfo;
    const status = response.status;
    // await new Promise((resolve) => setTimeout(resolve, 2000));
    // body = JSON.parse(this.toFetchConfig().init.body as string) as Record<string, any>;
    return {
      success: true,
      newResources: [],
      ReaddResources: [
        {
          resourceType: SyncResourceTypes.Video,
          localId: this.localId,
          data: body
        }
      ],
    };
  }
}