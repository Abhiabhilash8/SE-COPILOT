const path = require("path");

const loadGraph = require("./GraphLoader.js");
const { dfs, bfs, findPath } = require("./traversal.js");

class GraphSearch {
    constructor(graph) {
        this.graph = graph;
    }

    findNodeById(id) {
        return this.graph.getNode(id);
    }

    findNodeByName(name) {
        return this.graph.getAllNodes().find(node => node.name === name);
    }

    findNodesByType(type) {
        return this.graph.getAllNodes().filter(node => node.type === type);
    }

    getOutgoingNeighbours(nodeId) {
        return this.graph.getOutgoingEdges(nodeId).map(edge => this.graph.getNode(edge.to));
    }

    getIncomingNeighbours(nodeId) {
        return this.graph.getIncomingEdges(nodeId).map(edge => this.graph.getNode(edge.from));
    }

    findCallers(nodeId) {
        return this.graph.getIncomingEdges(nodeId)
            .filter(edge => edge.relation === "CALLS")
            .map(edge => this.graph.getNode(edge.from));
    }

    findDependencies(nodeId) {
        return this.graph.getOutgoingEdges(nodeId)
            .map(edge => this.graph.getNode(edge.to));
    }

    findDependents(nodeId) {
        return this.graph.getIncomingEdges(nodeId)
            .map(edge => this.graph.getNode(edge.from));
    }

    findNodesByRelation(relation) {
        const nodes = this.graph.getAllEdges()
            .filter(edge => edge.relation === relation)
            .map(edge => this.graph.getNode(edge.from));
        return [...new Set(nodes)];
    }

    dfs(startId) {
        return dfs(this.graph, startId).map(id => this.graph.getNode(id));
    }

    bfs(startId) {
        return bfs(this.graph, startId).map(id => this.graph.getNode(id));
    }

    findShortestPath(startId, targetId) {
        const pathIds = findPath(this.graph, startId, targetId);
        if (!pathIds) return null;
        return pathIds.map(id => this.graph.getNode(id));
    }
}

module.exports = GraphSearch;

if (require.main === module) {
    // Change ONLY this path to your graph folder
    const graphFolder = path.join(
        __dirname,
        "..",
        "..",
        "repositories",
        "to-do"
    );

    const graph = loadGraph(graphFolder);

    const search = new GraphSearch(graph);

    console.log("\n==============================");
    console.log("GRAPH STATISTICS");
    console.log("==============================");

    console.log("Nodes :", graph.getAllNodes().length);
    console.log("Edges :", graph.getAllEdges().length);

    const firstNode = graph.getAllNodes()[0];

    console.log("\n==============================");
    console.log("FIRST NODE");
    console.log("==============================");

    console.log(firstNode);

    console.log("\n==============================");
    console.log("FIND NODE BY ID");
    console.log("==============================");

    console.log(
        search.findNodeById(firstNode.id)
    );

    console.log("\n==============================");
    console.log("FIND NODE BY NAME");
    console.log("==============================");

    console.log(
        search.findNodeByName(firstNode.name)
    );

    console.log("\n==============================");
    console.log("FIND NODES BY TYPE");
    console.log("==============================");

    console.log(
        search.findNodesByType(firstNode.type)
    );

    console.log("\n==============================");
    console.log("OUTGOING NEIGHBOURS");
    console.log("==============================");

    console.log(
        search.getOutgoingNeighbours(firstNode.id)
    );

    console.log("\n==============================");
    console.log("INCOMING NEIGHBOURS");
    console.log("==============================");

    console.log(
        search.getIncomingNeighbours(firstNode.id)
    );
}