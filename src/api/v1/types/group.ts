/**
 * Group type definition
 */
export interface Group {
  id: number;
  name: string;
  description?: string;
  image_id?: number;
  user_id?: number;
  created_at?: string;
  updated_at?: string;
  image?: {
    id: number;
    url: string;
  };
  user?: {
    id: number;
    username: string;
    nickname?: string;
  };
}

export interface GroupCreateData {
  name: string;
  description?: string;
  image_id?: number;
}

export interface GroupUpdateData {
  name?: string;
  description?: string;
  image_id?: number;
}
