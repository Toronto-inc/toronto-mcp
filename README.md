# Toronto MCP Server: Toronto Open Data Tools

This project implements a Model Context Protocol (MCP) server for Toronto Open Data, deployable on Cloudflare Workers. It exposes a comprehensive set of tools for intelligently querying, analyzing, and retrieving datasets from Toronto's CKAN-powered open data portal, making them accessible to MCP-compatible clients like Claude Desktop, Cursor, and other AI assistants.

## 🚀 Live Server

**Deployed at**: `https://toronto-mcp.s-a62.workers.dev`

- **SSE Endpoint**: `https://toronto-mcp.s-a62.workers.dev/sse` (for Claude Desktop)
- **MCP Endpoint**: `https://toronto-mcp.s-a62.workers.dev/mcp` (for other clients)

## What does it do?

- **Provides a remote MCP server** exposing tools for Toronto's Open Data via the CKAN API
- **Intelligently discovers relevant datasets** using advanced relevance scoring
- **Analyzes data freshness patterns** with comprehensive update frequency tracking
- **Provides deep data structure insights** including field analysis and schema information
- **Enables natural language querying** of Toronto's 500+ open datasets
- **Supports comprehensive data analysis** combining multiple analytical dimensions

## 🛠️ Features

### Basic CKAN Tools

- **`list_datasets`**: List all available datasets
- **`search_datasets`**: Search datasets by keyword
- **`get_package`**: Retrieve complete metadata for a dataset
- **`get_first_datastore_resource_records`**: Get records from the first active resource
- **`get_resource_records`**: Get records from a specific resource by ID

### 🧠 Advanced Analysis Tools

- **`find_relevant_datasets`**: Intelligently find and rank datasets using relevance scoring (title, description, tags, organization)
- **`analyze_dataset_updates`**: Analyze update frequencies with categorization (daily, weekly, monthly, quarterly, annually, irregular)
- **`analyze_dataset_structure`**: Deep-dive into dataset structure with field definitions, data types, record counts, and optional data previews
- **`get_data_categories`**: Explore all available organizations and topic groups
- **`get_dataset_insights`**: Comprehensive analysis combining relevance ranking, update frequency, and data structure insights

## 💡 Use Cases

### For AI Assistants & Researchers

- **"What traffic data is available in Toronto?"** → Ranked datasets with relevance scores and update frequencies
- **"How current is Toronto's environmental data?"** → Update frequency analysis across environmental datasets
- **"What fields are in the building permits dataset?"** → Complete schema analysis with data types and sample records
- **"Give me insights about Toronto's budget data"** → Comprehensive analysis with relevance, freshness, and structure
- **"Which datasets update daily?"** → Frequency-based filtering and categorization

### For Data Scientists & Analysts

- Discover datasets relevant to specific research questions
- Assess data quality and reliability through update patterns
- Understand data structure before detailed analysis
- Find related datasets across different city departments
- Evaluate data completeness and field availability

## 🏗️ Tech Stack

- **Cloudflare Workers**: Serverless deployment platform
- **Model Context Protocol (MCP)**: Standard for AI tool integrations
- **TypeScript**: Type safety and modern development
- **Zod**: Runtime parameter validation
- **CKAN API**: Direct integration with Toronto Open Data

## 📁 Project Structure

```
toronto-mcp/
├── src/
│   ├── index.ts                 # MCP server setup and routing
│   └── ckanTools.ts            # Toronto Open Data tools implementation
├── test-runner.ts              # Automated testing framework
├── test-deployment.ts          # Deployment validation script
├── claude-mcp-config.json      # Claude Desktop configuration
├── evaluation-guide.md         # Comprehensive testing strategies
├── example-usage.md            # Usage examples and patterns
├── testing-guide.md            # Automated testing documentation
└── README.md                   # This file
```

## 🚀 Quick Start

### 1. Deploy Your Own Instance

```bash
# Clone and deploy
git clone <your-repo>
cd toronto-mcp
npm install
wrangler deploy
```

### 2. Test Deployment

```bash
# Install testing dependencies
npm install tsx

# Test your deployment
npx tsx test-deployment.ts https://your-worker.workers.dev
```

### 3. Connect to Claude Desktop

Create or edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "toronto-open-data": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-fetch",
        "https://toronto-mcp.s-a62.workers.dev/sse"
      ],
      "env": {}
    }
  }
}
```

Restart Claude Desktop and start asking questions about Toronto's open data!

## 🧪 Testing & Validation

### Quick Connectivity Test

```bash
npx tsx test-deployment.ts https://toronto-mcp.s-a62.workers.dev
```

### Automated Testing Framework

```bash
# Run mock tests (validates framework)
npm test

