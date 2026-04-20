// Interfaces matching OpenAPI response models for the new /v1/warehousing/ API
export interface Store {
  id: number;
  tag_version?: number;
  territory_id?: number;
  kind?: 'NORMAL' | 'ENTRY_POINT' | 'EXIT_POINT';
  code: string;
  volume?: { length: number; width: number; height: number };
  status?: 'ENABLED' | 'CLEANING_UP' | 'ARCHIVED';
  containers_volume?: number;
  fullness?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StoreListResponse {
  stores: Store[];
  cursor?: string;
  has_next?: boolean;
}

export interface Container {
  id: number;
  tag_version?: number;
  code: string;
  marker?: number;
  volume?: { length: number; width: number; height: number };
  tags?: string[];
  images?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ContainerListResponse {
  containers: Container[];
  cursor?: string;
  has_next?: boolean;
}

export interface Stock {
  id: number;
  container_id: number;
  location_id: number;
  quantity: number;
  volume?: number;
  created_at?: string;
}

export interface StockListResponse {
  stocks: Stock[];
  cursor?: string;
  has_next?: boolean;
}

// Request models

export interface MoveStockParams {
  stock_id: number;
  location_id: number;
  quantity: number;
}

export interface TransferStockParams {
  stock_id: number;
  quantity: number;
}

export interface CreateContainerParams {
  code?: string;
  volume?: { length: number; width: number; height: number };
  tags?: string[];
  images?: string[];
  location_id: number;
  exemplar_quantity?: number;
}

export interface SuccessCreatedContainerResponse {
  container_id: number;
  code: string;
  marker: number;
  stock_id: number;
}
