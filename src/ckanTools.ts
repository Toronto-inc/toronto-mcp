import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type {
	CkanApiResponse,
	CkanDatastoreResult,
	CkanGroup,
	CkanOrganization,
	CkanPackage,
	CkanResource,
	CkanSearchResult,
	CkanToolsConfig,
	PackageSummary,
	ResourceAnalysis,
	ResourceSummary
} from "./types.js";

// Configuration constants
const CONFIG: CkanToolsConfig = {
  CKAN_BASE_URL: "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action",
  DEFAULT_SEARCH_ROWS: 100,
  DEFAULT_PREVIEW_LIMIT: 5,
  REQUEST_TIMEOUT: 10000,
  RELEVANCE_WEIGHTS: {
    TITLE: 10,
    DESCRIPTION: 5,
    TAGS: 3,
    ORGANIZATION: 2,
    RESOURCE: 1
  },
  FREQUENCY_THRESHOLDS: {
    FREQUENT_DAYS: 7,
    MONTHLY_DAYS: 30,
    QUARTERLY_DAYS: 90
  }
} as const;

// Improved API calling with error handling and timeout
async function ckanApiCall<T>(endpoint: string): Promise<T> {
  const url = `${CONFIG.CKAN_BASE_URL}/${endpoint}`;
  
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(CONFIG.REQUEST_TIMEOUT),
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Toronto-MCP-Server/1.0.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`CKAN API HTTP error: ${response.status} ${response.statusText}`);
    }
    
    const json: CkanApiResponse<T> = await response.json();
    
    if (!json.success) {
      throw new Error(`CKAN API error: ${json.error?.message || 'Unknown API error'}`);
    }
    
    return json.result;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`CKAN API call failed for ${endpoint}:`, error.message);
      throw new Error(`Failed to fetch from CKAN API: ${error.message}`);
    }
    throw error;
  }
}

// Helper function for tool responses (back to original working format)
function createToolResponse(data: any) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }]
  };
}

// Simplified and type-safe API functions
export const fetchCkanPackage = (packageId: string): Promise<CkanPackage> =>
  ckanApiCall(`package_show?id=${encodeURIComponent(packageId)}`);

export const fetchCkanResource = (resourceId: string, limit = 10, offset = 0): Promise<CkanDatastoreResult> =>
  ckanApiCall(`datastore_search?id=${encodeURIComponent(resourceId)}&limit=${limit}&offset=${offset}`);

export const fetchCkanPackageList = (): Promise<string[]> =>
  ckanApiCall('package_list');

export const fetchCkanPackageSearch = (query: string): Promise<CkanSearchResult> =>
  ckanApiCall(`package_search?q=${encodeURIComponent(query)}`);

export const fetchCkanPackageSearchAdvanced = (
  query: string,
  rows = CONFIG.DEFAULT_SEARCH_ROWS,
  facets: string[] = []
): Promise<CkanSearchResult> => {
  let endpoint = `package_search?q=${encodeURIComponent(query)}&rows=${rows}`;
  if (facets.length > 0) {
    endpoint += `&facet.field=${facets.map(f => encodeURIComponent(f)).join("&facet.field=")}`;
  }
  return ckanApiCall(endpoint);
};

export const fetchCkanOrganizations = (): Promise<CkanOrganization[]> =>
  ckanApiCall('organization_list?all_fields=true');

export const fetchCkanGroups = (): Promise<CkanGroup[]> =>
  ckanApiCall('group_list?all_fields=true');

export const fetchCkanResourceInfo = (resourceId: string): Promise<CkanResource> =>
  ckanApiCall(`resource_show?id=${encodeURIComponent(resourceId)}`);

export const fetchCkanDatastoreInfo = (resourceId: string): Promise<CkanDatastoreResult> =>
  ckanApiCall(`datastore_search?id=${encodeURIComponent(resourceId)}&limit=0`);

