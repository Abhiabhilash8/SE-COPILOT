# External Dependencies

This document catalogs the external services, libraries, and frameworks integrated into the application, specifying where they are imported and their primary purpose.

---

## 1. Primary Databases and Storage

### MongoDB (Database Engine)
* **Purpose**: Document-oriented database storage for users and todo documents.
* **Usage Location**: Connected globally in [index.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/index.js#L14-L16).
* **Configuration**: Database URIs (for both production/development and unit testing) are loaded from environment variables (`DB_HOST` and `DB_TEST`) in [config.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/config.js#L12-L18).

---

## 2. Core npm Package Dependencies

### 1. `mongoose` (v4.11.9)
* **Purpose**: Object Document Mapper (ODM) library wrapping MongoDB queries in structured schemas and validations.
* **Usage Locations**:
  * [index.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/index.js#L2): Connects and sets up the Global Promise library.
  * [user-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-model.js#L1): Outlines user validations and hooks.
  * [todo-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/todos/todo-model.js#L1): Outlines todo structure schema details.

### 2. `express` (v4.15.4)
* **Purpose**: Web framework for routing and middleware execution.
* **Usage Locations**:
  * [express.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/express.js#L1): Sets up middleware pipelines.
  * [index.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/routes/index.js#L1): Implements API routing maps.

### 3. `passport` & `passport-jwt` (v0.4.0 & v3.0.0)
* **Purpose**: Implements stateless JSON Web Token (JWT) bearer request authentication.
* **Usage Locations**:
  * [passport.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/passport.js): Configures passport strategy verify callbacks.
  * [index.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/routes/index.js#L2): Registers guards on endpoints.

### 4. `jsonwebtoken` (v8.0.1)
* **Purpose**: Manually signs and verifies user access tokens.
* **Usage Locations**:
  * [user-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-model.js#L3): Signs tokens inside the `generateToken` method.
  * [auth-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/authentication/auth-controller.js#L4): Verifies token validation inside `checkAuth`.

### 5. `bcrypt` (v1.0.3)
* **Purpose**: Implements bcrypt password hashing.
* **Usage Locations**:
  * [user-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-model.js#L4): Hashes password field strings before save insertion.
  * [auth-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/authentication/auth-controller.js#L2): Compares raw text request password fields with saved database hashes.

### 6. `winston` (v2.3.1)
* **Purpose**: Structured logging to standard output.
* **Usage Locations**:
  * [logger.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/logger.js#L1): Wraps transport logging.

### 7. `dotenv` (v4.0.0)
* **Purpose**: Loads configuration keys from environmental files.
* **Usage Locations**:
  * [config.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/config.js#L2).

---

## 3. Testing Libraries (DevDependencies)

### Mocha (v3.5.0)
* **Purpose**: Test runner that executes tests matching `app/**/**/*.test.js`.

### Supertest (v3.0.0)
* **Purpose**: Executes HTTP assertions against the Express app instance during tests.

### Expect (v1.20.2)
* **Purpose**: Custom testing assertions wrapper package.
