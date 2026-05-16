# Nexus Backend

A lightweight backend utility library for [Express.js](https://expressjs.com/) providing structured error classes, standardised API response helpers, and a plug-and-play error handling middleware.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Response Helpers](#response-helpers)
  - [Error Classes](#error-classes)
  - [Error Middleware](#error-middleware)
- [Response Shape](#response-shape)
- [TypeScript](#typescript)
- [License](#license)

---

## Installation

```bash
npm install nexus-backend
```

Express is a peer dependency — make sure it is installed in your project:

```bash
npm install express
```

---

## Quick Start

```ts
import express from "express";
import {
  successResponse,
  errorMiddleware,
  NotFoundError,
  ValidationError,
} from "nexus-backend";

const app = express();
app.use(express.json());

// Example route
app.get("/users/:id", async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);

    if (!user) {
      throw new NotFoundError("User not found");
    }

    res.json(successResponse(user, "User fetched successfully"));
  } catch (err) {
    next(err);
  }
});

// Register error middleware last
app.use(errorMiddleware);

app.listen(3000);
```

---

## API Reference

### Response Helpers

#### `successResponse(data, message?)`

Returns a structured success payload. Pass the result directly to `res.json()`.

```ts
successResponse<T>(data: T, message?: string): SuccessResponse<T>
```

**Example**

```ts
res.status(200).json(
  successResponse({ id: 1, name: "Alice" }, "User fetched successfully")
);
```

```json
{
  "success": true,
  "message": "User fetched successfully",
  "data": { "id": 1, "name": "Alice" }
}
```

---

#### `errorResponse(message, errors?, stack?)`

Returns a structured error payload. You will rarely call this directly — `errorMiddleware` calls it internally. Useful if you need to construct an error response manually.

```ts
errorResponse(message: string, errors?: any, stack?: string): ErrorResponse
```

**Example**

```ts
res.status(400).json(
  errorResponse("Validation failed", { field: "email", issue: "Required" })
);
```

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": { "field": "email", "issue": "Required" }
}
```

---

### Error Classes

All error classes extend the base `ApiError` class, which itself extends the native `Error`. Throw any of these inside a route and let `errorMiddleware` handle the rest.

#### `ApiError`

The base error class. Use this when none of the specific subclasses fit your use case.

```ts
new ApiError(message: string, statusCode?: number, errors?: any, isOperational?: boolean)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | — | Human-readable error message |
| `statusCode` | `number` | `500` | HTTP status code |
| `errors` | `any` | `undefined` | Additional error details or field errors |
| `isOperational` | `boolean` | `true` | Marks the error as an expected operational error |

---

#### `BadRequestError`

**Status:** `400 Bad Request`

Use when the client sends a malformed or invalid request.

```ts
throw new BadRequestError("Invalid request body");
```

---

#### `UnauthorizedError`

**Status:** `401 Unauthorized`

Use when authentication is missing or invalid.

```ts
throw new UnauthorizedError("Invalid token");
```

---

#### `ForbiddenError`

**Status:** `403 Forbidden`

Use when an authenticated user lacks permission to access a resource.

```ts
throw new ForbiddenError("You do not have access to this resource");
```

---

#### `NotFoundError`

**Status:** `404 Not Found`

Use when a requested resource does not exist.

```ts
throw new NotFoundError("Post not found");
```

---

#### `ValidationError`

**Status:** `422 Unprocessable Entity`

Use when request data fails validation. Pass field-level errors via the `errors` argument.

```ts
throw new ValidationError("Validation failed", [
  { field: "email", message: "Must be a valid email address" },
  { field: "password", message: "Must be at least 8 characters" },
]);
```

---

### Error Middleware

#### `errorMiddleware`

An Express-compatible error handling middleware. It catches any error passed to `next(err)`, determines the appropriate HTTP status code and message, and sends a structured `ErrorResponse`.

Register it **after all routes** and other middleware.

```ts
import { errorMiddleware } from "nexusjs";

app.use(errorMiddleware);
```

**Behaviour**

- If the error is an instance of `ApiError` (or any subclass), the middleware uses the error's own `statusCode` and `message`.
- For all other unhandled errors, it falls back to `500 Internal Server Error`.
- When `NODE_ENV` is set to `"development"`, the response includes a `stack` field with the full stack trace to aid debugging. The `stack` field is omitted in production.

**Development response example**

```json
{
  "success": false,
  "message": "User not found",
  "errors": null,
  "stack": "NotFoundError: User not found\n    at ..."
}
```

---

## Response Shape

All responses follow a consistent structure.

#### Success

```ts
interface SuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}
```

#### Error

```ts
interface ErrorResponse {
  success: false;
  message: string;
  errors?: any;
  stack?: string; // only present in development
}
```

---

## TypeScript

nexusjs is written in TypeScript and ships with type declarations out of the box. No `@types` package is needed.

`SuccessResponse` and `ErrorResponse` are exported and can be used to type your own response wrappers or API clients:

```ts
import type { SuccessResponse, ErrorResponse } from "nexusjs";

type ApiResult<T> = SuccessResponse<T> | ErrorResponse;
```

---

## License

MIT