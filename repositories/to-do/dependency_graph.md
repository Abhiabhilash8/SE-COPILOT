# Module Dependency Graph

This document details the compile-time and import-time dependencies between modules in the codebase.

---

## Visual Dependency Graph

Below is the tree of file-level dependencies (directed arrows represent standard `require()` calls):

```
index.js (Application Bootstrapper)
 │
 ├─► config/express.js (Express Setup)
 │     │
 │     ├─► config/config.js (Environment Config Loader)
 │     ├─► config/logger.js (Logger Settings Wrapper)
 │     ├─► app/helpers/AppError.js (Custom Exception Class)
 │     ├─► config/passport.js (Passport JWT Initializer)
 │     │     │
 │     │     ├─► app/users/user-model.js (User schema)
 │     │     └─► config/config.js
 │     │
 │     └─► app/routes/index.js (Central Endpoint Router)
 │           │
 │           ├─► config/passport.js
 │           │
 │           ├─► app/authentication/auth-controller.js
 │           │     ├─► app/users/user-model.js
 │           │     ├─► config/config.js
 │           │     └─► app/helpers/AppError.js
 │           │
 │           ├─► app/users/user-controller.js
 │           │     └─► app/users/user-model.js
 │           │
 │           └─► app/todos/todo-controller.js
 │                 └─► app/todos/todo-model.js (Todo schema)
 │
 ├─► config/logger.js
 └─► config/config.js
```

---

## Cyclic Dependencies Analysis

A search of the import paths reveals **no cyclic dependencies** in the application. 

### Why the architecture avoids cycles:
1. **Clean Hierarchical Layers**: Imports flow unidirectionally from the server configuration (`index.js` -> `express.js`) to routes (`app/routes/index.js`), which delegate to controllers (`app/todos/todo-controller.js`), which in turn depend on core models (`app/todos/todo-model.js`).
2. **Abstracted Database Lookup**: Passport configuration (`config/passport.js`) resolves user details by importing the model directly, rather than routing requests through user controller handlers, preventing controller-config loops.
3. **Decoupled Error Handling**: The `AppError` class is a standalone class and does not import any other application files, acting as a clean terminal leaf node in the dependency tree.
