// backend/testIngestion.js
//
// End-to-end test: runs the full ingestion pipeline against a real
// public GitHub repository and prints the resulting graph statistics.

const { ingest } = require("./ingestion/ingestPipeline");
const Neo4jSearch = require("./graph/neo4jSearch");
const { closeDriver } = require("./graph/neo4jClient");

// A small, well-known public Express.js repo for testing
// Feel free to change this to any public GitHub repo URL
const TEST_REPO_URL = "https://github.com/expressjs/express";

async function main() {
    try {
        // Run the full ingestion pipeline
        const { repoName, nodeCount, edgeCount } = await ingest(TEST_REPO_URL, { keepAlive: true });

        console.log("\n────────────────────────────────────────");
        console.log("Running verification queries on Neo4j...");
        console.log("────────────────────────────────────────\n");

        const search = new Neo4jSearch(repoName);

        // Check repository summary
        const summary = await search.repositorySummary();
        console.log("Repository Summary:");
        console.log(JSON.stringify(summary, null, 2));

        // Find entry points (nodes with no incoming edges)
        const entryPoints = await search.findEntryPoints();
        console.log(`\nEntry Points (${entryPoints.length}):`);
        entryPoints.slice(0, 5).forEach(n => console.log(`  - ${n.id}`));
        if (entryPoints.length > 5) console.log(`  ... and ${entryPoints.length - 5} more`);

        // Find all API endpoints
        const endpoints = await search.findNodesByType("API Endpoint");
        console.log(`\nAPI Endpoints Detected (${endpoints.length}):`);
        endpoints.slice(0, 10).forEach(n => console.log(`  - ${n.name}`));
        if (endpoints.length > 10) console.log(`  ... and ${endpoints.length - 10} more`);

        // Find all functions
        const functions = await search.findNodesByType("Function");
        console.log(`\nFunctions Detected (${functions.length}):`);
        functions.slice(0, 10).forEach(n => console.log(`  - ${n.name} (${n.properties.file})`));
        if (functions.length > 10) console.log(`  ... and ${functions.length - 10} more`);

    } catch (err) {
        console.error("\n❌ Test failed:", err);
    } finally {
        await closeDriver();
    }
}

main();
