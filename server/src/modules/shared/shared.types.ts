export interface Response<T> {
  data: T;
}

export interface Page {
  num: number;
  size: number;
  shard?: number;
}

export interface PaginatedData<T> {
  data: T[];
  nextPage?: Page;
}

export interface PaginatedResponse<T> {
  data: T[];
  links: { next?: string };
}

export interface Filters {
  jobType?: string;
  workerId?: number | null;
  location?: string;
}
