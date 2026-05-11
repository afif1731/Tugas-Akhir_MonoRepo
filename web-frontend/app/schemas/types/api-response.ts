export interface ILiveKitToken {
  token: string;
}

export interface ILayoutDetail {
  dimension?: number[];
  camera_ids: string[];
}

export interface ILayoutPages {
  page: number;
  json: ILayoutDetail;
}
