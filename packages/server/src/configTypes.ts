export enum PermissionType {
  User,
  Role,
}

export interface Permission {
  type: PermissionType;
  id: string;
}
