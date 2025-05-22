# Toronto MCP Server: Toronto Open Data Tools

This project implements a Model Context Protocol (MCP) server for Toronto Open Data, deployable on Cloudflare Workers. It exposes a set of tools for querying and retrieving datasets from Toronto's CKAN-powered open data portal, making them accessible to MCP-compatible clients (like Claude Desktop or the Cloudflare AI Playground).

## What does it do?

- **Provides a remote MCP server** exposing tools for Toronto's Open Data via the CKAN API.
- **Lets you list, search, and fetch datasets and records** from Toronto's open data catalog.
- **Easily extensible**: add more tools or data sources by editing `src/index.ts` and adding new tool modules.

## Features

- **list_datasets**: List all available datasets.
- **search_datasets**: Search datasets by keyword.
- **get_package**: Retrieve metadata for a dataset.
- **get_first_datastore_resource_records**: Get records from the first active resource in a dataset.
- **get_resource_records**: Get records from a specific resource.

## Tech Stack

- **Cloudflare Workers**: Serverless deployment platform.
- **Model Context Protocol (MCP)**: Standard for tool-based AI integrations.
- **TypeScript**: Type safety and modern JS features.
- **Zod**: Input validation for tool parameters.

## Project Structure

- `src/index.ts`: Main entry point. Sets up the MCP server and registers available tools.
- `src/ckanTools.ts`: Implements tools for accessing Toronto Open Data via CKAN API.

## Usage

1. **Deploy to Cloudflare Workers** (see `wrangler.jsonc` for config). You can use `wrangler deploy` to deploy your own instance.
2. **Connect from an MCP client** (e.g., Claude Desktop, Cloudflare AI Playground) using your Worker URL (e.g., `https://<your-worker>.workers.dev/sse`).
3. **Use the tools**: List, search, and fetch Toronto Open Data directly from your AI client.

## Extending

To add more tools, edit `src/index.ts` and register new tool modules. See `src/ckanTools.ts` for examples of tool definitions.

## dspy/ (Python DSPy Server)

This folder contains a Python-based server using the [dspy](https://github.com/stanfordnlp/dspy) package. It is designed to orchestrate tool calls to the MCP server (TypeScript) and provide a natural language interface for querying Toronto Open Data (CKAN) resources. The server exposes a simple chat API and can be extended for more advanced data analysis and visualization workflows.

- To set up, see `dspy/README.md` for Python environment and usage instructions.

---

_Originally based on the Cloudflare MCP server template, but focused on Toronto Open Data and CKAN tools._
