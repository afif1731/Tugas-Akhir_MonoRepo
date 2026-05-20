export interface ILayoutJson {
  dimension?: number[];
  cameras: {
    id: string;
    name: string;
    show_skeleton: boolean;
    show_box: boolean;
  }[];
}

export interface IDatabaseLayoutJson {
  dimension: number[];
  cameras: {
    id: string;
    show_skeleton: boolean;
    show_box: boolean;
  }[];
}
