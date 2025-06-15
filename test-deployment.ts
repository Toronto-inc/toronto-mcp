#!/usr/bin/env tsx

/**
 * Simple deployment test for Toronto MCP Server
 * Usage: npx tsx test-deployment.ts [your-worker-url]
 */

interface TestResult {
	name: string;
	passed: boolean;
	error?: string;
	responseTime?: number;
	details?: any;
}

class DeploymentTester {
	private baseUrl: string;
	private results: TestResult[] = [];

	constructor(baseUrl: string) {
		this.baseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
	}

	async runAllTests(): Promise<void> {
		console.log(`🚀 Testing Toronto MCP Server at: ${this.baseUrl}`);
		console.log("=".repeat(60));

		// Basic connectivity tests
		await this.testConnectivity();
		await this.testMCPEndpoint();
		await this.testSSEEndpoint();

		// Tool functionality tests (if MCP client is available)
		await this.testToolAvailability();

		// Report results
		this.reportResults();
	}

	private async testConnectivity(): Promise<void> {
		const test: TestResult = { name: "Basic Connectivity", passed: false };

		try {
			const start = Date.now();
			const response = await fetch(this.baseUrl);
			test.responseTime = Date.now() - start;

			test.passed = response.status === 404; // Expected for root path
			test.details = { status: response.status, statusText: response.statusText };

			if (response.status === 404) {
				console.log("✅ Server is responding (404 expected for root path)");
			} else {
				console.log(`⚠️  Unexpected status: ${response.status}`);
			}
		} catch (error) {
			test.error = error instanceof Error ? error.message : "Unknown error";
			console.log(`❌ Connectivity failed: ${test.error}`);
		}

		this.results.push(test);
	}

	private async testMCPEndpoint(): Promise<void> {
		const test: TestResult = { name: "MCP Endpoint", passed: false };

		try {
			const start = Date.now();
			const response = await fetch(`${this.baseUrl}/mcp`);
			test.responseTime = Date.now() - start;

			// MCP endpoint should respond differently than 404
			test.passed = response.status !== 404;
			test.details = { status: response.status, statusText: response.statusText };

			if (test.passed) {
				console.log("✅ MCP endpoint is accessible");
			} else {
				console.log("❌ MCP endpoint not found");
			}
		} catch (error) {
			test.error = error instanceof Error ? error.message : "Unknown error";
			console.log(`❌ MCP endpoint test failed: ${test.error}`);
		}

		this.results.push(test);
	}

	private async testSSEEndpoint(): Promise<void> {
		const test: TestResult = { name: "SSE Endpoint", passed: false };

		try {
			const start = Date.now();
			const response = await fetch(`${this.baseUrl}/sse`);
			test.responseTime = Date.now() - start;

			// SSE endpoint should be accessible
			test.passed = response.status !== 404;
			test.details = { status: response.status, statusText: response.statusText };

			if (test.passed) {
				console.log("✅ SSE endpoint is accessible");
			} else {
				console.log("❌ SSE endpoint not found");
			}
		} catch (error) {
			test.error = error instanceof Error ? error.message : "Unknown error";
			console.log(`❌ SSE endpoint test failed: ${test.error}`);
		}

		this.results.push(test);
	}

	private async testToolAvailability(): Promise<void> {
		const test: TestResult = { name: "Tool Availability", passed: false };

		try {
			// This is a simplified test - in practice you'd need a proper MCP client
			// For now, just check if the endpoints are responding appropriately
			const mcpResponse = await fetch(`${this.baseUrl}/mcp`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: "tools/list",
					id: 1,
				}),
			});

			test.passed = mcpResponse.status === 200;
			test.details = {
				status: mcpResponse.status,
				contentType: mcpResponse.headers.get("content-type"),
			};

			if (test.passed) {
				console.log("✅ MCP tools endpoint responding");
			} else {
				console.log(`⚠️  MCP tools check inconclusive (status: ${mcpResponse.status})`);
			}
		} catch (error) {
			test.error = error instanceof Error ? error.message : "Unknown error";
			console.log(`❌ Tool availability test failed: ${test.error}`);
		}

		this.results.push(test);
	}

	private reportResults(): void {
		console.log(`\n${"=".repeat(60)}`);
		console.log("📊 TEST RESULTS SUMMARY");
		console.log("=".repeat(60));

		const passed = this.results.filter((r) => r.passed).length;
		const total = this.results.length;

		for (const result of this.results) {
			const status = result.passed ? "✅" : "❌";
			const time = result.responseTime ? ` (${result.responseTime}ms)` : "";
			console.log(`${status} ${result.name}${time}`);

			if (result.error) {
				console.log(`   Error: ${result.error}`);
			}

			if (result.details) {
				console.log(`   Details: ${JSON.stringify(result.details)}`);
			}
		}

		console.log(`\n📈 Overall: ${passed}/${total} tests passed`);

		if (passed === total) {
			console.log("🎉 Deployment looks good!");
		} else {
			console.log("⚠️  Some issues detected. Check the details above.");
		}
	}
}

// Manual test queries to run once MCP is connected
const MANUAL_TEST_QUERIES = [
	{
		description: "Basic search test",
		query: "Find Toronto parking datasets",
		expectedTool: "find_relevant_datasets",
		validation: "Should return parking-related datasets with relevance scores",
	},
	{
		description: "Update frequency test",
		query: "How often does Toronto update traffic data?",
		expectedTool: "analyze_dataset_updates",
		validation: "Should categorize datasets by update frequency",
	},
	{
		description: "Data structure test",
		query: "What fields are available in Toronto building permits data?",
		expectedTool: "analyze_dataset_structure",
		validation: "Should return field definitions and data types",
	},
	{
		description: "Comprehensive insights test",
		query: "Give me insights about Toronto's budget data",
		expectedTool: "get_dataset_insights",
		validation: "Should provide relevance ranking, update frequency, and structure info",
	},
	{
		description: "Category exploration test",
		query: "What categories of data does Toronto provide?",
		expectedTool: "get_data_categories",
		validation: "Should list organizations and topic groups",
	},
];

function printManualTestGuide(): void {
	console.log(`\n${"=".repeat(60)}`);
	console.log("🧪 MANUAL TESTING GUIDE");
	console.log("=".repeat(60));
	console.log("Once your MCP server is connected to an AI assistant, try these queries:");
	console.log("");

	MANUAL_TEST_QUERIES.forEach((test, index) => {
		console.log(`${index + 1}. ${test.description}`);
		console.log(`   Query: "${test.query}"`);
		console.log(`   Expected Tool: ${test.expectedTool}`);
		console.log(`   Validation: ${test.validation}`);
		console.log("");
	});
}

// Main execution
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.log("Usage: npx tsx test-deployment.ts <worker-url>");
		console.log("Example: npx tsx test-deployment.ts https://your-worker.workers.dev");
		process.exit(1);
	}

	const workerUrl = args[0];
	const tester = new DeploymentTester(workerUrl);

	await tester.runAllTests();
	printManualTestGuide();
}

if (require.main === module) {
	main().catch(console.error);
}
