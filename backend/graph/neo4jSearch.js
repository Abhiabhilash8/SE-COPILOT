// backend/graph/neo4jSearch.js

const { runQuery } = require("./neo4jClient");

/**
 * Maps a Neo4j database node record to standard JS node shape.
 */
function mapNode(neoNode) {
    if (!neoNode) return null;
    return {
        id: neoNode.properties.id,
        type: neoNode.properties.type,
        name: neoNode.properties.name,
        properties: {
            file: neoNode.properties.file,
            description: neoNode.properties.description
        }
    };
}

class Neo4jSearch {
    constructor(repo = "to-do") {
        this.repo = repo;
    }

    async findNodeById(id) {
        const records = await runQuery(
            "MATCH (n:Node {id: $id, repo: $repo}) RETURN n",
            { id, repo: this.repo }
        );
        if (records.length === 0) return null;
        return mapNode(records[0].get("n"));
    }

    async findNodeByName(name) {
        const records = await runQuery(
            "MATCH (n:Node {name: $name, repo: $repo}) RETURN n",
            { name, repo: this.repo }
        );
        if (records.length === 0) return null;
        return mapNode(records[0].get("n"));
    }

    async findNodesByType(type) {
        const records = await runQuery(
            "MATCH (n:Node {type: $type, repo: $repo}) RETURN n",
            { type, repo: this.repo }
        );
        return records.map(r => mapNode(r.get("n")));
    }

    async getOutgoingNeighbours(nodeId) {
        const records = await runQuery(
            "MATCH (n:Node {id: $nodeId, repo: $repo})--> (m:Node {repo: $repo}) RETURN m",
            { nodeId, repo: this.repo }
        );
        return records.map(r => mapNode(r.get("m")));
    }

    async getIncomingNeighbours(nodeId) {
        const records = await runQuery(
            "MATCH (m:Node {repo: $repo})--> (n:Node {id: $nodeId, repo: $repo}) RETURN m",
            { nodeId, repo: this.repo }
        );
        return records.map(r => mapNode(r.get("m")));
    }

    async findCallers(nodeId) {
        const records = await runQuery(
            "MATCH (m:Node {repo: $repo})-[:CALLS]->(n:Node {id: $nodeId, repo: $repo}) RETURN m",
            { nodeId, repo: this.repo }
        );
        return records.map(r => mapNode(r.get("m")));
    }

    async findDependencies(nodeId) {
        const records = await runQuery(
            "MATCH (n:Node {id: $nodeId, repo: $repo})--> (m:Node {repo: $repo}) RETURN m",
            { nodeId, repo: this.repo }
        );
        return records.map(r => mapNode(r.get("m")));
    }

    async findDependents(nodeId) {
        const records = await runQuery(
            "MATCH (m:Node {repo: $repo})--> (n:Node {id: $nodeId, repo: $repo}) RETURN m",
            { nodeId, repo: this.repo }
        );
        return records.map(r => mapNode(r.get("m")));
    }

    async findNodesByRelation(relation) {
        if (!/^[a-zA-Z0-9_]+$/.test(relation)) {
            throw new Error(`Invalid relationship type: ${relation}`);
        }
        const records = await runQuery(
            `MATCH (from:Node {repo: $repo})-[r:${relation}]->(:Node {repo: $repo}) RETURN DISTINCT from`,
            { repo: this.repo }
        );
        return records.map(r => mapNode(r.get("from")));
    }

    async dfs(startId) {
        const visited = new Set();
        const traversalOrder = [];
        const self = this;

        async function traverse(currentId) {
            if (visited.has(currentId)) return;
            visited.add(currentId);
            const node = await self.findNodeById(currentId);
            if (node) {
                traversalOrder.push(node);
                const neighbors = await self.getOutgoingNeighbours(currentId);
                for (const neighbor of neighbors) {
                    await traverse(neighbor.id);
                }
            }
        }

        await traverse(startId);
        return traversalOrder;
    }

