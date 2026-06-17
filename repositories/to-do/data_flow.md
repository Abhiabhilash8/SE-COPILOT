# Data Flow Analysis

This document traces the lifecycle of data as it enters, moves through, and exits the application.

---

## Data Pipeline Architecture

```
[Incoming HTTP Client Request]
             │
             ▼ (Body parsing middleware)
[req.body / req.params / req.headers]
             │
             ▼ (Controller extraction)
[Extracted JSON data variables]
             │
             ▼ (Model layer validation)
[Mongoose Schema validations & pre-save hooks]
             │
             ▼ (Database Driver persistence)
[MongoDB BSON Document]
             │
             ▼ (Response compilation)
[res.json() formatter]
             │
             ▼
[Outgoing HTTP Response JSON]
```

---

## Step-by-Step Data Lifecycle

### 1. Ingestion and Parsing (Middleware)
* Incoming JSON payloads are parsed by `body-parser` in [express.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/express.js#L12-L13).
* The raw request string is transformed into a structured JavaScript object accessible via `req.body`.
* Route parameters are parsed and stored in `req.params` (e.g., `req.params.id`).
* Authentication headers are parsed and placed in `req.headers.authorization`.

### 2. Controller Processing
* Controllers extract validation and payload keys.
* For instance, `authCtrl.login` extracts `req.body.email` and `req.body.password`.
* MongoDB object formats are validated using `ObjectID.isValid(id)`.

### 3. Model validation and Hooks (ORM Layer)
* Extracted data objects are mapped to Mongoose schema wrappers.
* **Mongoose Schema Validations** are run. For instance, in [user-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-model.js#L26-L34), custom path validations count database records to ensure uniqueness for email and username.
* **Pre-save Hooks** run. The user password is intercepted right before insertion and replaced by a bcrypt hash.
* **Date Formatter**: The Todo creation date is generated programmatically in `formattedDate(new Date())` inside [todo-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/todos/todo-model.js#L27-L36).

### 4. Database Persistence
* Mongoose serializes JavaScript models into binary JSON (BSON) structures and issues MongoDB native drivers calls.
* MongoDB creates the document, assigning an auto-generated `_id` field and an internal version tracking field (`__v`).

### 5. Outgoing Response Serialization
* The controller takes database results and calls `res.json()`.
* Mongoose converts internal BSON document structures back into standard JavaScript arrays/objects (applying any virtual attributes or serialization logic).
* Express encodes these objects into HTTP JSON response packages returned to the client.
