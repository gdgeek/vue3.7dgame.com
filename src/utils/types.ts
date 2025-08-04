export type CardInfo = {
  id: number;
  image: { url: string } | null;
  type: string;
  created_at: string;
  name: string;
  context: any;
  enabled: boolean;
};

export type DataInput = {
  type: string;
  sorted: string;
  searched: string;
  current: number;
};
export type DataOutput = {
  items: CardInfo[];
  pagination: {
    current: number;
    count: number;
    size: number;
    total: number;
  };
};
