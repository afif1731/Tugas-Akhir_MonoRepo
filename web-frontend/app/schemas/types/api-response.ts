export interface ILiveKitToken {
  token: string;
}

export interface ILayoutDetail {
  dimension?: number[];
  cameras: {
    id: string;
    name: string;
  }[];
}

export interface ILayoutPages {
  page: number;
  json: ILayoutDetail;
}