// Relevance scoring class
class RelevanceScorer {
  private static readonly WEIGHTS = CONFIG.RELEVANCE_WEIGHTS;
  
  static score(dataset: CkanPackage, query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;
    
    score += this.scoreTitle(dataset.title, lowerQuery);
    score += this.scoreDescription(dataset.notes, lowerQuery);
    score += this.scoreTags(dataset.tags, lowerQuery);
    score += this.scoreOrganization(dataset.organization, lowerQuery);
    score += this.scoreResources(dataset.resources, lowerQuery);
    
    return score;
  }
  
  private static scoreTitle(title: string, query: string): number {
    return title?.toLowerCase().includes(query) ? this.WEIGHTS.TITLE : 0;
  }
  
  private static scoreDescription(description: string | undefined, query: string): number {
    return description?.toLowerCase().includes(query) ? this.WEIGHTS.DESCRIPTION : 0;
  }
  
  private static scoreTags(tags: { name: string }[], query: string): number {
    return tags?.some(tag => tag.name.toLowerCase().includes(query)) ? this.WEIGHTS.TAGS : 0;
  }
  
  private static scoreOrganization(organization: { title: string }, query: string): number {
    return organization?.title?.toLowerCase().includes(query) ? this.WEIGHTS.ORGANIZATION : 0;
  }
  
  private static scoreResources(resources: CkanResource[], query: string): number {
    const hasMatch = resources?.some(resource => 
      resource.name?.toLowerCase().includes(query) || 
      resource.format?.toLowerCase().includes(query)
    );
    return hasMatch ? this.WEIGHTS.RESOURCE : 0;
  }
}

// Update frequency analysis class
class UpdateFrequencyAnalyzer {
  private static readonly PATTERNS = {
    daily: ['daily', 'real-time'],
    weekly: ['weekly'],
    monthly: ['monthly'],
    quarterly: ['quarterly'],
    annually: ['annual', 'yearly'],
    irregular: ['irregular', 'as needed']
  } as const;
  
  static categorize(dataset: CkanPackage): 
    'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'irregular' | 'frequent' | 'infrequent' | 'unknown' {
    const refreshRate = dataset.refresh_rate?.toLowerCase() || "";
    
    // Check explicit patterns first
    for (const [category, patterns] of Object.entries(this.PATTERNS)) {
      if (patterns.some(pattern => refreshRate.includes(pattern))) {
        return category as any;
      }
    }
    
    // Infer from metadata if available
    return this.inferFromMetadata(dataset);
  }
  
  private static inferFromMetadata(dataset: CkanPackage): 
    'frequent' | 'monthly' | 'quarterly' | 'infrequent' | 'unknown' {
    const lastUpdate = dataset.maintainer_updated || dataset.metadata_modified;
    if (!lastUpdate) return "unknown";
    
    const daysSince = this.daysSinceDate(lastUpdate);
    const thresholds = CONFIG.FREQUENCY_THRESHOLDS;
    
    if (daysSince < thresholds.FREQUENT_DAYS) return "frequent";
    if (daysSince < thresholds.MONTHLY_DAYS) return "monthly";
    if (daysSince < thresholds.QUARTERLY_DAYS) return "quarterly";
    return "infrequent";
  }
  
  private static daysSinceDate(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    return (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
  }
}

// Summary builder class
class SummaryBuilder {
  static package(pkg: CkanPackage): PackageSummary {
    return {
      id: pkg.id,
      name: pkg.name,
      title: pkg.title,
      description: this.truncateDescription(pkg.notes),
      organization: pkg.organization?.title || 'Unknown',
      tags: pkg.tags?.map(tag => tag.name).slice(0, 5) || [],
      created: pkg.metadata_created,
      last_modified: pkg.metadata_modified,
      resource_count: pkg.resources?.length || 0,
      datastore_resources: this.countDatastoreResources(pkg.resources),
      url: `https://open.toronto.ca/dataset/${pkg.name}/`
    };
  }
  
