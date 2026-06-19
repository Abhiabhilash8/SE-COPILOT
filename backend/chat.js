// backend/chat.js

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const readline = require("readline");
const path = require("path");
const { spawn } = require("child_process");
const Groq = require("groq-sdk");

// --------------------------------------------------
// Groq Client Setup
// --------------------------------------------------

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// llama-3.1-8b-instant has excellent and fast function calling support on Groq
const MODEL = "llama-3.1-8b-instant";

// --------------------------------------------------
// Tool Definitions (Groq / OpenAI-compatible format)
// These mirror exactly the tools declared in mcpServer.js
// --------------------------------------------------

const TOOLS = [
    // Search Tools
    {
        type: "function",
        function: {
            name: "find_node_by_id",
            description: "Retrieve details of a specific node by its ID.",
            parameters: {
                type: "object",
                properties: {
                    nodeId: { type: "string", description: "The unique ID of the node (e.g. 'project:root', 'model:user')." }
                },
                required: ["nodeId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "find_node_by_name",
            description: "Find a node in the graph by its name attribute.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "The name of the node (e.g. 'User', 'exports.login')." }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "find_nodes_by_type",
            description: "Get all nodes of a specific entity type such as Function, API Endpoint, Model, Folder, Service, Configuration.",
            parameters: {
                type: "object",
                properties: {
                    type: { type: "string", description: "The entity type (e.g. 'Function', 'API Endpoint', 'Model', 'Folder')." }
                },
                required: ["type"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "find_dependencies",
            description: "List the direct outgoing dependencies of a node (what this node uses or calls).",
            parameters: {
                type: "object",
                properties: {
                    nodeId: { type: "string", description: "The unique ID of the node." }
                },
                required: ["nodeId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "find_dependents",
            description: "List all components that directly depend on a given node (who uses this node).",
            parameters: {
                type: "object",
                properties: {
                    nodeId: { type: "string", description: "The unique ID of the node." }
                },
                required: ["nodeId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "find_shortest_path",
            description: "Find the shortest call path between two nodes in the graph.",
            parameters: {
                type: "object",
                properties: {
                    startId: { type: "string", description: "The starting node ID." },
                    targetId: { type: "string", description: "The target node ID." }
                },
                required: ["startId", "targetId"]
            }
        }
    },

    // Intelligence Tools
    {
        type: "function",
        function: {
            name: "get_repository_summary",
            description: "Get a high-level summary of the repository: total nodes, edges, and a breakdown by entity type.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "explain_authentication_flow",
            description: "Explain how authentication and security middleware is structured in the repository.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "explain_api_flow",
            description: "Trace the path from an API route endpoint all the way to the database.",
            parameters: {
                type: "object",
                properties: {
                    routeNodeId: { type: "string", description: "The unique ID of the API endpoint node (e.g. 'endpoint:post_login')." }
                },
                required: ["routeNodeId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "find_circular_dependencies",
            description: "Scan the repository graph for any circular dependency loops.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "find_entry_points",
            description: "List the top-level entry point nodes of the repository (nodes with no incoming edges).",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "find_database_access",
            description: "Find all components in the repository that directly access the database.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "find_connected_modules",
            description: "Group repository entities into modules based on their folder structure.",
            parameters: { type: "object", properties: {} }
        }
    }
];

// --------------------------------------------------
// MCP Client
// Spawns mcpServer.js as a child process and
// communicates with it over stdio using JSON-RPC.
// --------------------------------------------------

class McpClient {
    constructor() {
        this.process = null;
        this.buffer = "";
        this.pendingRequests = new Map();
        this.messageId = 10; // Start high to avoid clashing with init messages
    }

    connect() {
        return new Promise((resolve, reject) => {
            const serverPath = path.join(__dirname, "mcpServer.js");
            this.process = spawn("node", [serverPath], {
                stdio: ["pipe", "pipe", "inherit"]
            });

            this.process.on("error", reject);

            this.process.stdout.on("data", (data) => {
                this.buffer += data.toString();
                let boundary = this.buffer.indexOf("\n");
                while (boundary !== -1) {
                    const messageStr = this.buffer.substring(0, boundary);
                    this.buffer = this.buffer.substring(boundary + 1);
                    try {
                        const message = JSON.parse(messageStr);
                        const pending = this.pendingRequests.get(message.id);
                        if (pending) {
                            this.pendingRequests.delete(message.id);
                            pending.resolve(message);
                        }
                    } catch (_) {
                        // Ignore empty or malformed lines
                    }
                    boundary = this.buffer.indexOf("\n");
                }
            });

            // Send the MCP initialize handshake
            this.sendRequest("initialize", {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: { name: "se-copilot-chat", version: "1.0.0" }
            }).then(resolve).catch(reject);
        });
    }

    sendRequest(method, params) {
        return new Promise((resolve, reject) => {
            const id = this.messageId++;
            this.pendingRequests.set(id, { resolve, reject });
            const message = { jsonrpc: "2.0", id, method, params };
            this.process.stdin.write(JSON.stringify(message) + "\n");
        });
    }

    async callTool(name, args) {
        const response = await this.sendRequest("tools/call", {
            name,
            arguments: args
        });
        return response.result?.content?.[0]?.text ?? "No result returned.";
    }

    disconnect() {
        if (this.process) {
            this.process.kill();
        }
    }
}

// --------------------------------------------------
// Main Chat Loop
// --------------------------------------------------

async function main() {
    console.log("\n🔍  SE Copilot — Repository Intelligence Chat");
    console.log("═══════════════════════════════════════════════");
    console.log("  Repository : to-do (Node.js Express + MongoDB API)");
    console.log("  Model      : llama-3.1-8b-instant (Groq)");
    console.log('  Type "exit" to quit.');
    console.log("═══════════════════════════════════════════════\n");

    // Boot the MCP server process and initialize the connection
    process.stdout.write("Starting MCP server...");
    const mcp = new McpClient();
    await mcp.connect();
    console.log(" ready.\n");

    // System prompt tells the LLM what it is and what it has access to
    const messages = [
        {
            role: "system",
            content: `You are SE Copilot, a helpful software engineering assistant.
You have access to tools that search and analyze a Todo API codebase repository.
Always use the tools to answer questions about the codebase structure, paths, endpoints, and database accesses. Use node names in your final response.`
        }
    ];

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const prompt = () => {
        rl.question("You: ", async (input) => {
            input = input.trim();

            if (input.toLowerCase() === "exit") {
                console.log("\nGoodbye!\n");
                mcp.disconnect();
                rl.close();
                return;
            }

            if (!input) {
                prompt();
                return;
            }

            messages.push({ role: "user", content: input });

            try {
                // Agentic loop: keep going until the LLM produces a final text answer
                while (true) {
                    const response = await groq.chat.completions.create({
                        model: MODEL,
                        messages,
                        tools: TOOLS,
                        tool_choice: "auto",
                        max_tokens: 2048
                    });

                    const assistantMessage = response.choices[0].message;
                    messages.push(assistantMessage);

                    // No tool calls → we have the final natural language answer
                    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
                        console.log(`\nSE Copilot: ${assistantMessage.content}\n`);
                        break;
                    }

                    // Execute each tool call sequentially via the MCP server
                    for (const toolCall of assistantMessage.tool_calls) {
                        const name = toolCall.function.name;
                        const args = JSON.parse(toolCall.function.arguments);

                        console.log(`  ⚙  Calling tool: ${name}(${JSON.stringify(args)})`);

                        const result = await mcp.callTool(name, args);

                        // Feed the tool result back into the conversation
                        messages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: result
                        });
                    }
                }
            } catch (err) {
                console.error(`\nError: ${err.message}\n`);
            }

            prompt();
        });
    };

    prompt();
}

main().catch((err) => {
    console.error("Failed to start SE Copilot:", err.message);
    process.exit(1);
});
