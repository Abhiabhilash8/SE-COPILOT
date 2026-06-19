// backend/ingestion/neo4jWriter.js
//
// Writes a node/edge graph into Neo4j, tagged by repository name.
// Clears any previous data for the same repo before writing.

const { runQuery, closeDriver } = require("../graph/neo4jClient");

/**
 * Write nodes and edges into Neo4j for a given repository.
 * @param {Array<object>} nodes
 * @param {Array<object>} edges
 * @param {string} repoName
 */
async function writeGraphToNeo4j(nodes, edges, repoName) {

    // ── Setup indexes (idempotent - safe to run every time)
    console.log("  [neo4jWriter] Ensuring indexes exist...");
    await runQuery("CREATE INDEX NodeIdIndex IF NOT EXISTS FOR (n:Node) ON (n.id)");
    await runQuery("CREATE INDEX NodeRepoIndex IF NOT EXISTS FOR (n:Node) ON (n.repo)");

    // ── Clear any existing data for this repo
    console.log(`  [neo4jWriter] Clearing old graph for repo: "${repoName}"...`);
    await runQuery(
        "MATCH (n:Node {repo: $repo}) DETACH DELETE n",
        { repo: repoName }
    );

    // ── Write nodes in batches using UNWIND for performance
    console.log(`  [neo4jWriter] Writing ${nodes.length} nodes...`);
    const NODE_BATCH = 100;
    for (let i = 0; i < nodes.length; i += NODE_BATCH) {
        const batch = nodes.slice(i, i + NODE_BATCH).map(n => ({
            id: n.id,
            type: n.type,
            name: n.name,
            file: n.file || "",
            description: n.description || "",
            repo: repoName
        }));

        await runQuery(
            `UNWIND $batch AS row
             CREATE (n:Node {
                 id: row.id,
                 type: row.type,
                 name: row.name,
                 file: row.file,
                 description: row.description,
                 repo: row.repo
             })`,
            { batch }
        );
    }

    // ── Write edges in batches
    console.log(`  [neo4jWriter] Writing ${edges.length} edges...`);

    // Group edges by relation type so we can use dynamic labels safely
    const byRelation = new Map();
    for (const edge of edges) {
        if (!/^[a-zA-Z0-9_]+$/.test(edge.relation)) continue; // skip invalid
        if (!byRelation.has(edge.relation)) byRelation.set(edge.relation, []);
        byRelation.get(edge.relation).push(edge);
    }

    for (const [relation, relEdges] of byRelation) {
        const EDGE_BATCH = 100;
        for (let i = 0; i < relEdges.length; i += EDGE_BATCH) {
            const batch = relEdges.slice(i, i + EDGE_BATCH).map(e => ({
                from: e.from,
                to: e.to,
                reason: e.reason || "",
                repo: repoName
            }));

            await runQuery(
                `UNWIND $batch AS row
                 MATCH (from:Node {id: row.from, repo: row.repo}),
                       (to:Node   {id: row.to,   repo: row.repo})
                 CREATE (from)-[:${relation} {reason: row.reason, repo: row.repo}]->(to)`,
                { batch }
            );
        }
    }

    console.log(`  [neo4jWriter] ✓ Done writing graph for "${repoName}"`);
}

module.exports = { writeGraphToNeo4j };