# Test specific deployment
npm run test:deployment https://your-url.workers.dev
```

### Manual Testing in Claude Desktop

Try these test queries to verify functionality:

1. **Basic Search**: "Find datasets about parking in Toronto"
2. **Update Analysis**: "How often does Toronto update traffic data?"
3. **Data Structure**: "What fields are in Toronto's building permits data?"
4. **Comprehensive**: "Give me insights about Toronto's environmental data"
5. **Categories**: "What departments provide open data in Toronto?"

## 📊 Success Metrics

Your MCP server is working correctly when:

- ✅ Claude consistently selects appropriate tools for queries
- ✅ Results include relevance scores and rankings
- ✅ Update frequency information is categorized correctly
- ✅ Data structure analysis shows complete field information
- ✅ Response times are under 10 seconds for complex queries
- ✅ Error handling provides helpful messages

## 📚 Documentation

### 📘 [Example Usage Guide](./example-usage.md)

Concrete examples of how to use each MCP tool, including JSON parameters and expected responses. Essential for understanding tool capabilities and integration patterns.

### 📊 [Evaluation & Testing Guide](./evaluation-guide.md)

Comprehensive testing strategies, quality metrics, and evaluation criteria. Includes manual test queries, performance benchmarks, and success metrics for validating MCP server functionality.

### 🧪 [Automated Testing Framework](./testing-guide.md)

TypeScript test framework for programmatic validation, performance monitoring, and automated quality assurance. Includes executable test cases and CI/CD integration patterns.

### ⚙️ [Claude Desktop Configuration](./claude-mcp-config.json)

Ready-to-use MCP server configuration for Claude Desktop integration.

## 🎯 Example Tool Usage

### Natural Language Queries (via AI Assistant)

```
"What traffic data is available in Toronto and how current is it?"
"Find housing development datasets with field information"
"Which Toronto datasets update daily?"
"Give me insights about budget and financial data"
```

### Direct Tool Calls (for developers)

```typescript
// Intelligent dataset discovery
await find_relevant_datasets({
  query: "traffic accidents",
  maxResults: 5,
  includeRelevanceScore: true,
});

// Update frequency analysis
await analyze_dataset_updates({
  query: "transportation",
  groupByFrequency: true,
});

// Complete data structure analysis
await analyze_dataset_structure({
  packageId: "building-permits",
  includeDataPreview: true,
  previewLimit: 10,
});

// Comprehensive insights
await get_dataset_insights({
  query: "housing development",
  maxDatasets: 3,
  includeUpdateFrequency: true,
  includeDataStructure: true,
});
```

## 🔧 Available Scripts

```bash
npm run dev           # Start development server
npm run deploy        # Deploy to Cloudflare Workers
npm run test          # Run automated tests
npm run test:deployment  # Test specific deployment
npm run lint:fix      # Fix linting issues
npm run format        # Format code
```

## 🌟 Key Features

### Intelligent Relevance Scoring

- **Weighted algorithm**: Title (10pts) > Description (5pts) > Tags (3pts) > Organization (2pts)
- **Context-aware ranking**: Matches user intent with appropriate datasets
- **Multi-keyword support**: Handles complex queries effectively

### Comprehensive Update Analysis

- **Frequency categorization**: Daily, weekly, monthly, quarterly, annually, irregular
- **Metadata inference**: Analyzes patterns when explicit schedules aren't available
- **Quality assessment**: Identifies stale vs. actively maintained datasets

### Deep Data Structure Insights

- **Complete schema analysis**: Field names, types, constraints
- **Record statistics**: Counts, completeness, data quality indicators
- **Sample data**: Optional previews for quick assessment
- **Multi-resource support**: Handles datasets with multiple files/formats

## 🚀 Extending

To add more tools or data sources:

1. **Edit** `src/ckanTools.ts` to add new tool functions
2. **Register** new tools in `src/index.ts`
3. **Update** type definitions and validation schemas
4. **Add** corresponding tests in the testing framework

Example:

```typescript
server.tool("new_analysis_tool", { param: z.string() }, async ({ param }) => {
  // Implementation
  return { content: [{ type: "text", text: result }] };
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Built for intelligent open data discovery** • Powered by Toronto Open Data & CKAN API • Enhanced for AI assistant integration
