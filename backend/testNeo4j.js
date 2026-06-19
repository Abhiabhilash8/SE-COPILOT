// backend/testNeo4j.js

const Neo4jSearch = require("./graph/neo4jSearch");
const { closeDriver } = require("./graph/neo4jClient");

async function main() {
    try {
        console.log("Initializing Neo4j Search...");
        const search = new Neo4jSearch("to-do");

        console.log("\n========== FIND NODE BY ID ==========\n");
        const firstNode = await search.findNodeById("project:root");
        console.log(firstNode);

        console.log("\n========== FIND NODE BY NAME ==========\n");
        console.log(await search.findNodeByName("exports.login"));

        console.log("\n========== FIND NODES BY TYPE ==========\n");
        console.log((await search.findNodesByType("Model")).map(n => n.id));

        console.log("\n========== OUTGOING NEIGHBOURS ==========\n");
        console.log((await search.getOutgoingNeighbours("project:root")).map(n => n.id));

        console.log("\n========== INCOMING NEIGHBOURS ==========\n");
        console.log((await search.getIncomingNeighbours("model:user")).map(n => n.id));

        console.log("\n========== FIND CALLERS ==========\n");
        console.log((await search.findCallers("model:user")).map(n => n.id));

        console.log("\n========== FIND DEPENDENCIES ==========\n");
        console.log((await search.findDependencies("project:root")).map(n => n.id));

        console.log("\n========== FIND DEPENDENTS ==========\n");
        console.log((await search.findDependents("project:root")).map(n => n.id));

        console.log("\n========== RELATION SEARCH ==========\n");
        console.log((await search.findNodesByRelation("HAS_MODULE")).map(n => n.id));

        console.log("\n========== DFS TRAVERSAL ==========\n");
        console.log((await search.dfs("project:root")).map(n => n.id));

        console.log("\n========== BFS TRAVERSAL ==========\n");
        console.log((await search.bfs("project:root")).map(n => n.id));

        console.log("\n========== SHORTEST PATH ==========\n");
        const path = await search.findShortestPath("project:root", "db:mongodb");
        console.log(path ? path.map(n => n.id).join(" -> ") : "No path");

        console.log("\n========== REPOSITORY SUMMARY ==========\n");
        console.log(await search.repositorySummary());

        console.log("\n========== AUTHENTICATION FLOW ==========\n");
        console.log(JSON.stringify(await search.explainAuthenticationFlow(), null, 2));

        console.log("\n========== API FLOW FOR 'endpoint:post_login' ==========\n");
        console.log(JSON.stringify(await search.explainApiFlow("endpoint:post_login"), null, 2));

        console.log("\n========== CIRCULAR DEPENDENCIES ==========\n");
        console.log(await search.findCircularDependencies());

        console.log("\n========== ENTRY POINTS ==========\n");
        console.log((await search.findEntryPoints()).map(n => n.id));

        console.log("\n========== DATABASE ACCESS NODES ==========\n");
        console.log((await search.findDatabaseAccess()).map(n => n.id));

        console.log("\n========== CONNECTED MODULES ==========\n");
        console.log(JSON.stringify(await search.findConnectedModules(), null, 2));

    } catch (err) {
        console.error("Test execution failed:", err);
    } finally {
        await closeDriver();
        console.log("\nNeo4j connection closed.");
    }
}

main();
