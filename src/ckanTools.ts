import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
// CKAN API base URL for Toronto Open Data
const CKAN_BASE = "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action";

// Helper to fetch package metadata
export async function fetchCkanPackage(packageId: string): Promise<any> {
	const url = `${CKAN_BASE}/package_show?id=${packageId}`;
	const resp = await fetch(url);
	const json: any = await resp.json();
	return json.result;
}

// Helper to fetch resource data
export async function fetchCkanResource(resourceId: string): Promise<any> {
	const url = `${CKAN_BASE}/datastore_search?id=${resourceId}`;
	const resp = await fetch(url);
	const json: any = await resp.json();
	return json.result.records;
}

// Helper to list all datasets
export async function fetchCkanPackageList(): Promise<any> {
	const url = `${CKAN_BASE}/package_list`;
	const resp = await fetch(url);
	const json: any = await resp.json();
	return json.result;
}

// Helper to search datasets
export async function fetchCkanPackageSearch(query: string): Promise<any> {
	const url = `${CKAN_BASE}/package_search?q=${encodeURIComponent(query)}`;
	const resp = await fetch(url);
	const json: any = await resp.json();
	return json.result;
}

// Helper to get enhanced package search with filters
export async function fetchCkanPackageSearchAdvanced(
	query: string,
	rows = 100,
	facets: string[] = [],
): Promise<any> {
	let url = `${CKAN_BASE}/package_search?q=${encodeURIComponent(query)}&rows=${rows}`;
	if (facets.length > 0) {
		url += `&facet.field=${facets.join("&facet.field=")}`;
	}
	const resp = await fetch(url);
	const json: any = await resp.json();
	return json.result;
}

// Helper to get organizations
export async function fetchCkanOrganizations(): Promise<any> {
	const url = `${CKAN_BASE}/organization_list?all_fields=true`;
	const resp = await fetch(url);
	const json: any = await resp.json();
	return json.result;
}

// Helper to get groups/topics
export async function fetchCkanGroups(): Promise<any> {
	const url = `${CKAN_BASE}/group_list?all_fields=true`;
	const resp = await fetch(url);
	const json: any = await resp.json();
	return json.result;
}

// Helper to get resource info
export async function fetchCkanResourceInfo(resourceId: string): Promise<any> {
	const url = `${CKAN_BASE}/resource_show?id=${resourceId}`;
	const resp = await fetch(url);
	const json: any = await resp.json();
	return json.result;
}

// Helper to get datastore info (fields, record count)
export async function fetchCkanDatastoreInfo(resourceId: string): Promise<any> {
	const url = `${CKAN_BASE}/datastore_search?id=${resourceId}&limit=0`;
	const resp = await fetch(url);
	const json: any = await resp.json();
	return json.result;
}

// Function to analyze dataset relevance
function analyzeDatasetRelevance(dataset: any, query: string): number {
	const lowerQuery = query.toLowerCase();
	let score = 0;

	// Title match (highest weight)
	if (dataset.title?.toLowerCase().includes(lowerQuery)) score += 10;

	// Description match
	if (dataset.notes?.toLowerCase().includes(lowerQuery)) score += 5;

	// Tags match
	if (dataset.tags?.some((tag: any) => tag.name.toLowerCase().includes(lowerQuery))) score += 3;

	// Organization match
	if (dataset.organization?.title?.toLowerCase().includes(lowerQuery)) score += 2;

	// Resource format/name match
	if (
		dataset.resources?.some(
			(res: any) =>
				res.name?.toLowerCase().includes(lowerQuery) ||
				res.format?.toLowerCase().includes(lowerQuery),
		)
	)
		score += 1;

	return score;
}

// Function to determine update frequency category
function getUpdateFrequencyCategory(dataset: any): string {
	const refreshRate = dataset.refresh_rate?.toLowerCase() || "";
	const maintainedMetadata = dataset.maintainer_updated || dataset.metadata_modified;

	if (refreshRate.includes("daily") || refreshRate.includes("real-time")) return "daily";
	if (refreshRate.includes("weekly")) return "weekly";
	if (refreshRate.includes("monthly")) return "monthly";
	if (refreshRate.includes("quarterly")) return "quarterly";
	if (refreshRate.includes("annual") || refreshRate.includes("yearly")) return "annually";
	if (refreshRate.includes("irregular") || refreshRate.includes("as needed")) return "irregular";

	// Try to infer from metadata updates if available
	if (maintainedMetadata) {
		const lastUpdate = new Date(maintainedMetadata);
		const now = new Date();
		const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24);

		if (daysSinceUpdate < 7) return "frequent";
		if (daysSinceUpdate < 30) return "monthly";
		if (daysSinceUpdate < 90) return "quarterly";
		return "infrequent";
	}

	return "unknown";
}

// Register CKAN tools on the given MCP server
export function registerCkanTools(server: McpServer) {
	server.tool(
		"get_package",
		{ packageId: z.string() },
		async ({ packageId }: { packageId: string }) => {
			const pkg = await fetchCkanPackage(packageId);
			return {
				content: [{ type: "text", text: JSON.stringify(pkg, null, 2) }],
			};
		},
	);

	server.tool(
		"get_first_datastore_resource_records",
		{ packageId: z.string() },
		async ({ packageId }: { packageId: string }) => {
			const pkg = await fetchCkanPackage(packageId);

			const dsResources = pkg.resources.filter((r: any) => r.datastore_active);
			if (!dsResources.length) {
				return {
					content: [{ type: "text", text: "No active datastore resources found." }],
				};
			}
			const records = await fetchCkanResource(dsResources[0].id);
			return {
				content: [{ type: "text", text: JSON.stringify(records, null, 2) }],
			};
		},
	);

	server.tool(
		"get_resource_records",
		{ resourceId: z.string() },
		async ({ resourceId }: { resourceId: string }) => {
			const records = await fetchCkanResource(resourceId);
			return {
				content: [{ type: "text", text: JSON.stringify(records, null, 2) }],
			};
		},
	);

	server.tool("list_datasets", {}, async () => {
		const list = await fetchCkanPackageList();
		return {
			content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
		};
	});

	server.tool("search_datasets", { query: z.string() }, async ({ query }: { query: string }) => {
		const result = await fetchCkanPackageSearch(query);
		return {
			content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
		};
	});

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
				content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
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
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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
								const sampleData = await fetchCkanResource(resource.id);
								resourceInfo.sample_data = sampleData.slice(0, previewLimit || 5);
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
				content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
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
			content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		},
	);
}
