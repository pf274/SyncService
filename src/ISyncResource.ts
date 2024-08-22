export interface ISyncResource {
  resourceType: string;
  resourceId: string;
  data: Record<string, any>;
  updatedAt: Date;
}
