# API Flow Analysis

This document traces the request-to-response flows for all endpoints in the application.

> [!NOTE]
> In this codebase, the Mongoose Model serves combined roles of the **Entity** (defining schema, validations, and helper methods) and the **Repository** (handling database queries like `.find()`, `.create()`, `.findOneAndUpdate()`). There is no separate service layer; business workflow logic is executed directly inside the controller actions.

---

## 1. Authentication Endpoints

### POST /login

Authenticates a user and returns a JSON Web Token (JWT).

```
[HTTP POST /login]
       │
       ▼ (config/express.js)
[Express Router] (app/routes/index.js)
       │
       ▼ (app/authentication/auth-controller.js -> exports.login)
[AuthController.login()]
       │
       ├─► [User.findOne({ email })] (Query Database)
       │
       ├─► [bcrypt.compare(password, user.password)] (Verify Password)
       │
       ├─► [user.generateToken()] (Sign JWT token)
       │
       ▼
[JSON Response: { id, token }]
```

* **Important Functions Involved**:
  * `authCtrl.login` ([auth-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/authentication/auth-controller.js#L7-L27))
  * `User.findOne` (Mongoose DB query)
  * `bcrypt.compare` (Password verification)
  * `user.generateToken` ([user-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-model.js#L50-L52))

---

### POST /register

Creates a new user profile and returns a JWT.

```
[HTTP POST /register]
       │
       ▼ (config/express.js)
[Express Router] (app/routes/index.js)
       │
       ▼ (app/authentication/auth-controller.js -> exports.register)
[AuthController.register()]
       │
       ├─► [User.create(req.body)]
       │      │
       │      ▼ (Mongoose Validation & hooks)
       │    [User.pre('save')] (Hash password with bcrypt)
       │
       ├─► [user.generateToken()] (Sign JWT token)
       │
       ▼
[JSON Response: { id, token }]
```

* **Important Functions Involved**:
  * `authCtrl.register` ([auth-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/authentication/auth-controller.js#L29-L40))
  * `User.create` (Mongoose schema instantiation & persistence)
  * `User.pre('save')` schema hook ([user-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-model.js#L37-L48))
  * `user.generateToken` ([user-model.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-model.js#L50-L52))

---

### GET /me

Verifies a token provided directly in the headers and returns the matching user's ID.

```
[HTTP GET /me with Authorization header]
       │
       ▼
[Express Router] (app/routes/index.js)
       │
       ▼ (app/authentication/auth-controller.js -> exports.checkAuth)
[AuthController.checkAuth()]
       │
       ├─► [jwt.verify(token, config.jwtSecret)]
       │
       ▼
[JSON Response: { id, token }]
```

* **Important Functions Involved**:
  * `authCtrl.checkAuth` ([auth-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/authentication/auth-controller.js#L42-L56))
  * `jwt.verify` (jsonwebtoken token decoder)

---

## 2. User Management Endpoints (Guarded)

These endpoints require an `Authorization` header containing the JWT token. The request passes through Passport JWT middleware (`passport.authenticate()`) which queries MongoDB to populate `req.user`.

```
[HTTP Protected Request] ──► [Passport JWT Middleware] ──► [User.findOne] ──► [req.user populated] ──► [Controller]
```

### GET /users

Lists all registered user accounts.

```
[HTTP GET /users] ──► [Passport JWT] ──► [UserController.list()] ──► [User.find()] ──► [JSON Response: { users }]
```

* **Important Functions Involved**:
  * `passport.authenticate` ([passport.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/config/passport.js#L26))
  * `userCtrl.list` ([user-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-controller.js#L20-L27))
  * `User.find` (Mongoose DB query)

---

### GET /users/:id

Retrieves a user profile by ID.

```
[HTTP GET /users/:id] ──► [Passport JWT] ──► [UserController.getById()]
                                                    │
                                                    ├─► [ObjectID.isValid(id)]
                                                    ├─► [User.findById(id)]
                                                    ▼
                                            [JSON Response: user]
```

* **Important Functions Involved**:
  * `userCtrl.getById` ([user-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-controller.js#L4-L18))
  * `ObjectID.isValid` (MongoDB ID validation helper)
  * `User.findById` (Mongoose DB query)

---

### PATCH /users/:id

Updates a user's details by ID.

```
[HTTP PATCH /users/:id] ──► [Passport JWT] ──► [UserController.update()]
                                                     │
                                                     ├─► [ObjectID.isValid(id)]
                                                     ├─► [User.findByIdAndUpdate(id, { $set: body }, { runValidators: true })]
                                                     ▼
                                             [JSON Response: updated user]
```

* **Important Functions Involved**:
  * `userCtrl.update` ([user-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/users/user-controller.js#L29-L49))
  * `User.findByIdAndUpdate` (Mongoose update query)

---

## 3. Todo Endpoints (Guarded and Creator-Scoped)

All Todo operations ensure that users can only view, modify, or delete tasks they created by using `_creator: req.user._id` in all queries.

---

### GET /todos

Retrieves the list of todos created by the authenticated user.

```
[HTTP GET /todos] ──► [Passport JWT] ──► [TodoController.list()] ──► [Todo.find({ _creator: req.user._id })] ──► [JSON Response: [todos]]
```

* **Important Functions Involved**:
  * `todoCtrl.list` ([todo-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/todos/todo-controller.js#L4-L11))
  * `Todo.find` (Mongoose DB query)

---

### POST /todos

Creates a new todo item.

```
[HTTP POST /todos] ──► [Passport JWT] ──► [TodoController.create()]
                                                  │
                                                  ├─► [Todo.create({ text, _creator: req.user._id })]
                                                  ▼
                                          [JSON Response: created todo]
```

* **Important Functions Involved**:
  * `todoCtrl.create` ([todo-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/todos/todo-controller.js#L13-L23))
  * `Todo.create` (Mongoose DB query)

---

### GET /todos/:id

Retrieves a specific todo document by ID.

```
[HTTP GET /todos/:id] ──► [Passport JWT] ──► [TodoController.getById()]
                                                    │
                                                    ├─► [ObjectID.isValid(id)]
                                                    ├─► [Todo.findOne({ _id: id, _creator: req.user._id })]
                                                    ▼
                                            [JSON Response: todo]
```

* **Important Functions Involved**:
  * `todoCtrl.getById` ([todo-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/todos/todo-controller.js#L25-L42))
  * `Todo.findOne` (Mongoose DB query)

---

### DELETE /todos/:id

Deletes a specific todo document by ID.

```
[HTTP DELETE /todos/:id] ──► [Passport JWT] ──► [TodoController.removeById()]
                                                       │
                                                       ├─► [ObjectID.isValid(id)]
                                                       ├─► [Todo.findOneAndRemove({ _id: id, _creator: req.user._id })]
                                                       ▼
                                               [JSON Response: deleted todo]
```

* **Important Functions Involved**:
  * `todoCtrl.removeById` ([todo-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/todos/todo-controller.js#L44-L61))
  * `Todo.findOneAndRemove` (Mongoose DB query)

---

### PATCH /todos/:id

Toggles a todo item's status to completed and registers completion timestamps.

```
[HTTP PATCH /todos/:id] ──► [Passport JWT] ──► [TodoController.update()]
                                                      │
                                                      ├─► [ObjectID.isValid(id)]
                                                      ├─► [Todo.findOneAndUpdate({ _id: id, _creator: req.user._id }, { completed: true, completedAt: Date.now() })]
                                                      ▼
                                              [JSON Response: updated todo]
```

* **Important Functions Involved**:
  * `todoCtrl.update` ([todo-controller.js](file:///c:/Users/abhia/Downloads/node-express-mongoose-todo-api-master/node-express-mongoose-todo-api-master/app/todos/todo-controller.js#L63-L88))
  * `Todo.findOneAndUpdate` (Mongoose DB query)
