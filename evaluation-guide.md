# Toronto MCP Testing & Evaluation Guide

This guide provides comprehensive testing strategies for your Toronto Open Data MCP server to ensure it works correctly when integrated with AI assistants like Claude, Cursor, or other MCP clients.

## Quick Smoke Tests

Run these queries first to verify basic functionality:

### 1. Basic Connectivity Test

```
"List some Toronto datasets"
```

**Expected Tool**: `list_datasets` or `search_datasets`
**Success Criteria**: Returns list of dataset names

### 2. Search Functionality Test

```
"Find parking datasets in Toronto"
```

**Expected Tool**: `find_relevant_datasets`
**Success Criteria**: Returns ranked results with parking-related datasets at the top

### 3. Update Frequency Test

```
"How often is Toronto's traffic data updated?"
```

**Expected Tool**: `analyze_dataset_updates`
**Success Criteria**: Returns frequency analysis with categories like "daily", "weekly", etc.

### 4. Data Structure Test

```
"What fields are in Toronto's building permits data?"
```

**Expected Tool**: `analyze_dataset_structure`
**Success Criteria**: Returns field definitions and data types

## Comprehensive Test Queries

### Relevance & Discovery Tests

#### Test 1: Broad Topic Search

**Query**: `"What data does Toronto have about transportation?"`

- **Expected**: Multiple transportation-related datasets ranked by relevance
- **Validate**: Top results should include traffic, parking, transit, roads
- **Score Quality**: Check if relevance scores make sense (traffic accidents > general city info)

#### Test 2: Specific Need Search

**Query**: `"I need data about restaurant health inspections in Toronto"`

- **Expected**: Food safety, restaurant inspection datasets
- **Validate**: Results should be highly specific to food/health/restaurants
- **Score Quality**: Check precision - avoid unrelated datasets

#### Test 3: Multi-keyword Search

**Query**: `"Find datasets about housing development permits construction"`

- **Expected**: Building permits, development applications, housing data
- **Validate**: Should handle multiple related keywords effectively
- **Score Quality**: Check recall - don't miss relevant datasets due to exact keyword matching

### Update Frequency Tests

#### Test 4: Frequency Analysis

**Query**: `"How current is Toronto's budget and financial data?"`

- **Expected**: Analysis of financial dataset update patterns
- **Validate**: Should categorize by frequency (annual for budgets, monthly for expenditures)
- **Check Logic**: Ensure frequency categorization makes sense

#### Test 5: Real-time Data Detection

**Query**: `"What Toronto data updates in real-time or daily?"`

- **Expected**: List of frequently updated datasets
- **Validate**: Should identify traffic, weather, transit data as frequent
- **Check Accuracy**: Verify against actual dataset metadata

#### Test 6: Stale Data Identification

**Query**: `"Which Toronto datasets haven't been updated recently?"`

- **Expected**: List of infrequently updated or stale datasets
- **Validate**: Should identify historical/static datasets
- **Check Logic**: Ensure "staleness" determination is reasonable

### Data Structure Tests

#### Test 7: Schema Analysis

**Query**: `"What's the structure of Toronto's crime data?"`

- **Expected**: Field definitions, data types, sample records
- **Validate**: Should show fields like location, crime type, date, etc.
- **Check Completeness**: Ensure all fields are captured

#### Test 8: Large Dataset Handling

**Query**: `"Analyze the structure of Toronto's largest dataset"`

- **Expected**: Should handle large datasets efficiently
- **Validate**: Response time should be reasonable (<30 seconds)
- **Check Performance**: Monitor memory usage and API calls

#### Test 9: Multi-Resource Dataset

**Query**: `"What data formats are available for Toronto's budget information?"`

- **Expected**: Analysis of multiple resources (CSV, PDF, API)
- **Validate**: Should list all formats and their characteristics
- **Check Coverage**: Ensure all resources are analyzed

## Quality Evaluation Criteria

### Relevance Scoring Validation

Create a test set of queries with known "correct" answers:

```typescript
const relevanceTests = [
  {
    query: "traffic accidents",
    expectedTop3: [
      "motor-vehicle-collisions",
      "traffic-signals",
      "road-closures",
    ],
    shouldNotInclude: ["budget", "election-results", "library-hours"],
  },
  {
    query: "budget financial",
    expectedTop3: ["budget", "financial-performance", "capital-budget"],
    shouldNotInclude: ["parking-tickets", "building-permits", "zoning"],
  },
];
```

