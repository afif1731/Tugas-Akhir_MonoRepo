export type ILiveKitToken = {
  token: string;
};

export type ILayoutDetail = {
  dimension?: number[];
  camera_ids: string[];
};

export type ILayoutPages = {
  page: number;
  json: ILayoutDetail;
};
