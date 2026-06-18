// backend/testMcp.js

const { spawn } = require("child_process");
const path = require("path");

const mcpServerPath = path.join(__dirname, "mcpServer.js");

// Spawn the MCP server as a child process
const serverProcess = spawn("node", [mcpServerPath], {
    stdio: ["pipe", "pipe", "inherit"]
});

let buffer = "";

serverProcess.stdout.on("data", (data) => {
    buffer += data.toString();
    
    // Split incoming messages by newline
    let boundary = buffer.indexOf("\n");
    while (boundary !== -1) {
        const messageStr = buffer.substring(0, boundary);
        buffer = buffer.substring(boundary + 1);
        
        try {
            const message = JSON.parse(messageStr);
            console.log("\n--- [RECEIVED FROM SERVER] ---");
            console.log(JSON.stringify(message, null, 2));
            
            // Check message ID to trigger the next request sequentially
            if (message.id === 1) {
                // Initialized successfully. Send tools/list request.
                sendRequest(2, "tools/list", {});
            } else if (message.id === 2) {
                // Tools listed successfully. Trigger get_repository_summary call.
                sendRequest(3, "tools/call", {
                    name: "get_repository_summary",
                    arguments: {}
                });
            } else if (message.id === 3) {
                // Repository summary completed. Call explain_api_flow.
                sendRequest(4, "tools/call", {
                    name: "explain_api_flow",
                    arguments: {
                        routeNodeId: "endpoint:post_login"
                    }
                });
            } else if (message.id === 4) {
                // Done. Terminate the server.
                console.log("\nAll integration test cases passed successfully!");
                serverProcess.kill();
                process.exit(0);
            }
        } catch (e) {
            console.error("Failed to parse message:", messageStr, e);
        }
        
        boundary = buffer.indexOf("\n");
    }
});

// Helper function to send requests to the server stdin
function sendRequest(id, method, params) {
    const request = {
        jsonrpc: "2.0",
        id,
        method,
        params
    };
    console.log(`\n>>> [SENDING REQUEST: ${method}] >>>`);
    serverProcess.stdin.write(JSON.stringify(request) + "\n");
}

// Start sequence: Send initialize request
sendRequest(1, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: {
        name: "test-client",
        version: "1.0.0"
    }
});
