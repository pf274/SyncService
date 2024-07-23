import { FetchConfig, ICommand } from "../ICommand";
import { ParentCommand } from "../ParentCommand";
import { SyncResourceTypes } from "../ISyncResource";

type CommandCreateVideoParams = {
  title?: string;
  description?: string;
  localId: string;
  id?: string;
  collectionLocalIds?: string[];
  promptIds?: string[];
}


export class CommandCreateVideo extends ParentCommand {

  constructor(params: CommandCreateVideoParams, commandId?: string) {
    super(SyncResourceTypes.Video, 'create', params);
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
          title: this.title || 'New Video',
          description: this.description || 'New Description',
          localId: this.localId,
          id: this.id,
          collectionLocalIds: this.collectionLocalIds || [],
          promptIds: this.promptIds || [],
          fileType: 'mp4'
        }),
        headers: {
          'Authorization': 'Bearer admin'
        }
      }
    }
    return config;
  }
  async execute(): Promise<{success: boolean, newOrUpdatedResources: {resourceType: SyncResourceTypes, localId: string, data: Record<string, any>}[], deletedResources: {resourceType: SyncResourceTypes, localId: string, data: Record<string, any>}[], status: number}> {
    let body: Record<string, any> = {};
    let status = 500;
    // const config = this.toFetchConfig();
    // const response = await fetch(config.url, config.init);
    // body = await response.json();
    // status = response.status;
    // if (!response.ok) {
    //   return {success: false, newOrUpdatedResources: [], deletedResources: [], status};
    // }
    await new Promise((resolve) => setTimeout(resolve, 5000));
    body = JSON.parse(this.toFetchConfig().init.body as string) as Record<string, any>;
    status = 200;
    return {success: true, newOrUpdatedResources: [{resourceType: SyncResourceTypes.Video, localId: this.localId, data: body}], deletedResources: [], status};
  }
}