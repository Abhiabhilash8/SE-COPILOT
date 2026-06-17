# Class Relationships

This document outlines inheritance, composition, dependency injection, and ownership relationships in the codebase.

---

## 1. Inheritance (Is-A Relationships)

### Custom Error Subclassing
The codebase defines a custom exception helper, `AppError` inside [AppError.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/helpers/AppError.js):

```
     ┌───────────────┐
     │  built-in     │
     │  Error Class  │
     └───────▲───────┘
             │
             │ extends (Inheritance)
     ┌───────┴───────┐
     │   AppError    │
     └───────────────┘
```

* **Implementation Detail**: `AppError` extends JavaScript's built-in `Error` class and calls `super(message)`. It captures the stack trace dynamically via `Error.captureStackTrace(this, this.constructor)` and introduces a custom `status` property representing HTTP status codes (e.g. 400, 401, 404).

### Mongoose Model Inheritance
Although not explicitly declared using `class extends` in code, Mongoose schemas inherit standard database functionalities by being compiled into Mongoose Models:
* `mongoose.model('User', userSchema)`
* `mongoose.model('Todo', todoSchema)`
These models inherit all Mongoose active-record methods such as `save()`, `find()`, `create()`, and `findOneAndUpdate()`.

---

## 2. Composition (Has-A Relationships)

The relationship between the `Todo` document and the `User` document is model-level composition:

```
┌─────────────────┐                 ┌─────────────────┐
│     User        │                 │     Todo        │
│ ────────────────│                 │ ────────────────│
│ - _id           │                 │ - _id           │
│ - username      │◄────────────────│ - _creator (ID) │
│ - email         │                 │ - text          │
└─────────────────┘                 └─────────────────┘
```

* **Reference Keys**: The `Todo` schema defines a `_creator` field:
  ```javascript
  _creator: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
  }
  ```
  This forms a logical composition where a Todo "belongs to" a creator, and queries are always scoped to check that `_creator` matches the user's `_id`.

---

## 3. Dependency Injection (DI)

While the project does not use a DI framework (such as InversifyJS or NestJS), it relies on manual dependency injection:

### Logger Context Injection
The logging configuration helper [logger.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/logger.js) acts as an instantiating factory. When modules require the logger, they inject the Node.js `module` object:
```javascript
const logger = require('./config/logger')(module);
```
This injects context, allowing the logger to dynamically parse the calling file's path (e.g. `config/express.js`) and prefix log lines.

### Middleware injection
In [express.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/express.js), the passport instance is imported, initialized, and injected directly into the Express application lifecycle:
```javascript
const auth = require('./passport')();
app.use(auth.initialize());
```

---

## 4. Object Ownership

* **Request Context**: During request execution, the Passport middleware verifies the JWT token, fetches the matching user profile, and writes it directly to the Express `req` object as `req.user`. Ownership of the user instance context resides with the Express Request object for the duration of the request lifecycle, ensuring controllers can securely access `req.user._id`.
