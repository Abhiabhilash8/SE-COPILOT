// backend/mcpServer.js

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const path = require("path");

const {
    GraphLoader,
    GraphSearch,
    repositorySummary,
    explainAuthenticationFlow,
    explainApiFlow,
    findCircularDependencies,
    findEntryPoints,
    findDatabaseAccess,
    findConnectedModules
} = require("./graph/index.js");

// Initialize and load the graph database once at server startup
const graphFolderPath = path.join(__dirname, "..", "repositories", "to-do");
const graph = GraphLoader(graphFolderPath);
const search = new GraphSearch(graph);

// Instantiate the MCP Server
const server = new Server(
    {
        name: "se-copilot-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define tool schemas for discovery by LLMs
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            // ----------------------------------------------------
            // Search Tools
            // ----------------------------------------------------
            {
                name: "find_node_by_id",
                description: "Retrieve details of a specific node by its ID.",
                inputSchema: {
                    type: "object",
                    properties: {
                        nodeId: { type: "string", description: "The unique ID of the node (e.g. 'project:root', 'model:user')." }
                    },
                    required: ["nodeId"]
                }
            },
            {
                name: "find_node_by_name",
                description: "Find a node in the graph by its name attribute.",
                inputSchema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "The name of the node (e.g. 'User', 'exports.login')." }
                    },
                    required: ["name"]
                }
            },
            {
                name: "find_nodes_by_type",
                description: "Get all nodes of a specific entity type.",
                inputSchema: {
                    type: "object",
                    properties: {
                        type: { type: "string", description: "The type of entities (e.g. 'Function', 'API Endpoint', 'Model', 'Folder')." }
                    },
                    required: ["type"]
                }
            },
            {
                name: "find_dependencies",
                description: "List the direct outgoing dependencies of a node.",
                inputSchema: {
                    type: "object",
                    properties: {
                        nodeId: { type: "string", description: "The unique ID of the node." }
                    },
                    required: ["nodeId"]
                }
            },
            {
                name: "find_dependents",
                description: "List the components that directly depend on a node.",
                inputSchema: {
                    type: "object",
                    properties: {
                        nodeId: { type: "string", description: "The unique ID of the node." }
                    },
                    required: ["nodeId"]
                }
            },
            {
                name: "find_shortest_path",
                description: "Find the shortest call path between two nodes using BFS.",
                inputSchema: {
                    type: "object",
                    properties: {
                        startId: { type: "string", description: "The starting node ID." },
                        targetId: { type: "string", description: "The target node ID." }
                    },
                    required: ["startId", "targetId"]
                }
            },
            // ----------------------------------------------------
            // Intelligence Tools
            // ----------------------------------------------------
            {
                name: "get_repository_summary",
                description: "Retrieve summary statistics and breakdown of codebase components.",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            },
            {
                name: "explain_authentication_flow",
                description: "Explain security configurations and authentication middleware connections.",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            },
            {
                name: "explain_api_flow",
                description: "Traces the path from an API route endpoint to database calls.",
                inputSchema: {
                    type: "object",
                    properties: {
                        routeNodeId: { type: "string", description: "The unique ID of the API endpoint node (e.g. 'endpoint:post_login')." }
                    },
                    required: ["routeNodeId"]
                }
            },
            {
                name: "find_circular_dependencies",
                description: "Scan the repository graph for recursive or circular dependency loops.",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            },
            {
                name: "find_entry_points",
                description: "List nodes that serve as codebase entry points (nodes with zero incoming edges).",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            },
            {
                name: "find_database_access",
                description: "List all components that directly reference/access database storage.",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            },
            {
                name: "find_connected_modules",
                description: "Group repository entities into components based on folder-module clustering.",
                inputSchema: {
                    type: "object",
                    properties: {}
                }
            }
        ]
    };
});

// Handle incoming tool execution calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        let result;

        switch (name) {
            // Search APIs
            case "find_node_by_id":
                result = search.findNodeById(args.nodeId);
                break;
            case "find_node_by_name":
                result = search.findNodeByName(args.name);
                break;
            case "find_nodes_by_type":
                result = search.findNodesByType(args.type);
                break;
            case "find_dependencies":
                result = search.findDependencies(args.nodeId);
                break;
            case "find_dependents":
                result = search.findDependents(args.nodeId);
                break;
            case "find_shortest_path":
                result = search.findShortestPath(args.startId, args.targetId);
                break;

            // Intelligence APIs
            case "get_repository_summary":
                result = repositorySummary(search);
                break;
            case "explain_authentication_flow":
                result = explainAuthenticationFlow(search);
                break;
            case "explain_api_flow":
                result = explainApiFlow(search, args.routeNodeId);
                break;
            case "find_circular_dependencies":
                result = findCircularDependencies(search);
                break;
            case "find_entry_points":
                result = findEntryPoints(search);
                break;
            case "find_database_access":
                result = findDatabaseAccess(search);
                break;
            case "find_connected_modules":
                result = findConnectedModules(search);
                break;

            default:
                throw new Error(`Tool not found: ${name}`);
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error executing tool: ${error.message}`,
                },
            ],
            isError: true,
        };
    }
});

// Start the server transport over standard input/output (stdio)
async function startServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    // Note: Do not console.log message here to avoid corrupting stdio channel content
}

startServer().catch((error) => {
    console.error("Failed to start MCP Server:", error);
    process.exit(1);
});
