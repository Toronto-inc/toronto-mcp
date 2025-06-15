// MCP Tool Testing Framework
// Run with: npx tsx test-runner.ts

interface TestCase {
name: string;
tool: string;
parameters: any;
expectedChecks: {
hasResults?: boolean;
minResults?: number;
maxResults?: number;
hasField?: string[];
noErrors?: boolean;
customCheck?: (result: any) => boolean;
};
}

const testCases: TestCase[] = [
{
name: "Basic Dataset Search",
tool: "find_relevant_datasets",
parameters: {
query: "parking",
maxResults: 5,
includeRelevanceScore: true
},
expectedChecks: {
hasResults: true,
minResults: 1,
hasField: ["datasets", "total_found"],
noErrors: true
}
},
{
name: "Update Frequency Analysis",
tool: "analyze_dataset_updates",
parameters: {
query: "traffic",
groupByFrequency: true
},
expectedChecks: {
hasResults: true,
hasField: ["frequency_summary", "total_datasets"],
customCheck: (result) => result.frequency_summary?.length > 0
}
},
{
name: "Data Structure Analysis",
tool: "analyze_dataset_structure",
parameters: {
packageId: "building-permits", // This might need to be updated with actual ID
includeDataPreview: false
},
expectedChecks: {
hasResults: true,
hasField: ["resources", "resource_summary"],
customCheck: (result) => result.resources?.length > 0
}
},
{
name: "Category Discovery",
tool: "get_data_categories",
parameters: {},
expectedChecks: {
hasResults: true,
hasField: ["organizations", "groups"],
customCheck: (result) => result.organizations?.length > 0
}
},
{
name: "Comprehensive Insights",
tool: "get_dataset_insights",
parameters: {
query: "transportation",
maxDatasets: 3,
includeUpdateFrequency: true,
includeDataStructure: true
},
expectedChecks: {
hasResults: true,
minResults: 1,
hasField: ["insights", "query_suggestions"],
customCheck: (result) => result.insights?.length > 0
}
}
];

// Mock MCP client for testing
class MCPTestClient {
private baseUrl: string;

constructor(baseUrl: string) {
this.baseUrl = baseUrl;
}

async callTool(toolName: string, parameters: any): Promise<any> {
// This would integrate with your actual MCP client
// For now, this is a placeholder that would call your deployed worker
console.log(`Calling tool: ${toolName} with parameters:`, parameters);

    // In real implementation, this would make HTTP request to your MCP server
    // return await this.makeRequest(toolName, parameters);

    // For testing, return mock response
    return { mock: true, tool: toolName, parameters };

}
}

async function runTest(client: MCPTestClient, testCase: TestCase): Promise<boolean> {
console.log(`\n🧪 Running test: ${testCase.name}`);

try {
const result = await client.callTool(testCase.tool, testCase.parameters);
console.log(`✅ Tool executed successfully`);

    // Run validation checks
    let passed = true;
    const checks = testCase.expectedChecks;

    if (checks.hasResults && !result) {
      console.log(`❌ Expected results but got none`);
      passed = false;
    }

    if (checks.hasField) {
      for (const field of checks.hasField) {
        if (!(field in result)) {
          console.log(`❌ Missing expected field: ${field}`);
          passed = false;
        }
      }
    }

    if (checks.minResults && result.datasets?.length < checks.minResults) {
      console.log(`❌ Expected at least ${checks.minResults} results, got ${result.datasets?.length}`);
      passed = false;
    }

    if (checks.customCheck && !checks.customCheck(result)) {
      console.log(`❌ Custom validation check failed`);
      passed = false;
    }

    if (passed) {
      console.log(`✅ Test passed: ${testCase.name}`);
    } else {
      console.log(`❌ Test failed: ${testCase.name}`);
    }

    return passed;

} catch (error) {
console.log(`❌ Test failed with error: ${error}`);
return false;
}
}

async function runAllTests() {
console.log("🚀 Starting MCP Tool Testing");

// Replace with your actual MCP server URL
const client = new MCPTestClient("<https://toronto-mcp.s-a62.workers.dev>");

let passed = 0;
let total = testCases.length;

for (const testCase of testCases) {
const result = await runTest(client, testCase);
if (result) passed++;
}

console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);

if (passed === total) {
console.log("🎉 All tests passed!");
process.exit(0);
} else {
console.log("💥 Some tests failed!");
process.exit(1);
}
}

// Performance testing
async function runPerformanceTests(client: MCPTestClient) {
console.log("\n⚡ Running Performance Tests");

const performanceTests = [
{
name: "Large Query Response Time",
tool: "find_relevant_datasets",
parameters: { query: "toronto", maxResults: 50 }
},
{
name: "Complex Analysis Response Time",
tool: "get_dataset_insights",
parameters: { query: "budget financial", maxDatasets: 10 }
}
];

for (const test of performanceTests) {
const start = Date.now();
await client.callTool(test.tool, test.parameters);
const duration = Date.now() - start;

    console.log(`${test.name}: ${duration}ms`);

    if (duration > 10000) { // 10 second threshold
      console.log(`⚠️  Slow response: ${test.name} took ${duration}ms`);
    }

}
}

// Run tests if called directly
if (require.main === module) {
runAllTests().catch(console.error);
}

export { runAllTests, runPerformanceTests, TestCase };