  static resource(resource: CkanResource): ResourceSummary {
    return {
      id: resource.id,
      name: resource.name,
      format: resource.format,
      size: resource.size,
      datastore_active: resource.datastore_active,
      last_modified: resource.last_modified
    };
  }
  
  static resourceAnalysis(
    resource: CkanResource, 
    fields?: any[], 
    recordCount?: number, 
    sampleData?: Record<string, any>[]
  ): ResourceAnalysis {
    return {
      ...this.resource(resource),
      mimetype: resource.mimetype,
      url: resource.url,
      created: resource.created,
      fields,
      record_count: recordCount,
      sample_data: sampleData
    };
  }
  
  private static truncateDescription(notes?: string): string {
    if (!notes) return '';
    const maxLength = 200;
    return notes.length > maxLength 
      ? notes.substring(0, maxLength) + '...' 
      : notes;
  }
  
  private static countDatastoreResources(resources?: CkanResource[]): number {
    return resources?.filter(r => r.datastore_active).length || 0;
  }
}

// Legacy functions for backward compatibility
function analyzeDatasetRelevance(dataset: CkanPackage, query: string): number {
  return RelevanceScorer.score(dataset, query);
}

function getUpdateFrequencyCategory(dataset: CkanPackage): string {
  return UpdateFrequencyAnalyzer.categorize(dataset);
}

function createPackageSummary(pkg: CkanPackage): PackageSummary {
  return SummaryBuilder.package(pkg);
}

function createResourceSummary(resource: CkanResource): ResourceSummary {
  return SummaryBuilder.resource(resource);
}

