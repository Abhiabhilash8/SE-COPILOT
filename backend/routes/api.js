// backend/routes/api.js

const express = require("express");
const router = express.Router();

const { ingest } = require("../ingestion/ingestPipeline");
const { runQuery } = require("../graph/neo4jClient");
const { runAgentChat } = require("../services/agentService");

/**
 * POST /api/ingest
 * Clones a repository and builds/persists its knowledge graph in Neo4j.
 * Body: { repoUrl: string }
 */
router.post("/ingest", async (req, res) => {
    const { repoUrl } = req.body;

    if (!repoUrl) {
        return res.status(400).json({
            success: false,
            error: "Missing required parameter 'repoUrl' in request body."
        });
    }

    try {
        // Run ingestion but pass keepAlive: true so we don't close the shared Neo4j driver
        const result = await ingest(repoUrl, { keepAlive: true });
        
        return res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error("[api] Ingestion error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "An error occurred during repository ingestion."
        });
    }
});

/**
 * GET /api/repos
 * Returns list of distinct repository names stored in Neo4j.
 */
router.get("/repos", async (req, res) => {
    try {
        const records = await runQuery("MATCH (n:Node) RETURN DISTINCT n.repo AS repo");
        const repos = records.map(r => r.get("repo")).filter(Boolean);
        
        return res.json({
            success: true,
            repos
        });
    } catch (error) {
        console.error("[api] Get repos error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "An error occurred while fetching repositories."
        });
    }
});

/**
 * POST /api/chat
 * Scopes the conversation context to a specific repository and runs the Groq agentic loop.
 * Body: { repoName: string, messages: Array<object> }
 */
router.post("/chat", async (req, res) => {
    const { repoName, messages } = req.body;

    if (!repoName || !messages || !Array.isArray(messages)) {
        return res.status(400).json({
            success: false,
            error: "Missing or invalid parameters in request body. 'repoName' (string) and 'messages' (array) are required."
        });
    }

    try {
        const result = await runAgentChat(repoName, messages);
        
        return res.json({
            success: true,
            response: result.response,
            messages: result.messages
        });
    } catch (error) {
        console.error("[api] Chat error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "An error occurred while processing the chat request."
        });
    }
});

module.exports = router;
