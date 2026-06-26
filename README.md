# Nexus Backend (A sub project of Nexus JS)

A lightweight backend utility library for [Express.js](https://expressjs.com/) providing a structured error class, standardised API response helpers, plug-and-play error handling middleware, MongoDB connection helpers, in-memory caching, email sending, and file upload utilities.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
  - [Response Helpers](#response-helpers)
  - [NexusError](#nexuserror)
  - [Error Middleware](#error-middleware)
  - [MongoDB Connection](#mongodb-connection)
  - [Caching](#caching)
  - [Environment Variables](#environment-variables)
  - [Random Number Generator](#random-number-generator)
  - [Mailer](#mailer)
  - [File Uploads (Nexus Cloud)](#file-uploads-nexus-cloud)
- [Response Shape](#response-shape)
- [TypeScript](#typescript)
- [License](#license)

---

## Installation

```bash
npm install nexus-backend
```

Depending on which features you use, you'll also need:

```bash
# Core (always required)
npm install express mongoose cors helmet morgan cookie-parser

# Only if you use Mailer
npm install resend

# Only if you use the Nexus Cloud uploader
npm install axios form-data multer
```

These are peer dependencies — make sure they're installed in your project.

---

## Quick Start

```ts
// src/config/mongoConfig.ts
import { requiredEnv, type MongoConfig } from "nexus-backend";

const dbConfig: MongoConfig = {
  subDomain: requiredEnv(process.env.DB_HOST, "DB_HOST"),
  userName: requiredEnv(process.env.DB_USERNAME, "DB_USERNAME"),
  password: requiredEnv(process.env.DB_PASSWORD, "DB_PASSWORD"),
  cluster: requiredEnv(process.env.DB_CLUSTER, "DB_CLUSTER"),
  dbName: requiredEnv(process.env.DB_NAME, "DB_NAME"),
  shards: [
    requiredEnv(process.env.DB_SHARD_1, "DB_SHARD_1"),
    requiredEnv(process.env.DB_SHARD_2, "DB_SHARD_2"),
    requiredEnv(process.env.DB_SHARD_3, "DB_SHARD_3"),
  ],
  replicaSet: requiredEnv(process.env.DB_REPLICA_SET, "DB_REPLICA_SET"),
};

export default dbConfig;
```

```ts
// src/server.ts
import express, { type Application, Request, Response } from "express";
import http from "http";
import {
  successResponse,
  errorMiddleware,
  NexusError,
} from "nexus-backend";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";

const app: Application = express();

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));
app.use(cookieParser());

// Example route
app.get("/users/:id", async (req: Request, res: Response) => {
  const user = await getUserById(req.params.id);

  if (!user) {
    throw new NexusError("User not found", 404);
  }

  res.json(successResponse(user, "User fetched successfully"));
});

// errorMiddleware is a tuple [routeNotFoundHandler, globalErrorHandler] — spread it.
// Register it after all routes and other middleware.
app.use(...errorMiddleware);

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

export default server;
```

```ts
// src/index.ts
import "dotenv/config";
import { connectMongoDb } from "nexus-backend";
import dns from "dns";
import dbConfig from "./config/mongoConfig";
import server from "./server";

const PORT = process.env.PORT || 5000;

(async () => {
  dns.setServers(["1.1.1.1", "1.0.0.1"]);
  const dbConnected = await connectMongoDb(dbConfig);
  if (!dbConnected) {
    console.error("Database connection failed. Exiting...");
    process.exit(1);
  }
  server.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
})();
```



---

## API Reference

### Response Helpers

#### `successResponse(data, message?)`

```ts
successResponse<T>(data: T, message?: string): SuccessResponse<T>
```

```ts
res
  .status(200)
  .json(successResponse({ id: 1, name: "Alice" }, "User fetched successfully"));
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

```ts
errorResponse(message: string, errors?: any, stack?: string): ErrorResponse
```

You'll rarely call this directly — `errorMiddleware` calls it internally.

```ts
res
  .status(400)
  .json(errorResponse("Validation failed", { field: "email", issue: "Required" }));
```

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": { "field": "email", "issue": "Required" }
}
```

---

### `NexusError`

The single error class used throughout the library. Extends the native `Error`. Throw it inside a route (or anywhere downstream of Express's error handling) and let `errorMiddleware` handle the rest.

```ts
new NexusError(message: string, statusCode?: number, errors?: any, isOperational?: boolean)
```

| Parameter       | Type      | Default     | Description                                       |
| --------------- | --------- | ----------- | -------------------------------------------------- |
| `message`       | `string`  | —           | Human-readable error message                       |
| `statusCode`    | `number`  | `500`       | HTTP status code                                    |
| `errors`        | `any`     | `undefined` | Additional error details or field-level errors      |
| `isOperational` | `boolean` | `true`      | Marks the error as an expected/handled error        |

There are no built-in subclasses (no `BadRequestError`, `NotFoundError`, etc.) — pass the status code explicitly:

```ts
throw new NexusError("Invalid request body", 400);
throw new NexusError("Invalid token", 401);
throw new NexusError("You do not have access to this resource", 403);
throw new NexusError("Post not found", 404);
throw new NexusError("Validation failed", 422, [
  { field: "email", message: "Must be a valid email address" },
  { field: "password", message: "Must be at least 8 characters" },
]);
```

---

### Error Middleware

#### `errorMiddleware`

A **tuple** of two Express handlers: `[routeNotFoundHandler, globalErrorHandler]`. Must be spread when registered, and registered **after all routes**.

```ts
import { errorMiddleware } from "nexus-backend";

app.use(...errorMiddleware);
```

**Behaviour**

- `routeNotFoundHandler` — runs when no route matched the request; throws a `NexusError` with a `404` status for the unmatched URL.
- `globalErrorHandler` — catches any error passed via `next(err)` (or thrown in an async handler caught by Express 5 / your async wrapper). If the error is a `NexusError`, its own `statusCode`, `message`, and `errors` are used. Any other error falls back to `500 Internal Server Error`.
- When `NODE_ENV === "development"`, the response includes a `stack` field with the full stack trace. It's omitted otherwise.

**Development response example**

```json
{
  "success": false,
  "message": "Post not found",
  "errors": null,
  "stack": "NexusError: Post not found\n    at ..."
}
```

---

### MongoDB Connection

#### `connectMongoDb(config)`

```ts
connectMongoDb(config: MongoConfig): Promise<boolean>
```

Connects to a sharded MongoDB Atlas cluster using a manually constructed connection string (rather than the `mongodb+srv://` DNS-based form). Logs progress and returns `true`/`false` instead of throwing, so you can decide how to handle a failed connection (e.g. exit the process).

```ts
interface MongoConfig {
  subDomain: string;
  userName: string;
  password: string;
  cluster: string;
  dbName: string;
  shards: [string, string, string]; // exactly 3 shard hostnames
  replicaSet: string;
}
```

```ts
import { connectMongoDb, type MongoConfig } from "nexus-backend";

const config: MongoConfig = {
  subDomain: "abc123",
  userName: "dbUser",
  password: "dbPass",
  cluster: "MyCluster",
  dbName: "myapp",
  shards: ["shard-00-00", "shard-00-01", "shard-00-02"],
  replicaSet: "atlas-xxxxx-shard-0",
};

const connected = await connectMongoDb(config);
if (!connected) process.exit(1);
```

---

### Caching

#### `Cache`

An in-memory cache built on top of [`node-cache`](https://www.npmjs.com/package/node-cache), adding namespacing and tag-based invalidation.

```ts
import { Cache } from "nexus-backend";

const cache = new Cache({ stdTTL: 120 }); // any node-cache options
```

| Method | Signature | Description |
|---|---|---|
| `setItem` | `(key, value, ttl?, namespace?, tags?) => void` | Stores a value (auto JSON-stringified if not a string) |
| `getItem` | `<T>(key, namespace?) => T \| undefined` | Retrieves and auto-parses a value |
| `getOrSetItem` | `<T>(key, computeFn, ttl?, namespace?, tags?) => Promise<T>` | Returns cached value, or computes + stores it if missing |
| `deleteItem` | `(key, namespace?) => number` | Deletes a single key |
| `clearNamespace` | `(namespace?) => void` | Clears all keys under a namespace, or everything if omitted |
| `clearTag` | `(tag) => void` | Deletes every key associated with a tag |

```ts
// cache-and-recompute pattern
const products = await cache.getOrSetItem(
  "all-products",
  () => fetchProductsFromDb(),
  300,          // ttl in seconds
  "products",   // namespace
  ["catalog"]   // tags
);

// invalidate everything tagged "catalog" after an update
cache.clearTag("catalog");
```

#### `cacheMemory`

A ready-to-use singleton `Cache` instance, for cases where you don't need a custom configuration:

```ts
import { cacheMemory } from "nexus-backend";

cacheMemory.setItem("user:1", { id: 1, name: "Alice" }, 60);
const user = cacheMemory.getItem("user:1");
```

---

### Environment Variables

#### `requiredEnv(value, key)`

```ts
requiredEnv(value: string | undefined, key: string): string
```

Throws if the environment variable is missing, otherwise returns it — useful for failing fast at startup instead of getting `undefined` deep in your app.

```ts
import { requiredEnv } from "nexus-backend";

const port = requiredEnv(process.env.PORT, "PORT");
```

---

### Random Number Generator

#### `random(digit)`

```ts
random(digit: number): string
```

Generates a cryptographically-random numeric string of a fixed length (e.g. for OTPs). Uses Node's `crypto.randomInt`, not `Math.random()`.

```ts
import { random } from "nexus-backend";

const otp = random(6); // e.g. "483920"
```

---

### Mailer

#### `Mailer`

A thin wrapper around [Resend](https://resend.com/) for sending transactional emails.

```ts
new Mailer(config: MailerConfig)
```

```ts
interface MailerConfig {
  brandName: string;
  smtpProvider: Resend; // a Resend client instance
  fromEmail: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  body: string; // sent as HTML
}
```

```ts
import { Mailer } from "nexus-backend";
import { Resend } from "resend";

const mailer = new Mailer({
  brandName: "MyApp",
  smtpProvider: new Resend(requiredEnv(process.env.RESEND_API_KEY, "RESEND_API_KEY")),
  fromEmail: "noreply@myapp.com",
});

const sent = await mailer.sendMail({
  to: "user@example.com",
  subject: "Welcome!",
  body: "<p>Thanks for signing up.</p>",
});

if (!sent) {
  // Resend API returned an error, or the request itself failed
}
```

`sendMail` never throws — it returns `false` on any failure (Resend API error or network error) so you can handle it without a `try/catch`.

---

### File Uploads (Nexus Cloud)

#### `uploader`

A Telegram-Bot-backed file storage helper — files are sent to a Telegram chat and retrieved via Telegram's file API, giving you free file hosting without S3/Cloudinary.

> **Setup required:** `BOT_TOKEN` and `CHAT_ID` must be supplied via environment variables in your deployment — never hardcode them in source, since this package may be installed by others or its source inspected. Set `NEXUS_CLOUD_BOT_TOKEN` and `NEXUS_CLOUD_CHAT_ID` before using this feature.

| Property | Signature | Description |
|---|---|---|
| `upload` | `multer instance (memoryStorage, accepts any file type)` | Use as Express middleware to parse `multipart/form-data` |
| `uploadToNexusCloud` | `(file: Express.Multer.File \| undefined, label: string) => Promise<string \| undefined>` | Uploads a file, returns a Telegram `file_id` |
| `getNexusDownloadUrl` | `(fileId: string) => Promise<string>` | Resolves a `file_id` into a direct, time-limited download URL |

```ts
import { uploader } from "nexus-backend";
import express from "express";

const router = express.Router();

router.post(
  "/upload",
  uploader.upload.single("file"),
  async (req, res) => {
    const fileId = await uploader.uploadToNexusCloud(req.file, "profile-picture");
    if (!fileId) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const downloadUrl = await uploader.getNexusDownloadUrl(fileId);
    res.json({ success: true, data: { fileId, downloadUrl } });
  }
);
```

> **Note:** Telegram file URLs are not permanent — `getFile` results expire after a time window, so call `getNexusDownloadUrl` fresh each time you need to serve the file rather than caching the URL long-term. Store the `file_id` (which doesn't expire) instead.

---

## Response Shape

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

nexus-backend is written in TypeScript and ships with type declarations out of the box. No `@types` package is needed.

```ts
import type { SuccessResponse, ErrorResponse } from "nexus-backend";

type ApiResult<T> = SuccessResponse<T> | ErrorResponse;
```

---

## License

MIT