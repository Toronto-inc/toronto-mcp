// CKAN API Types for Toronto Open Data

export interface CkanTag {
  id: string;
  name: string;
  display_name?: string;
}

export interface CkanOrganization {
  id: string;
  name: string;
  title: string;
  description?: string;
  package_count?: number;
  image_url?: string;
}

export interface CkanGroup {
  id: string;
  name: string;
  title: string;
  description?: string;
  package_count?: number;
  image_url?: string;
}

export interface CkanResource {
  id: string;
  name: string;
  format: string;
  size?: number;
  mimetype?: string;
  url: string;
  created: string;
  last_modified: string;
  datastore_active: boolean;
  description?: string;
}

export interface CkanPackage {
  id: string;
  name: string;
  title: string;
  notes?: string;
  tags: CkanTag[];
  organization: CkanOrganization;
  resources: CkanResource[];
  metadata_created: string;
  metadata_modified: string;
  refresh_rate?: string;
  maintainer?: string;
  maintainer_updated?: string;
  groups?: CkanGroup[];
  state?: string;
  type?: string;
}

export interface CkanSearchResult {
  count: number;
  results: CkanPackage[];
  facets?: Record<string, any>;
  search_facets?: Record<string, any>;
}

export interface CkanDatastoreField {
  id: string;
  type: string;
  info?: {
    label?: string;
    notes?: string;
  };
}

export interface CkanDatastoreResult {
  total: number;
  records: Record<string, any>[];
  fields: CkanDatastoreField[];
  resource_id: string;
}

export interface CkanApiResponse<T> {
  success: boolean;
  result: T;
  error?: {
    message: string;
    type?: string;
  };
}

// Summary Types for Tool Responses
export interface PackageSummary {
  id: string;
  name: string;
  title: string;
  description: string;
  organization: string;
  tags: string[];
  created: string;
  last_modified: string;
  resource_count: number;
  datastore_resources: number;
  url: string;
}

export interface ResourceSummary {
  id: string;
  name: string;
  format: string;
  size?: number;
  datastore_active: boolean;
  last_modified: string;
}

export interface ResourceAnalysis extends ResourceSummary {
  mimetype?: string;
  url: string;
  created: string;
  fields?: CkanDatastoreField[];
  record_count?: number;
  sample_data?: Record<string, any>[];
}

// Analysis Types
export interface DatasetRelevanceScore {
  score: number;
  breakdown: {
    title: number;
    description: number;
    tags: number;
    organization: number;
    resources: number;
  };
}

export interface UpdateFrequencyInfo {
  category: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'irregular' | 'frequent' | 'infrequent' | 'unknown';
  last_modified: string;
  refresh_rate?: string;
  days_since_update?: number;
}

export interface EnhancedPackage extends CkanPackage {
  relevance_score?: number;
  update_frequency?: string;
  resource_count: number;
  has_datastore: boolean;
}

// Tool Response Types
export interface ToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

// Configuration Types
export interface CkanToolsConfig {
  readonly CKAN_BASE_URL: string;
  readonly DEFAULT_SEARCH_ROWS: number;
  readonly DEFAULT_PREVIEW_LIMIT: number;
  readonly REQUEST_TIMEOUT: number;
  readonly RELEVANCE_WEIGHTS: {
    readonly TITLE: number;
    readonly DESCRIPTION: number;
    readonly TAGS: number;
    readonly ORGANIZATION: number;
    readonly RESOURCE: number;
  };
  readonly FREQUENCY_THRESHOLDS: {
    readonly FREQUENT_DAYS: number;
    readonly MONTHLY_DAYS: number;
    readonly QUARTERLY_DAYS: number;
  };
} 