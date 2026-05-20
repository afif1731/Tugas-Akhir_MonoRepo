export interface ILiveKitToken {
  token: string;
}

export interface ILayoutDetail {
  dimension?: number[];
  cameras: {
    id: string;
    name: string;
    show_skeleton?: boolean;
    show_box?: boolean;
  }[];
}

export interface ILayoutPages {
  page: number;
  json: ILayoutDetail;
}
