export type AiRodinQuality = "high" | "medium" | "low" | "extra-low";

export interface AiRodinQuery {
  prompt?: string;
  quality?: AiRodinQuality;
  resource_id?: number;
}

export interface AiRodinItem {
  id: number;
  name?: string;
  step: number;
  resource_id?: number;
  query: AiRodinQuery;
}
