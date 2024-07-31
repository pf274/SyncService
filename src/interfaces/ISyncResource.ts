export enum SyncResourceTypes {
  User = "User",
  Video = "Video",
  Collection = "Collection"
}

export interface ISyncResource {resourceType: SyncResourceTypes, localId: string, data: Record<string, any>}