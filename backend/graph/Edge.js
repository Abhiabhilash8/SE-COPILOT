class Edge {
    constructor({ from, to, relation, reason = "", ...properties }) {
        this.from = from;
        this.to = to;
        this.relation = relation;
        this.reason = reason;

        // Store any additional metadata
        this.properties = properties;
    }

    toJSON() {
        return {
            from: this.from,
            to: this.to,
            relation: this.relation,
            reason: this.reason,
            properties: this.properties
        };
    }
}

module.exports = Edge;