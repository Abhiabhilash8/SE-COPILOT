# Folder Analysis

This document describes the design-level responsibilities, critical files, and cross-folder relationships for all major directories in the codebase.

---

## 1. `/config`

### Responsibility
The `/config` directory handles system initialization, environment configuration loading, server bootstrap configuration, logger setups, and middleware/authentication engine configuration.

### Important Files
* **[config.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/config.js)**: Configures global variables by loading `.env` properties, structuring them into a JavaScript object for application-wide consumption.
* **[express.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/express.js)**: Bootstraps the Express application. Configures parsers, global routing, Passport initializations, and centralized error and validation handlers.
* **[logger.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/logger.js)**: Exports a Winston Logger instance generator configured with colorized terminal output and runtime module labels.
* **[passport.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/passport.js)**: Integrates Passport.js with a JWT authentication strategy, specifying how to extract and verify the token.

### Interactions with other folders
* **Imports** `app/users/user-model.js` in `passport.js` to look up users matching the JWT payload.
* **Imports** `app/helpers/AppError.js` in `express.js` to construct standardized 404 or validation error objects.
* **Imports** `app/routes/index.js` in `express.js` to map root routes.
* **Exported to** `index.js` (at the repository root) to bootstrap and launch the HTTP server.

---

## 2. `/app`

The `/app` folder contains the core logic of the application, broken down into feature modules, routes, helpers, and tests.

---

### `/app/authentication`

#### Responsibility
Implements authentication controller handlers for validating credentials, creating new users, and verifying JWT tokens.

#### Important Files
* **[auth-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/authentication/auth-controller.js)**: Exports `login`, `register`, and `checkAuth` request handlers.

#### Interactions with other folders
* **Imports** `app/users/user-model.js` to execute queries (`findOne`, `create`) and generate JWT authentication tokens.
* **Imports** `app/helpers/AppError.js` to generate custom authorization/authentication errors.
* **Imports** `config/config.js` to access variables like `jwtSecret`.
* **Invoked by** `app/routes/index.js` for registration, login, and authorization checks.

---

### `/app/helpers`

#### Responsibility
Provides general utilities, helper classes, and custom error formats.

#### Important Files
* **[AppError.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/helpers/AppError.js)**: A subclass of the native `Error` class, adding a `status` property for Express HTTP responses.

#### Interactions with other folders
* **Used by** `config/express.js`, `app/authentication/auth-controller.js` to raise clean custom API errors.

---

### `/app/routes`

#### Responsibility
Defines the mapping between incoming REST API requests (URL paths and HTTP verbs) and their corresponding controller action handlers.

#### Important Files
* **[index.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/routes/index.js)**: Defines global routes under `express.Router()`.

#### Interactions with other folders
* **Imports** `config/passport.js` to apply JWT guard middleware on protected routes.
* **Imports** `app/authentication/auth-controller.js`, `app/users/user-controller.js`, `app/todos/todo-controller.js` to register their functions against specific endpoints.
* **Imported by** `config/express.js` to register all endpoints on the Express instance.

---

### `/app/todos`

#### Responsibility
Implements the core domain logic and data structures for managing "Todo" items.

#### Important Files
* **[todo-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/todos/todo-model.js)**: Mongoose schema and model configuration for a Todo document.
* **[todo-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/todos/todo-controller.js)**: Exposes API actions (`list`, `create`, `getById`, `removeById`, `update`).

#### Interactions with other folders
* **Reads** user identity from the Express Request object (`req.user._id`), populated by Passport middleware.
* **Invoked by** `app/routes/index.js` to serve Todo-related requests.

---

### `/app/users`

#### Responsibility
Implements the core domain logic, schemas, and data structures for managing "User" entities.

#### Important Files
* **[user-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-model.js)**: Mongoose schema containing field definitions, unique/format validations, pre-save hashing hook, and custom token-generation method.
* **[user-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-controller.js)**: Exposes user management actions (`list`, `getById`, `update`).

#### Interactions with other folders
* **Imported by** `config/passport.js` (for loading user profile details during JWT validation).
* **Imported by** `app/authentication/auth-controller.js` (to register users or verify passwords).
* **Invoked by** `app/routes/index.js` to serve User-related requests.

---

### `/app/tests`

#### Responsibility
Hosts integration and unit test suites along with seeding scripts.

#### Interactions with other folders
* **Requires** models and config files directly to seed the database and perform API calls targeting Express configuration.
