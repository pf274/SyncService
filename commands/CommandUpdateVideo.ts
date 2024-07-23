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


export class CommandUpdateVideo extends ParentCommand {

  constructor(params: CommandCreateVideoParams, commandId?: string) {
    super(SyncResourceTypes.Video, 'update', params);
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
          title: this.title || 'New Video',
          description: this.description || 'New Description',
          localId: this.localId,
          id: this.id,
          collectionLocalIds: this.collectionLocalIds || [],
          promptIds: this.promptIds || [],
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
    await new Promise((resolve) => setTimeout(resolve, 2000));
    body = {};
    status = 200;
    return {success: true, newOrUpdatedResources: [{resourceType: SyncResourceTypes.Video, localId: this.localId, data: body}], deletedResources: [], status};
  }
}