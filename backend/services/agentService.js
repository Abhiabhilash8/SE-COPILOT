// backend/services/agentService.js

const path = require("path");
// Load environment variables from the root .env
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const Groq = require("groq-sdk");
const Neo4jSearch = require("../graph/neo4jSearch");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

// Tool schemas mirrored from backend/chat.js for discovery by Groq
const TOOLS = [
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
    {
        type: "function",
        function: {
            name: "get_repository_summary",
            description: "Get a high-level summary of the repository: total nodes, edges, and a breakdown by entity type.",
            parameters: {
                type: "object",
                properties: {
                    dummy: { type: "string", description: "Placeholder argument. Must pass a non-empty string, e.g., 'none'." }
                },
                required: ["dummy"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "explain_authentication_flow",
            description: "Explain how authentication and security middleware is structured in the repository.",
            parameters: {
                type: "object",
                properties: {
                    dummy: { type: "string", description: "Placeholder argument. Must pass a non-empty string, e.g., 'none'." }
                },
                required: ["dummy"]
            }
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
            parameters: {
                type: "object",
                properties: {
                    dummy: { type: "string", description: "Placeholder argument. Must pass a non-empty string, e.g., 'none'." }
                },
                required: ["dummy"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "find_entry_points",
            description: "List the top-level entry point nodes of the repository (nodes with no incoming edges).",
            parameters: {
                type: "object",
                properties: {
                    dummy: { type: "string", description: "Placeholder argument. Must pass a non-empty string, e.g., 'none'." }
                },
                required: ["dummy"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "find_database_access",
            description: "Find all components in the repository that directly access the database.",
            parameters: {
                type: "object",
                properties: {
                    dummy: { type: "string", description: "Placeholder argument. Must pass a non-empty string, e.g., 'none'." }
                },
                required: ["dummy"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "find_connected_modules",
            description: "Group repository entities into modules based on their folder structure.",
            parameters: {
                type: "object",
                properties: {
                    dummy: { type: "string", description: "Placeholder argument. Must pass a non-empty string, e.g., 'none'." }
                },
                required: ["dummy"]
            }
        }
    }
];

/**
 * Runs the Groq Agentic Chat loop scoped to a specific repository.
 * @param {string} repoName - Name of the repository to query
 * @param {Array<object>} inputMessages - History of messages
 * @returns {Promise<{ response: string, messages: Array<object> }>}
 */
async function runAgentChat(repoName, inputMessages) {
    const search = new Neo4jSearch(repoName);
    
    // Build the messages list, ensuring system prompt is at index 0
    const messages = [...inputMessages];
    const systemPromptExists = messages.some(m => m.role === "system");
    if (!systemPromptExists) {
        messages.unshift({
            role: "system",
            content: `You are SE Copilot, a helpful software engineering assistant.
You have access to tools that search and analyze a Neo4j codebase repository.
You are currently scoped to the repository '${repoName}'. Always use the tools to answer questions about the codebase structure, paths, endpoints, and database accesses. Use node names in your final response.
Note: The repository name '${repoName}' is NOT a node in the graph, so do not search for '${repoName}' using find_node_by_name. If you need to summarize or understand the project, call get_repository_summary or find_connected_modules instead.

CRITICAL: When invoking tools, always generate clean, valid JSON for tool parameters that match the schemas exactly. Do not truncate the JSON, do not include trailing quotes outside the JSON block, and never pass 'null' for required string parameters (use a valid string placeholder instead).`
        });
    }

    let loopCount = 0;
    const MAX_LOOPS = 10; // safeguard against runaway LLM agent loops

    while (loopCount < MAX_LOOPS) {
        loopCount++;
        const response = await groq.chat.completions.create({
            model: MODEL,
            messages,
            tools: TOOLS,
            tool_choice: "auto",
            max_tokens: 2048
        });

        const assistantMessage = response.choices[0].message;
        messages.push(assistantMessage);

        // If there are no tool calls, the model gave its final text response
        if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
            return {
                response: assistantMessage.content,
                messages
            };
        }

        // Handle tool calls sequentially
        for (const toolCall of assistantMessage.tool_calls) {
            const name = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            console.log(`[agentService] Executing tool '${name}' with args:`, args, `for repo '${repoName}'`);

            let result;
            try {
                switch (name) {
                    case "find_node_by_id":
                        result = await search.findNodeById(args.nodeId);
                        break;
                    case "find_node_by_name":
                        result = await search.findNodeByName(args.name);
                        break;
                    case "find_nodes_by_type":
                        result = await search.findNodesByType(args.type);
                        break;
                    case "find_dependencies":
                        result = await search.findDependencies(args.nodeId);
                        break;
                    case "find_dependents":
                        result = await search.findDependents(args.nodeId);
                        break;
                    case "find_shortest_path":
                        result = await search.findShortestPath(args.startId, args.targetId);
                        break;
                    case "get_repository_summary":
                        result = await search.repositorySummary();
                        break;
                    case "explain_authentication_flow":
                        result = await search.explainAuthenticationFlow();
                        break;
                    case "explain_api_flow":
                        result = await search.explainApiFlow(args.routeNodeId);
                        break;
                    case "find_circular_dependencies":
                        result = await search.findCircularDependencies();
                        break;
                    case "find_entry_points":
                        result = await search.findEntryPoints();
                        break;
                    case "find_database_access":
                        result = await search.findDatabaseAccess();
                        break;
                    case "find_connected_modules":
                        result = await search.findConnectedModules();
                        break;
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (err) {
                console.error(`[agentService] Error executing tool '${name}':`, err);
                result = { error: err.message };
            }

            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result, null, 2)
            });
        }
    }

    return {
        response: messages[messages.length - 1].content || "Agent reached maximum tool-call loops without a final response.",
        messages
    };
}

module.exports = {
    runAgentChat
};
