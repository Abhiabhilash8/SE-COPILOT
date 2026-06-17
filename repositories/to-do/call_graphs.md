# Function Call Graph

This document details the function invocation call graphs for the primary operations in the application.

---

## 1. User Authentication Flow (Login)

Triggered by `POST /login`.

```
[HTTP Client Request]
       │
       ▼
authCtrl.login()
       │
       ├─► User.findOne({ email })
       │         │
       │         ▼ (Mongoose / MongoDB)
       │       [Query user document]
       │
       ├─► bcrypt.compare(password, user.password)
       │         │
       │         ▼ (Bcrypt Library)
       │       [Validate Password Match]
       │
       ├─► user.generateToken()
       │         │
       │         ▼ (JWT Library)
       │       jwt.sign({ user: this }, config.jwtSecret)
       │
       ▼
[JSON Response containing ID and signed token]
```

---

## 2. User Registration Flow

Triggered by `POST /register`.

```
[HTTP Client Request]
       │
       ▼
authCtrl.register()
       │
       ├─► User.create(req.body)
       │         │
       │         ▼ (Mongoose Validation and Hooks)
       │       User.pre('save')
       │         │
       │         ▼ (Bcrypt Library)
       │       bcrypt.hash(user.password, 10)
       │
       ├─► user.generateToken()
       │         │
       │         ▼ (JWT Library)
       │       jwt.sign({ user: this }, config.jwtSecret)
       │
       ▼
[JSON Response containing ID and signed token]
```

---

## 3. Todo Creation Flow (Guarded)

Triggered by `POST /todos`.

```
[HTTP Client Request with token header]
       │
       ▼
passport.authenticate('jwt') (Middleware)
       │
       ├─► Strategy Verify Callback
       │         │
       │         ▼
       │       User.findOne({ _id: jwtPayload.user._id })
       │                 │
       │                 ▼ (Mongoose / MongoDB)
       │               [Load user profile, bind to req.user]
       │
       ▼
todoCtrl.create()
       │
       ├─► Todo.create({ text: req.body.text, _creator: req.user._id })
       │         │
       │         ▼ (Mongoose / MongoDB)
       │       formattedDate(new Date()) (Helper)
       │
       ▼
[JSON Response containing created Todo document]
```

---

## 4. Todo Completion Update Flow (Guarded)

Triggered by `PATCH /todos/:id`.

```
[HTTP Client Request with token header]
       │
       ▼
passport.authenticate('jwt') (Middleware)
       │
       ▼
todoCtrl.update()
       │
       ├─► ObjectID.isValid(id) (MongoDB validation)
       │
       ├─► Todo.findOneAndUpdate({ _id: id, _creator: req.user._id }, { completed: true, completedAt: Date.now() })
       │         │
       │         ▼ (Mongoose / MongoDB)
       │       [Update complete values and run Mongoose validators]
       │
       ▼
[JSON Response containing updated Todo document]
```
