# High-Level Architecture Overview

This document describes the high-level software architecture of the Node-Express-Mongoose Todo API.

## Core Architecture Pattern

The application is built using a **Layered Architecture (Router-Controller-Model)** pattern:

```
                  ┌────────────────────────┐
                  │      HTTP Client       │
                  └───────────┬────────────┘
                              │ HTTP Requests
                              ▼
                  ┌────────────────────────┐
                  │      index.js          │ (Application Entrypoint)
                  └───────────┬────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │   config/express.js    │ (Express App & Global Middleware)
                  └───────────┬────────────┘
                              │
                              ▼
                  ┌────────────────────────┐
                  │   app/routes/index.js  │ (API Router & Auth Guard Middleware)
                  └───────────┬────────────┘
                              │ Route Dispatching
                              ▼
                  ┌────────────────────────┐
                  │      Controllers       │ (Auth, User, Todo Controllers)
                  └───────────┬────────────┘
                              │ Model Operations
                              ▼
                  ┌────────────────────────┐
                  │    Mongoose Models     │ (User, Todo Schemas & Hooks)
                  └───────────┬────────────┘
                              │ DB Driver
                              ▼
                  ┌────────────────────────┐
                  │     MongoDB Database   │
                  └────────────────────────┘
```

## Layers Description

1. **Routing Layer (`app/routes/index.js`)**: Matches incoming HTTP request paths and verbs to corresponding controller functions. This layer also applies Passport JWT middleware (`passport.authenticate('jwt', { session: false })`) to protect secure routes.
2. **Controller Layer (`app/authentication/auth-controller.js`, `app/users/user-controller.js`, `app/todos/todo-controller.js`)**: Implements request handling logic, processes input data, communicates with the data models, handles business validation, and formats HTTP responses.
3. **Model Layer (`app/users/user-model.js`, `app/todos/todo-model.js`)**: Defines the schema structures, field validation rules, pre-save hooks (e.g., password hashing with bcrypt), and instance/static methods (e.g., JWT generation) for interacting with MongoDB.
4. **Configuration Layer (`config/`)**: Manages external configurations, logging, express initializations, and passport strategies.

---

## Technology Stack

* **Runtime Environment**: Node.js (v6+ compatible, written in ES6)
* **Framework**: Express (Web server, routing, error handling)
* **Database / ODM**: MongoDB with Mongoose (Object Document Mapper)
* **Authentication**: Passport.js with JWT Strategy (`passport-jwt`), `jsonwebtoken` for manual signing/verification, and `bcrypt` for password hashing.
* **Logging**: Winston (Structured colorized console logger)
* **Environment Configuration**: Dotenv (`.env` file parser)

---

## Step 11 — Entry Points & Startup Sequence

### 1. Application Entry Point
The application starts up via [index.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/index.js) at the repository root.

### 2. Startup Sequence
When `node index.js` is executed, the following sequence occurs:

1. **Configuration Loading**: [index.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/index.js) imports `config/config.js` which executes `dotenv.config()` to load environmental keys into process memory.
2. **Logger Initialization**: Winston Logger is imported and initialized using the module context to dynamically output correct labels.
3. **Express Initialization**: [index.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/index.js) imports `config/express.js`. This creates the Express app instance and configures:
   * **Body Parser**: Handles incoming JSON and urlencoded payloads.
   * **Request Logging**: Development-mode middleware logs incoming HTTP methods and URIs.
   * **Passport JWT Setup**: Imports and registers the Passport JWT validation Strategy.
   * **Routing Setup**: Attaches the centralized router (`app/routes/index.js`).
   * **Error Handlers**: Registers Mongoose Validation handlers, 404 interceptors, and catch-all error formatters.
4. **Database Connection**: [index.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/index.js) checks environment values (testing vs dev/production) to select DB URIs and invokes `mongoose.connect()`.
5. **Port Listening**: Invokes `app.listen()` on the configured port (e.g., 3000) and prints standard logging output when ready.

---

## Step 12 — Architecture Summary & Design Assessment

### Architecture Pattern
Layered MVC (Model-View-Controller) structure where the Mongoose Schema acts as the Model layer, Express routes handle view mapping (via JSON outputs), and Controllers hold execution workflows.

### Architectural Strengths
* **Separation of Concerns**: Good separation of routes, controllers, configuration settings, and database schemas.
* **Stateless Security**: Employs stateless JWT verification via passport middleware, eliminating standard server session memory overheads.
* **Centralized Middleware**: Consistently handles validation, error capturing, and logging in single middleware hooks in `config/express.js`.
* **Testing isolation**: Allows simple test assertions by exporting the pre-configured `app` inside [express.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/express.js) separately from the database connection logic inside `index.js`.

### Architectural Weaknesses
* **Direct DB Queries**: Controllers invoke Mongoose CRUD methods directly, rather than abstracting queries through a dedicated service or repository layer. This tightly couples the business layer to Mongoose APIs.
* **Bloated Controller Workflows**: Error recovery, model instantiation, token building, and response compilation all reside within the controller functions, violating the Single Responsibility Principle.

### Coupling and Cohesion
* **Cohesion**: High cohesion within modules (e.g. `app/todos` hosts only todo schema and todo controller).
* **Coupling**: High coupling between the Controller and the Mongoose Model. Swapping the database engine (e.g. to a SQL DB) would require completely rewriting all controller files.

### Scalability Observations
* **Horizontal Scaling**: Excellent horizontal scalability since server instances are completely stateless (no local sessions).
* **Database Bottleneck**: MongoDB connection pooling is simple. Under high concurrency, the lack of cache layers (like Redis) and direct queries may cause DB connection strain.
