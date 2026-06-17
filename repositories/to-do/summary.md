# Repository Summary

This document provides a concise summary of the Node-Express-Mongoose Todo API repository, serving as an architectural map and reference guide.

---

## 1. Repository Purpose
The repository hosts a stateless RESTful API backend designed to manage Todo items. It supports user registration, credential hashing, JWT token authentication, and secure, creator-scoped CRUD operations for task documents.

---

## 2. Overall Architecture
The codebase uses a **Layered Architecture (Router-Controller-Model)** pattern:
* **Routing Layer**: Dispatches endpoints to controllers, protected by Passport JWT middlewares.
* **Controller Layer**: Coordinates request payload validation, DB execution, and JSON output formatting.
* **Model Layer**: Formulates Mongoose Schemas, defines data validation rules, and handles lifecycle hooks (like hashing passwords).
* **Configuration Layer**: Bootstraps application-wide environments, passport strategies, and winston loggers.

---

## 3. Important Modules

### Authentication Module (`app/authentication/`)
Manages login and registration logic, password validation using bcrypt, and token payload signing/verification using jsonwebtoken.

### Todo Module (`app/todos/`)
Implements secure CRUD workflows for Todo items. All queries filter against `_creator: req.user._id` to prevent cross-user data access.

### User Module (`app/users/`)
Defines the User schema and handles profile lookups and updates.

---

## 4. Critical Classes & Functions

| Entity/Function Name | File Location | Purpose / Description |
| :--- | :--- | :--- |
| `AppError` | [AppError.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/helpers/AppError.js) | Custom exception class containing an HTTP status code property. |
| `User` (Model) | [user-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-model.js) | Mongoose Model containing pre-save password-hashing hooks and uniqueness path validation. |
| `Todo` (Model) | [todo-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/todos/todo-model.js) | Mongoose Model defining the todo fields and creator ownership fields. |
| `authCtrl.login` | [auth-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/authentication/auth-controller.js) | Handles user authentication using bcrypt and generates signed JWT tokens. |
| `todoCtrl.list` | [todo-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/todos/todo-controller.js) | Retrieves the todo list, scoped by creator ID. |

---

## 5. Major Workflows

### User Sign Up & Authentication
1. **Registration**: Client sends credentials via `POST /register`. The password is encrypted with bcrypt via a pre-save schema hook, the user is saved, and a JWT token is returned.
2. **Accessing Protected Routes**: Client passes the token in the `Authorization` header. Passport JWT middleware decodes the token, verifies the user exists in MongoDB, and attaches the profile to `req.user`.

### creator-Scoped Todo Management
To query, update, or delete tasks:
1. The request flows to a protected endpoint (e.g. `PATCH /todos/:id`).
2. The controller uses the ID of the authenticated user to scope the Mongoose query:
   ```javascript
   Todo.findOneAndUpdate({ _id: id, _creator: req.user._id }, ...)
   ```
3. This guarantees that users cannot read or modify tasks belonging to other accounts.

---

## 6. Important Design Decisions
* **Stateless JWT Session Management**: The server does not persist user sessions, making instances stateless and easy to scale horizontally.
* **Separation of App and Server initialization**: The server setup (`index.js`) is decoupled from the Express initialization (`express.js`), allowing tests to run API assertions against the Express app instance without spinning up a live network listener.
* **Consolidated Error Handler Middleware**: Simplifies controller error handling by letting them catch errors and delegate to `next(err)`, where a centralized Express error middleware standardizes the error response structure.