// Register CKAN tools on the given MCP server
export function registerCkanTools(server: McpServer) {
  // Basic tools with improved error handling and types
  server.tool(
    "get_package",
    { 
      packageId: z.string(),
      summary: z.boolean().optional().default(true)
    },
    async ({ packageId, summary }: { packageId: string; summary?: boolean }) => {
      try {
        const pkg = await fetchCkanPackage(packageId);
        const result = summary ? createPackageSummary(pkg) : pkg;
        return createToolResponse(result);
      } catch (error) {
        console.error(`Error in get_package:`, error);
        return createToolResponse({ 
          error: `Failed to fetch package: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    },
  );

  server.tool(
    "get_first_datastore_resource_records",
    { 
      packageId: z.string(),
      limit: z.number().optional().default(10)
    },
    async ({ packageId, limit }: { packageId: string; limit?: number }) => {
      try {
        const pkg = await fetchCkanPackage(packageId);
        const dsResources = pkg.resources.filter(r => r.datastore_active);
        
        if (!dsResources.length) {
          return createToolResponse({ message: "No active datastore resources found." });
        }
        
        const result = await fetchCkanResource(dsResources[0].id, limit);
        const summary = {
          resource_id: dsResources[0].id,
          resource_name: dsResources[0].name,
          total_records: result.total,
          returned_records: result.records.length,
          fields: result.fields,
          records: result.records
        };
        return createToolResponse(summary);
      } catch (error) {
        console.error(`Error in get_first_datastore_resource_records:`, error);
        return createToolResponse({ 
          error: `Failed to fetch resource records: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    },
  );

  server.tool(
    "get_resource_records",
    { 
      resourceId: z.string(),
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0)
    },
    async ({ resourceId, limit, offset }: { resourceId: string; limit?: number; offset?: number }) => {
      try {
        const result = await fetchCkanResource(resourceId, limit || 10, offset || 0);
        const summary = {
          resource_id: resourceId,
          total_records: result.total,
          returned_records: result.records.length,
          limit: limit || 10,
          offset: offset || 0,
          fields: result.fields,
          records: result.records
        };
        return createToolResponse(summary);
      } catch (error) {
        console.error(`Error in get_resource_records:`, error);
        return createToolResponse({ 
          error: `Failed to fetch resource records: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    },
  );

  server.tool(
    "list_datasets", 
    { 
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0)
    }, 
    async ({ limit, offset }: { limit?: number; offset?: number }) => {
      try {
        const fullList = await fetchCkanPackageList();
        const startIndex = offset || 0;
        const endIndex = startIndex + (limit || 50);
        const limitedList = fullList.slice(startIndex, endIndex);
        
        const summary = {
          total_datasets: fullList.length,
          returned_count: limitedList.length,
          offset: startIndex,
          limit: limit || 50,
          dataset_ids: limitedList
        };
        return createToolResponse(summary);
      } catch (error) {
        console.error(`Error in list_datasets:`, error);
        return createToolResponse({ 
          error: `Failed to list datasets: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }
  );

  server.tool(
    "search_datasets", 
    { 
      query: z.string(),
      limit: z.number().optional().default(20)
    }, 
    async ({ query, limit }: { query: string; limit?: number }) => {
      try {
        const result = await fetchCkanPackageSearch(query);
        const limitedResults = result.results.slice(0, limit || 20).map(createPackageSummary);
        
        const summary = {
          query,
          total_found: result.count,
          returned_count: limitedResults.length,
          datasets: limitedResults
        };
        return createToolResponse(summary);
      } catch (error) {
        console.error(`Error in search_datasets:`, error);
        return createToolResponse({ 
          error: `Failed to search datasets: ${error instanceof Error ? error.message : 'Unknown error'}` 
        });
      }
    }
  );

	// NEW ADVANCED TOOLS

	server.tool(
		"find_relevant_datasets",
		{
			query: z.string(),
			maxResults: z.number().optional().default(10),
			includeRelevanceScore: z.boolean().optional().default(true),
		},
		async ({
			query,
			maxResults,
			includeRelevanceScore,
		}: { query: string; maxResults?: number; includeRelevanceScore?: boolean }) => {
			const searchResult = await fetchCkanPackageSearchAdvanced(query, 100, [
				"organization",
				"groups",
				"tags",
			]);

			// Analyze and score each dataset for relevance
			const scoredDatasets = searchResult.results.map((dataset: any) => {
				const relevanceScore = analyzeDatasetRelevance(dataset, query);
				return {
					...dataset,
					relevance_score: relevanceScore,
					update_frequency: getUpdateFrequencyCategory(dataset),
					resource_count: dataset.resources?.length || 0,
					has_datastore: dataset.resources?.some((r: any) => r.datastore_active) || false,
				};
			});

			// Sort by relevance score and limit results
			const sortedDatasets = scoredDatasets
				.sort((a: any, b: any) => b.relevance_score - a.relevance_score)
				.slice(0, maxResults);

			const analysis = {
				query,
				total_found: searchResult.count,
				returned_count: sortedDatasets.length,
				datasets: includeRelevanceScore
					? sortedDatasets
					: sortedDatasets.map((d: any) => {
							const { relevance_score, ...rest } = d;
							return rest;
						}),
				facets: searchResult.facets || {},
			};

			return {
				content: [{ type: "text", text: JSON.stringify(analysis) }],
			};
		},
	);

	server.tool(
		"analyze_dataset_updates",
		{
			query: z.string().optional(),
			packageIds: z.array(z.string()).optional(),
			groupByFrequency: z.boolean().optional().default(true),
		},
		async ({
			query,
			packageIds,
			groupByFrequency,
		}: { query?: string; packageIds?: string[]; groupByFrequency?: boolean }) => {
			let datasets: any[] = [];

			if (packageIds && packageIds.length > 0) {
				// Get specific packages
				datasets = await Promise.all(packageIds.map((id) => fetchCkanPackage(id)));
			} else if (query) {
				// Search for datasets
				const searchResult = await fetchCkanPackageSearchAdvanced(query, 100);
				datasets = searchResult.results;
			} else {
				return {
					content: [
						{ type: "text", text: "Either query or packageIds parameter is required." },
					],
				};
			}

			// Analyze update patterns
			const updateAnalysis = datasets.map((dataset) => {
				const updateFreq = getUpdateFrequencyCategory(dataset);
				return {
					id: dataset.id,
					name: dataset.name,
					title: dataset.title,
					update_frequency: updateFreq,
					last_modified: dataset.metadata_modified,
					refresh_rate: dataset.refresh_rate,
					maintainer: dataset.maintainer,
					organization: dataset.organization?.title,
					resource_count: dataset.resources?.length || 0,
					datastore_resources:
						dataset.resources?.filter((r: any) => r.datastore_active).length || 0,
				};
			});

			const result: any = {
				total_datasets: datasets.length,
				datasets: updateAnalysis,
			};

			if (groupByFrequency) {
				const frequencyGroups = updateAnalysis.reduce((groups: any, dataset) => {
					const freq = dataset.update_frequency;
					if (!groups[freq]) groups[freq] = [];
					groups[freq].push(dataset);
					return groups;
				}, {});

				result.frequency_summary = Object.entries(frequencyGroups).map(
					([frequency, datasets]: [string, any]) => ({
						frequency,
						count: datasets.length,
						datasets: datasets.map((d: any) => ({ id: d.id, title: d.title })),
					}),
				);
			}

			return {
				content: [{ type: "text", text: JSON.stringify(result) }],
			};
		},
	);

	server.tool(
		"analyze_dataset_structure",
		{
			packageId: z.string(),
			includeDataPreview: z.boolean().optional().default(false),
			previewLimit: z.number().optional().default(5),
		},
		async ({
			packageId,
			includeDataPreview,
			previewLimit,
		}: { packageId: string; includeDataPreview?: boolean; previewLimit?: number }) => {
			const pkg = await fetchCkanPackage(packageId);

			const resourceAnalysis = await Promise.all(
				pkg.resources.map(async (resource: any) => {
					const resourceInfo = {
						id: resource.id,
						name: resource.name,
						format: resource.format,
						size: resource.size,
						mimetype: resource.mimetype,
						url: resource.url,
						created: resource.created,
						last_modified: resource.last_modified,
						datastore_active: resource.datastore_active,
						fields: null as any,
						record_count: null as any,
						sample_data: null as any,
					};

					// If it's a datastore resource, get field information
					if (resource.datastore_active) {
						try {
							const datastoreInfo = await fetchCkanDatastoreInfo(resource.id);
							resourceInfo.fields = datastoreInfo.fields;
							resourceInfo.record_count = datastoreInfo.total;

							// Get sample data if requested
							if (includeDataPreview && (previewLimit || 0) > 0) {
								const sampleResult = await fetchCkanResource(resource.id, previewLimit || 5);
								resourceInfo.sample_data = sampleResult.records;
							}
						} catch (error) {
							// If datastore query fails, mark as inactive
							resourceInfo.datastore_active = false;
						}
					}

					return resourceInfo;
				}),
			);

			const analysis = {
				package_id: pkg.id,
				name: pkg.name,
				title: pkg.title,
				description: pkg.notes,
				tags: pkg.tags?.map((tag: any) => tag.name) || [],
				organization: pkg.organization?.title,
				created: pkg.metadata_created,
				last_modified: pkg.metadata_modified,
				update_frequency: getUpdateFrequencyCategory(pkg),
				resource_summary: {
					total_resources: pkg.resources.length,
					datastore_resources: resourceAnalysis.filter((r) => r.datastore_active).length,
					formats: [...new Set(pkg.resources.map((r: any) => r.format))],
					total_records: resourceAnalysis.reduce(
						(sum, r) => sum + (r.record_count || 0),
						0,
					),
				},
							resources: resourceAnalysis,
		};

		return {
			content: [{ type: "text", text: JSON.stringify(analysis) }],
		};
	},
);

	server.tool("get_data_categories", {}, async () => {
		const [organizations, groups] = await Promise.all([
			fetchCkanOrganizations(),
			fetchCkanGroups(),
		]);

		const result = {
			organizations: organizations.map((org: any) => ({
				id: org.id,
				name: org.name,
				title: org.title,
				description: org.description,
				package_count: org.package_count,
			})),
			groups: groups.map((group: any) => ({
				id: group.id,
				name: group.name,
				title: group.title,
				description: group.description,
				package_count: group.package_count,
			})),
		};

		return {
			content: [{ type: "text", text: JSON.stringify(result) }],
		};
	});

	server.tool(
		"get_dataset_insights",
		{
			query: z.string(),
			includeUpdateFrequency: z.boolean().optional().default(true),
			includeDataStructure: z.boolean().optional().default(true),
			maxDatasets: z.number().optional().default(5),
		},
		async ({
			query,
			includeUpdateFrequency,
			includeDataStructure,
			maxDatasets,
		}: {
			query: string;
			includeUpdateFrequency?: boolean;
			includeDataStructure?: boolean;
			maxDatasets?: number;
		}) => {
			// Find relevant datasets
			const searchResult = await fetchCkanPackageSearchAdvanced(query, 50, [
				"organization",
				"groups",
				"tags",
			]);

			// Score and sort datasets
			const scoredDatasets = searchResult.results
				.map((dataset: any) => ({
					...dataset,
					relevance_score: analyzeDatasetRelevance(dataset, query),
				}))
				.sort((a: any, b: any) => b.relevance_score - a.relevance_score)
				.slice(0, maxDatasets);

			// Gather insights for each dataset
			const insights = await Promise.all(
				scoredDatasets.map(async (dataset: any) => {
					const baseInfo = {
						id: dataset.id,
						name: dataset.name,
						title: dataset.title,
						description: dataset.notes,
						relevance_score: dataset.relevance_score,
						organization: dataset.organization?.title,
						tags: dataset.tags?.map((tag: any) => tag.name) || [],
						url: `https://open.toronto.ca/dataset/${dataset.name}/`,
					};

					const additionalInfo: any = {};

					if (includeUpdateFrequency) {
						additionalInfo.update_info = {
							frequency: getUpdateFrequencyCategory(dataset),
							last_modified: dataset.metadata_modified,
							refresh_rate: dataset.refresh_rate,
						};
					}

					if (includeDataStructure) {
						const datastoreResources =
							dataset.resources?.filter((r: any) => r.datastore_active) || [];
						if (datastoreResources.length > 0) {
							try {
								const firstResource = datastoreResources[0];
								const datastoreInfo = await fetchCkanDatastoreInfo(
									firstResource.id,
								);
								additionalInfo.data_structure = {
									record_count: datastoreInfo.total,
									fields: datastoreInfo.fields,
									resource_count: dataset.resources?.length || 0,
									datastore_resources: datastoreResources.length,
								};
							} catch (error) {
								additionalInfo.data_structure = {
									error: "Could not fetch datastore info",
									resource_count: dataset.resources?.length || 0,
									datastore_resources: datastoreResources.length,
								};
							}
						} else {
							additionalInfo.data_structure = {
								message: "No active datastore resources",
								resource_count: dataset.resources?.length || 0,
								datastore_resources: 0,
							};
						}
					}

					return { ...baseInfo, ...additionalInfo };
				}),
			);

			const result = {
				query,
				total_found: searchResult.count,
				analyzed_datasets: insights.length,
				insights,
				query_suggestions: {
					organizations: [
						...new Set(
							scoredDatasets.map((d: any) => d.organization?.title).filter(Boolean),
						),
					],
					common_tags: [
						...new Set(
							scoredDatasets.flatMap(
								(d: any) => d.tags?.map((tag: any) => tag.name) || [],
							),
						),
					].slice(0, 10),
				},
			};

					return {
			content: [{ type: "text", text: JSON.stringify(result) }],
		};
		},
	);
}
