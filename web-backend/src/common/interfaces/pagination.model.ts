export interface IPaginationMeta {
  total: number;
  lastPage: number | null;
  currentPage: number;
  perPage: number;
  prev: number | null;
  next: number | null;
}

export interface IPaginatedResult<T> {
  data: T[];
  meta: IPaginationMeta;
}
