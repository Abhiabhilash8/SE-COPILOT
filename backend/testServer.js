// backend/testServer.js

const { spawn } = require("child_process");
const path = require("path");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log("=== STARTING INTEGRATION TEST FOR SE COPILOT SERVER ===\n");

    const serverPath = path.join(__dirname, "server.js");
    
    // Spawn server process on port 3005 to prevent any collisions with 3000
    const serverProcess = spawn("node", [serverPath], {
        env: { ...process.env, PORT: "3005" },
        stdio: "pipe"
    });

    serverProcess.stdout.on("data", (data) => {
        const str = data.toString().trim();
        if (str) {
            console.log(`[Server Stdout] ${str}`);
        }
    });

    serverProcess.stderr.on("data", (data) => {
        const str = data.toString().trim();
        if (str) {
            console.error(`[Server Stderr] ${str}`);
        }
    });

    // Wait for the server to spin up
    console.log("Waiting 3 seconds for server to start...");
    await sleep(3000);

    const baseUrl = "http://localhost:3005";

    try {
        // Test 1: GET /health
        console.log("\n--- Test 1: GET /health ---");
        const resHealth = await fetch(`${baseUrl}/health`);
        const jsonHealth = await resHealth.json();
        console.log(`Status: ${resHealth.status}`);
        console.log("Body:", JSON.stringify(jsonHealth, null, 2));

        // Test 2: GET /api/repos
        console.log("\n--- Test 2: GET /api/repos ---");
        const resRepos = await fetch(`${baseUrl}/api/repos`);
        const jsonRepos = await resRepos.json();
        console.log(`Status: ${resRepos.status}`);
        console.log("Body:", JSON.stringify(jsonRepos, null, 2));

        // Test 3: POST /api/chat (using 'to-do' repository)
        console.log("\n--- Test 3: POST /api/chat ---");
        const chatPayload = {
            repoName: "to-do",
            messages: [
                {
                    role: "user",
                    content: "What nodes in the codebase access the database? Please name them."
                }
            ]
        };
        const resChat = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(chatPayload)
        });
        const jsonChat = await resChat.json();
        console.log(`Status: ${resChat.status}`);
        console.log("Response:", jsonChat.response);
        console.log("Number of messages in history:", jsonChat.messages?.length);

    } catch (error) {
        console.error("\n❌ Test execution encountered an error:", error.message);
    } finally {
        console.log("\nSending SIGINT to shut down server...");
        serverProcess.kill("SIGINT");

        // Wait for the server process to exit
        await new Promise((resolve) => {
            serverProcess.on("exit", () => {
                console.log("Server process exited cleanly.");
                resolve();
            });
        });

        console.log("\n=== INTEGRATION TEST COMPLETE ===");
    }
}

runTests().catch(err => {
    console.error("Test runner crashed:", err);
});
