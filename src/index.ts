import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { McpAgent } from "agents/mcp";
import { registerCkanTools } from "./ckanTools";

export class TorontoMCP extends McpAgent {
  server = new McpServer({
    name: "Toronto MCP",
    version: "1.0.0",
  });

  async init() {
    registerCkanTools(this.server);
    // In the future, add more tool groups here (e.g., open511Tools(this.server))
  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      // @ts-ignore
      return TorontoMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      // @ts-ignore
      return TorontoMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Not found", { status: 404 });
  },
};
