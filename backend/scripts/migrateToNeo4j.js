// backend/scripts/migrateToNeo4j.js

const fs = require("fs");
const path = require("path");
const { runQuery, closeDriver } = require("../graph/neo4jClient");

const REPO_NAME = "to-do";
const nodesPath = path.join(__dirname, "..", "..", "repositories", REPO_NAME, "nodes.json");
const edgesPath = path.join(__dirname, "..", "..", "repositories", REPO_NAME, "edges.json");

async function migrate() {
    try {
        console.log("Reading nodes and edges JSON data...");
        const nodes = JSON.parse(fs.readFileSync(nodesPath, "utf-8"));
        const edges = JSON.parse(fs.readFileSync(edgesPath, "utf-8"));

        console.log("Connecting to Neo4j and setting up indexes...");
        // Setup indexes for optimization (safe on all Neo4j versions)
        await runQuery("CREATE INDEX NodeIdIndex IF NOT EXISTS FOR (n:Node) ON (n.id)");
        await runQuery("CREATE INDEX NodeRepoIndex IF NOT EXISTS FOR (n:Node) ON (n.repo)");

        console.log(`Clearing existing graph data for repo: "${REPO_NAME}"...`);
        await runQuery("MATCH (n:Node {repo: $repo}) DETACH DELETE n", { repo: REPO_NAME });

        console.log(`Importing ${nodes.length} nodes...`);
        for (const node of nodes) {
            await runQuery(
                `CREATE (n:Node {
                    id: $id,
                    type: $type,
                    name: $name,
                    file: $file,
                    description: $description,
                    repo: $repo
                })`,
                {
                    id: node.id,
                    type: node.type,
                    name: node.name,
                    file: node.file || "",
                    description: node.description || "",
                    repo: REPO_NAME
                }
            );
        }

        console.log(`Importing ${edges.length} edges...`);
        for (const edge of edges) {
            const relationType = edge.relation;
            // Sanitize relationType to protect against Cypher injection
            if (!/^[a-zA-Z0-9_]+$/.test(relationType)) {
                throw new Error(`Invalid relationship type: ${relationType}`);
            }

            // Create relationship dynamically matching the relationship type
            await runQuery(
                `MATCH (from:Node {id: $from, repo: $repo}), (to:Node {id: $to, repo: $repo})
                 CREATE (from)-[r:${relationType} {reason: $reason, repo: $repo}]->(to)`,
                {
                    from: edge.from,
                    to: edge.to,
                    reason: edge.reason || "",
                    repo: REPO_NAME
                }
            );
        }

        console.log("Migration completed successfully!");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await closeDriver();
    }
}

migrate();