**Validation Approach**:

1. Run queries and collect top 10 results
2. Check if expected datasets appear in top 3
3. Verify irrelevant datasets are ranked low
4. Calculate precision@3 and recall@10 metrics

### Update Frequency Accuracy

**Manual Verification Steps**:

1. Pick 10 random datasets from different frequency categories
2. Manually check their actual update schedules on Toronto Open Data portal
3. Compare with MCP tool classifications
4. Calculate accuracy percentage

**Common Issues to Check**:

- Historical datasets marked as "current"
- One-time datasets marked as "regular"
- Misclassification due to metadata parsing errors

### Data Structure Completeness

**Validation Checklist**:

- [ ] All fields are captured
- [ ] Data types are correctly identified
- [ ] Record counts are accurate
- [ ] Sample data is representative
- [ ] Missing or null fields are handled
- [ ] Multiple resources are all analyzed

## Performance Benchmarks

### Response Time Targets

- Simple queries (search, list): < 3 seconds
- Complex analysis (insights): < 10 seconds
- Large dataset structure analysis: < 30 seconds

### Resource Usage Monitoring

```bash
# Monitor during testing
curl -w "@curl-format.txt" -s -o /dev/null [your-mcp-endpoint]
```

## Error Handling Tests

### Test Invalid Inputs

```json
{
  "tool": "analyze_dataset_structure",
  "parameters": {
    "packageId": "non-existent-dataset"
  }
}
```

**Expected**: Graceful error message, not a crash

### Test Malformed Queries

```json
{
  "tool": "find_relevant_datasets",
  "parameters": {
    "query": "",
    "maxResults": -1
  }
}
```

**Expected**: Parameter validation error

### Test Network Issues

Simulate API timeouts and verify graceful degradation

## Automated Testing Setup

### 1. Install Testing Dependencies

```bash
npm install --save-dev tsx @types/jest jest
```

### 2. Create Test Configuration

```typescript
// jest.config.js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/test-setup.ts"],
};
```

### 3. Run Automated Tests

```bash
# Basic functionality tests
npx tsx test-runner.ts

# Performance benchmarks
npx tsx performance-tests.ts

# Full test suite with coverage
npm test
```

## Continuous Evaluation

### Daily Health Checks

Set up automated daily tests that verify:

- Basic connectivity to Toronto Open Data API
- Key dataset availability
- Response time benchmarks
- Error rate monitoring

### Weekly Quality Audits

- Random sample testing of relevance scoring
- Manual verification of new datasets
- Performance regression testing
- User feedback analysis (if available)

### Monthly Deep Evaluations

- Comprehensive relevance testing with expanded test sets
- Update frequency accuracy auditing
- Data structure completeness verification
- Competitive analysis against other tools

## Integration Testing with AI Assistants

### Claude Desktop Testing

1. Connect MCP server to Claude Desktop
2. Test natural language queries
3. Verify tool selection is appropriate
4. Check response formatting and clarity

### Cursor Testing

1. Set up MCP integration in Cursor
2. Test code generation scenarios using Toronto data
3. Verify data structure insights help with code writing
4. Check performance in IDE context

### Custom Client Testing

Build minimal MCP client to test tool calls directly:

```typescript
// minimal-test-client.ts
import { McpClient } from "@modelcontextprotocol/sdk/client";

const client = new McpClient();
await client.connect("https://toronto-mcp.s-a62.workers.dev/mcp");

const result = await client.callTool("find_relevant_datasets", {
  query: "parking",
  maxResults: 5,
});

console.log(JSON.stringify(result, null, 2));
```

## Success Metrics

### Functional Metrics

- **Tool Success Rate**: >95% of tool calls complete without errors
- **Relevance Accuracy**: >80% of top-3 results are relevant
- **Update Classification Accuracy**: >90% of frequency classifications are correct
- **Schema Coverage**: >95% of dataset fields are captured

### Performance Metrics

- **Average Response Time**: <5 seconds for typical queries
- **95th Percentile Response Time**: <15 seconds
- **Error Rate**: <2% of requests fail
- **Cache Hit Rate**: >70% for repeated queries

### User Experience Metrics (if available)

- **Query Success Rate**: Users find what they're looking for
- **Tool Selection Accuracy**: AI assistant picks appropriate tools
- **Response Clarity**: Results are understandable and actionable

This comprehensive testing approach ensures your MCP server is robust, accurate, and performs well in real-world usage scenarios.
