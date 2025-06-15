# Toronto MCP Usage Examples

This document shows examples of how to use the advanced Toronto Open Data MCP tools from AI assistants like Claude, Cursor, or other MCP clients.

## Scenario 1: Research Assistant - Finding Traffic Data

**User Query**: "I need to analyze traffic accident patterns in Toronto. What data is available?"

**MCP Tool Usage**:

```json
{
  "tool": "find_relevant_datasets",
  "parameters": {
    "query": "traffic accidents collisions",
    "maxResults": 5,
    "includeRelevanceScore": true
  }
}
```

**Expected Response**: Ranked list of datasets like "Motor Vehicle Collisions", "Traffic Signals", with relevance scores and update frequencies.

## Scenario 2: Data Quality Assessment

**User Query**: "How often does Toronto update their parking and transportation data?"

**MCP Tool Usage**:

```json
{
  "tool": "analyze_dataset_updates",
  "parameters": {
    "query": "parking transportation",
    "groupByFrequency": true
  }
}
```

**Expected Response**: Categorized breakdown showing which datasets update daily, weekly, monthly, etc.

## Scenario 3: Data Structure Analysis

**User Query**: "What fields are available in Toronto's building permits dataset?"

**MCP Tool Usage**:

```json
{
  "tool": "analyze_dataset_structure",
  "parameters": {
    "packageId": "building-permits",
    "includeDataPreview": true,
    "previewLimit": 5
  }
}
```

**Expected Response**: Field definitions, data types, record counts, and sample data.

## Scenario 4: Comprehensive Research

**User Query**: "Give me insights about Toronto's housing and development data"

**MCP Tool Usage**:

```json
{
  "tool": "get_dataset_insights",
  "parameters": {
    "query": "housing development permits construction",
    "maxDatasets": 3,
    "includeUpdateFrequency": true,
    "includeDataStructure": true
  }
}
```

**Expected Response**: Complete analysis including:

- Most relevant datasets
- Update frequency analysis
- Data structure overview
- Suggested related searches

## Scenario 5: Exploring Data Categories

**User Query**: "What categories of data does Toronto provide?"

**MCP Tool Usage**:

```json
{
  "tool": "get_data_categories",
  "parameters": {}
}
```

**Expected Response**: List of all organizations (city departments) and topic groups with dataset counts.

## Advanced Query Examples

### Complex Search with Filters

Find datasets about environment and sustainability:

```json
{
  "tool": "find_relevant_datasets",
  "parameters": {
    "query": "environment sustainability green energy",
    "maxResults": 10,
    "includeRelevanceScore": true
  }
}
```

### Update Pattern Analysis for Specific Datasets

Analyze specific datasets by ID:

```json
{
  "tool": "analyze_dataset_updates",
  "parameters": {
    "packageIds": ["air-quality", "water-quality", "green-space"],
    "groupByFrequency": true
  }
}
```

### Deep Data Analysis

Get comprehensive structure analysis with data preview:

```json
{
  "tool": "analyze_dataset_structure",
  "parameters": {
    "packageId": "financial-performance",
    "includeDataPreview": true,
    "previewLimit": 10
  }
}
```

## AI Assistant Integration Tips

1. **Chain Multiple Tools**: Start with `find_relevant_datasets`, then use `analyze_dataset_structure` for detailed analysis.

2. **Update Frequency Awareness**: Use `analyze_dataset_updates` to inform users about data freshness.

3. **Smart Recommendations**: Use `get_dataset_insights` for comprehensive responses to broad queries.

4. **Category Exploration**: Use `get_data_categories` to help users discover what's available.

5. **Progressive Disclosure**: Start with basic search, then drill down based on user interest.

## Error Handling

The tools are designed to be robust:

- Invalid dataset IDs return helpful error messages
- Missing datastore resources are handled gracefully
- Network timeouts have appropriate fallbacks
- Large datasets are paginated automatically

## Performance Notes

- `find_relevant_datasets` uses smart caching and scoring
- `analyze_dataset_structure` can be expensive for datasets with many resources
- `get_dataset_insights` combines multiple API calls efficiently
- All tools support parameter validation via Zod schemas