    async bfs(startId) {
        const visited = new Set();
        const traversalOrder = [];
        const queue = [];

        const startNode = await this.findNodeById(startId);
        if (!startNode) return [];

        queue.push(startNode);
        visited.add(startId);

        while (queue.length > 0) {
            const current = queue.shift();
            traversalOrder.push(current);

            const neighbors = await this.getOutgoingNeighbours(current.id);
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor.id)) {
                    visited.add(neighbor.id);
                    queue.push(neighbor);
                }
            }
        }

        return traversalOrder;
    }

    async findShortestPath(startId, targetId) {
        const records = await runQuery(
            `MATCH p = shortestPath((start:Node {id: $startId, repo: $repo})-[*..50]->(target:Node {id: $targetId, repo: $repo}))
             RETURN nodes(p) AS pathNodes`,
            { startId, targetId, repo: this.repo }
        );
        if (records.length === 0) return null;
        const pathNodes = records[0].get("pathNodes");
        return pathNodes.map(n => mapNode(n));
    }

    // ----------------------------------------------------
    // Intelligence APIs (Direct Neo4j optimizations)
    // ----------------------------------------------------

    async repositorySummary() {
        const countRecords = await runQuery(
            "MATCH (n:Node {repo: $repo}) RETURN count(n) AS totalNodes",
            { repo: this.repo }
        );
        const edgeRecords = await runQuery(
            "MATCH (:Node {repo: $repo})-[r]->(:Node {repo: $repo}) RETURN count(r) AS totalEdges",
            { repo: this.repo }
        );
        const breakdownRecords = await runQuery(
            "MATCH (n:Node {repo: $repo}) RETURN n.type AS type, count(n) AS typeCount",
            { repo: this.repo }
        );

        const totalNodes = parseInt(countRecords[0].get("totalNodes").toString(), 10);
        const totalEdges = parseInt(edgeRecords[0].get("totalEdges").toString(), 10);
        const typeBreakdown = {};
        for (const r of breakdownRecords) {
            typeBreakdown[r.get("type")] = parseInt(r.get("typeCount").toString(), 10);
        }

        return {
            totalNodes,
            totalEdges,
            typeBreakdown
        };
    }

    async explainAuthenticationFlow() {
        const records = await runQuery(
            `MATCH (n:Node {repo: $repo})
             WHERE toLower(n.id) CONTAINS "auth" 
                OR toLower(n.id) CONTAINS "passport"
                OR toLower(n.name) CONTAINS "auth"
             RETURN n`,
            { repo: this.repo }
        );

        const authNodes = records.map(r => mapNode(r.get("n")));
        const flowDetails = [];

        for (const node of authNodes) {
            const incoming = await this.getIncomingNeighbours(node.id);
            const outgoing = await this.getOutgoingNeighbours(node.id);
            flowDetails.push({
                id: node.id,
                type: node.type,
                name: node.name,
                description: node.properties.description || "",
                incoming: incoming.map(n => `${n.id} (${n.type})`),
                outgoing: outgoing.map(n => `${n.id} (${n.type})`)
            });
        }
        return flowDetails;
    }

    async explainApiFlow(routeNodeId) {
        const routeNode = await this.findNodeById(routeNodeId);
        if (!routeNode) return null;

        const dbRecords = await runQuery(
            `MATCH (db:Node {repo: $repo})
             WHERE db.type = "Database" OR toLower(db.id) CONTAINS "db"
             RETURN db LIMIT 1`,
            { repo: this.repo }
        );

        if (dbRecords.length > 0) {
            const dbNode = mapNode(dbRecords[0].get("db"));
            const pathNodes = await this.findShortestPath(routeNodeId, dbNode.id);
            if (pathNodes) {
                return {
                    start: routeNodeId,
                    end: dbNode.id,
                    flowType: "Route to Database Path",
                    path: pathNodes.map(n => ({ id: n.id, type: n.type, name: n.name }))
                };
            }
        }

        const reachable = await this.bfs(routeNodeId);
        return {
            start: routeNodeId,
            flowType: "Reachable Chain (No direct DB connection found)",
            path: reachable.map(n => ({ id: n.id, type: n.type, name: n.name }))
        };
    }

    async findCircularDependencies() {
        const records = await runQuery(
            `MATCH p = (n:Node {repo: $repo})-[*1..10]->(n)
             RETURN nodes(p) AS cycle`,
            { repo: this.repo }
        );
        const cycles = [];
        const seenCycles = new Set();

        for (const r of records) {
            const pathNodes = r.get("cycle").map(n => mapNode(n));
            const ids = pathNodes.map(n => n.id);
            const sortedIds = [...ids].sort().join(",");
            if (!seenCycles.has(sortedIds)) {
                seenCycles.add(sortedIds);
                cycles.push(ids);
            }
        }
        return cycles;
    }

    async findEntryPoints() {
        const records = await runQuery(
            `MATCH (n:Node {repo: $repo})
             WHERE NOT ()--> (n)
             RETURN n`,
            { repo: this.repo }
        );
        return records.map(r => mapNode(r.get("n")));
    }

    async findDatabaseAccess() {
        const records = await runQuery(
            `MATCH (n:Node {repo: $repo})-->(db:Node {repo: $repo})
             WHERE db.type = "Database" OR toLower(db.id) CONTAINS "db"
             RETURN DISTINCT n`,
            { repo: this.repo }
        );
        return records.map(r => mapNode(r.get("n")));
    }

    async findConnectedModules() {
        const appFolder = await this.findNodeById("folder:app");
        if (!appFolder) return [];

        const modules = await this.getOutgoingNeighbours(appFolder.id);
        const folderModules = modules.filter(n => n.type === "Folder");

        const connectedModules = [];
        for (const mod of folderModules) {
            const reachable = await this.bfs(mod.id);
            connectedModules.push({
                moduleName: mod.name,
                moduleId: mod.id,
                components: reachable.map(n => `${n.id} (${n.type})`)
            });
        }
        return connectedModules;
    }
}

module.exports = Neo4jSearch;
