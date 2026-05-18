export interface ILayoutJson {
  dimension?: number[];
  cameras: {
    id: string;
    name: string;
  }[];
}

export interface IDatabaseLayoutJson {
  dimension: number[];
  camera_ids: string[];
}
