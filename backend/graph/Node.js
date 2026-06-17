// backend/graph/Node.js

class Node {
    constructor({ id, type, name, ...properties }) {
        this.id = id;
        this.type = type;
        this.name = name || id;

        // Store any additional attributes from nodes.json
        this.properties = properties;

        // Relationships
        this.outgoingEdges = [];
        this.incomingEdges = [];
    }

    addOutgoingEdge(edge) {
        this.outgoingEdges.push(edge);
    }

    addIncomingEdge(edge) {
        this.incomingEdges.push(edge);
    }

    getOutgoingEdges() {
        return this.outgoingEdges;
    }

    getIncomingEdges() {
        return this.incomingEdges;
    }

    getProperties() {
        return this.properties;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            properties: this.properties
        };
    }
}

module.exports = Node;