// backend/graph/Graph.js

class Graph {

    constructor() {

        // id -> Node
        this.nodes = new Map();

        // List of all edges
        this.edges = [];

        // Outgoing edges
        this.adjacencyList = new Map();

        // Incoming edges
        this.reverseAdjacencyList = new Map();

    }

    // ----------------------------
    // Add Node
    // ----------------------------
    addNode(node) {

        this.nodes.set(node.id, node);

        if (!this.adjacencyList.has(node.id))
            this.adjacencyList.set(node.id, []);

        if (!this.reverseAdjacencyList.has(node.id))
            this.reverseAdjacencyList.set(node.id, []);
    }

    // ----------------------------
    // Add Edge
    // ----------------------------
    addEdge(edge) {

        this.edges.push(edge);

        if (this.adjacencyList.has(edge.from))
            this.adjacencyList.get(edge.from).push(edge);

        if (this.reverseAdjacencyList.has(edge.to))
            this.reverseAdjacencyList.get(edge.to).push(edge);

        const fromNode = this.nodes.get(edge.from);
        const toNode = this.nodes.get(edge.to);

        if (fromNode)
            fromNode.addOutgoingEdge(edge);

        if (toNode)
            toNode.addIncomingEdge(edge);
    }

    // ----------------------------
    // Get Node
    // ----------------------------
    getNode(id) {
        return this.nodes.get(id);
    }

    // ----------------------------
    // Get All Nodes
    // ----------------------------
    getAllNodes() {
        return [...this.nodes.values()];
    }

    // ----------------------------
    // Get All Edges
    // ----------------------------
    getAllEdges() {
        return this.edges;
    }

    // ----------------------------
    // Outgoing Edges
    // ----------------------------
    getOutgoingEdges(id) {
        return this.adjacencyList.get(id) || [];
    }

    // ----------------------------
    // Incoming Edges
    // ----------------------------
    getIncomingEdges(id) {
        return this.reverseAdjacencyList.get(id) || [];
    }

}

module.exports = Graph;