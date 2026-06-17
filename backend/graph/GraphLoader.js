// backend/graph/GraphLoader.js

const fs = require("fs");
const path = require("path");

const Graph = require("./Graph");
const Node = require("./Node");
const Edge = require("./Edge");

function loadGraph(graphFolderPath) {

    const graph = new Graph();

    // -----------------------------
    // Read nodes.json
    // -----------------------------

    const nodesPath = path.join(graphFolderPath, "nodes.json");

    const nodes = JSON.parse(
        fs.readFileSync(nodesPath, "utf-8")
    );

    for (const nodeData of nodes) {
        const node = new Node(nodeData);
        graph.addNode(node);
    }

    // -----------------------------
    // Read edges.json
    // -----------------------------

    const edgesPath = path.join(graphFolderPath, "edges.json");

    const edges = JSON.parse(
        fs.readFileSync(edgesPath, "utf-8")
    );

    for (const edgeData of edges) {
        const edge = new Edge(edgeData);
        graph.addEdge(edge);
    }

    return graph;
}

module.exports = loadGraph;