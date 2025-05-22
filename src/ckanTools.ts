import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
// CKAN API base URL for Toronto Open Data
const CKAN_BASE =
  "https://ckan0.cf.opendata.inter.prod-toronto.ca/api/3/action";

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
    }
  );

  server.tool(
    "get_first_datastore_resource_records",
    { packageId: z.string() },
    async ({ packageId }: { packageId: string }) => {
      const pkg = await fetchCkanPackage(packageId);

      const dsResources = pkg.resources.filter((r: any) => r.datastore_active);
      if (!dsResources.length) {
        return {
          content: [
            { type: "text", text: "No active datastore resources found." },
          ],
        };
      }
      const records = await fetchCkanResource(dsResources[0].id);
      return {
        content: [{ type: "text", text: JSON.stringify(records, null, 2) }],
      };
    }
  );

  server.tool(
    "get_resource_records",
    { resourceId: z.string() },
    async ({ resourceId }: { resourceId: string }) => {
      const records = await fetchCkanResource(resourceId);
      return {
        content: [{ type: "text", text: JSON.stringify(records, null, 2) }],
      };
    }
  );

  server.tool("list_datasets", {}, async () => {
    const list = await fetchCkanPackageList();
    return {
      content: [{ type: "text", text: JSON.stringify(list, null, 2) }],
    };
  });

  server.tool(
    "search_datasets",
    { query: z.string() },
    async ({ query }: { query: string }) => {
      const result = await fetchCkanPackageSearch(query);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
