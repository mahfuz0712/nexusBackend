# Nexus Backend

Nexus Backend is a reusable backend utility library for [Express.js](https://expressjs.com/). It is a sub-project of **Nexus JS** and provides common backend building blocks without forcing a complete application architecture on you.

It helps you standardise:

- success and error API responses;
- application errors and Express error handling;
- MongoDB Atlas connections;
- in-memory caching;
- cryptographically random numeric values, such as OTPs;
- transactional email through Resend; and
- multipart file uploads through Nexus Cloud.

## Why use Nexus Backend?

Most Express applications repeat the same backend plumbing: response formats, 404 handling, error handling, database startup, cache invalidation, and small utility functions. Nexus Backend centralises those patterns so that feature code can focus on business logic.

Use it when you want:

- a predictable response shape for frontend developers;
- one error class and one global error middleware;
- a ready-to-use MongoDB connection helper;
- namespaced and tag-based in-memory caching;
- TypeScript types included in the package; and
- small, focused utilities instead of a large framework.

Nexus Backend does **not** create routes, models, authentication, authorisation, validation schemas, or a full project structure for you. You remain in control of your application architecture.

## Project information

| Item | Details |
|---|---|
| Package | `nexus-backend` |
| Current package version | `1.1.4` |
| License | MIT |
| Parent project | Nexus JS |
| Primary language | TypeScript |

The repository does not currently record a reliable original creation date, so this documentation does not invent one. The package version above identifies the current published package state.

## Requirements and platform support

### Runtime requirement

- **Node.js 26 LTS or newer is required.**
- npm, pnpm, or yarn can be used to install the package.

### Operating systems

- **Linux is the recommended environment**, especially for production and deployment.
- **macOS is also a recommended development and deployment environment.**
- **Windows is supported** and the package can run there, but Linux and macOS are the best-suited environments for the typical server workflow.

The operating-system recommendation is about the surrounding backend and deployment environment. The library itself uses Node.js APIs and is not restricted to Linux.

## Installation

```bash
npm install nexus-backend
```

Nexus Backend declares its integrations as peer dependencies. Install the dependencies for the features you use. For a typical Express + MongoDB application:

```bash
npm install express mongoose cors helmet morgan cookie-parser dotenv
```

Install optional feature dependencies only when needed:

```bash
# Caching
npm install node-cache

# Mailer
npm install resend

# File uploads
npm install axios form-data multer
```

If your package manager reports a missing peer dependency, install that dependency explicitly.

## Quick start

The following example shows the usual integration order:

1. load environment variables;
2. create the Express application;
3. register normal middleware and routes;
4. register `errorMiddleware` last;
5. connect to MongoDB; and
6. start the HTTP server only after the database is ready.

```ts
// src/server.ts
import express, { type Application, type Request, type Response } from "express";
import {
  errorMiddleware,
  NexusError,
  successResponse,
} from "nexus-backend";

const app: Application = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/users/:id", async (req: Request, res: Response) => {
  const user = await getUserById(req.params.id);

  if (!user) {
    throw new NexusError("User not found", 404);
  }

  res.json(successResponse(user, "User fetched successfully"));
});

// Keep this after every route and application middleware.
app.use(...errorMiddleware);

export default app;
```

```ts
// src/index.ts
import "dotenv/config";
import { connectMongoDB } from "nexus-backend";
import app from "./server";

const port = Number(process.env.PORT ?? 5000);

const start = async () => {
  const connection = await connectMongoDB({
    subDomain: process.env.DB_SUBDOMAIN!,
    userName: process.env.DB_USERNAME!,
    password: process.env.DB_PASSWORD!,
    cluster: process.env.DB_CLUSTER!,
    dbName: process.env.DB_NAME!,
  });

  if (!connection) {
    console.error("Database connection failed. Server was not started.");
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
};

start();
```

`connectMongoDB` logs the connection failure and resolves to `undefined` when it cannot connect. Check the returned value before starting the server.

## Recommended project setup

A beginner-friendly Express project can be organised like this:

```text
src/
  config/
    mongo.ts
  routes/
  controllers/
  models/
  middleware/
  server.ts
  index.ts
```

Keep application-specific code (routes, controllers, models, validation, and authentication) in your project. Use Nexus Backend for the shared backend utilities described below.

## API reference

All public exports are available from the package root:

```ts
import {
  Cache,
  Mailer,
  NexusError,
  connectMongoDB,
  errorMiddleware,
  errorResponse,
  random,
  successResponse,
  uploader,
} from "nexus-backend";
```

### Response helpers

#### `successResponse(data, message?)`

Creates a consistent successful response:

```ts
res
  .status(200)
  .json(successResponse({ id: 1, name: "Alice" }, "User fetched successfully"));
```

```json
{
  "success": true,
  "data": { "id": 1, "name": "Alice" },
  "message": "User fetched successfully"
}
```

#### `errorResponse(message, errors?, stack?)`

Creates an error response. You will usually not call this directly because `errorMiddleware` uses it internally.

```ts
res
  .status(400)
  .json(errorResponse("Validation failed", {
    field: "email",
    issue: "Required"
  }));
```

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "field": "email",
    "issue": "Required"
  }
}
```

### `NexusError`

`NexusError` is the application error class. Throw it from a route or pass it to Express with `next(error)`, then let `errorMiddleware` format the response.

```ts
new NexusError(
  message: string,
  statusCode?: number,
  errors?: unknown,
  isOperational?: boolean,
);
```

| Parameter | Type | Default | Purpose |
|---|---|---:|---|
| `message` | `string` | required | Human-readable error message |
| `statusCode` | `number` | `500` | HTTP response status |
| `errors` | `unknown` | `undefined` | Validation or field-level details |
| `isOperational` | `boolean` | `true` | Marks an expected application error |

Examples:

```ts
throw new NexusError("Invalid request body", 400);
throw new NexusError("Invalid token", 401);
throw new NexusError("Access denied", 403);
throw new NexusError("Post not found", 404);
throw new NexusError("Validation failed", 422, [
  { field: "email", message: "Must be a valid email address" },
]);
```

There are no built-in `BadRequestError` or `NotFoundError` subclasses; provide the status code explicitly.

### `errorMiddleware`

`errorMiddleware` is a tuple containing two Express handlers:

1. a route-not-found handler; and
2. a global error handler.

Register it once, after all routes, and spread the tuple:

```ts
app.use(...errorMiddleware);
```

Behaviour:

- unmatched routes become a `404` `NexusError`;
- `NexusError` responses use its status, message, and `errors`;
- unknown errors become `500 Internal Server Error`;
- errors are logged with `console.error`; and
- the `stack` property is included only when `NODE_ENV === "development"`.

The middleware does not replace an async error wrapper for Express versions or handlers that do not forward rejected promises. Make sure asynchronous errors reach Express's error pipeline.

### MongoDB connection

#### `connectMongoDB(config)`

```ts
connectMongoDB(config: MongoConfig): Promise<typeof mongoose | undefined>
```

Connects Mongoose to a MongoDB Atlas cluster and returns the Mongoose instance after a successful connection. It returns `undefined` after logging a connection failure.

```ts
interface MongoConfig {
  subDomain: string;
  userName: string;
  password: string;
  cluster: string;
  dbName: string;
}
```

```ts
const connection = await connectMongoDB({
  subDomain: process.env.DB_SUBDOMAIN!,
  userName: process.env.DB_USERNAME!,
  password: process.env.DB_PASSWORD!,
  cluster: process.env.DB_CLUSTER!,
  dbName: process.env.DB_NAME!,
});

if (!connection) {
  process.exit(1);
}
```

Do not hard-code database credentials. Store them in environment variables or a secret manager. `disconnectMongoDB` is currently implemented internally but is not exported from the package root.

### Caching

`Cache` is an in-memory cache built on [`node-cache`](https://www.npmjs.com/package/node-cache). It adds optional namespaces and tag-based invalidation.

```ts
const cache = new Cache({ stdTTL: 120 });
```

The default cache TTL is 60 seconds and the default check period is 120 seconds. Values other than strings are JSON-stringified when stored and parsed when read.

| Method | Signature | Description |
|---|---|---|
| `setItem` | `(key, value, ttl?, namespace?, tags?) => void` | Stores a value |
| `getItem` | `<T>(key, namespace?) => T \| undefined` | Reads a value |
| `getOrSetItem` | `<T>(key, computeFn, ttl?, namespace?, tags?) => Promise<T>` | Reads or computes and stores a value |
| `deleteItem` | `(key, namespace?) => number` | Deletes one key |
| `clearNamespace` | `(namespace?) => void` | Clears one namespace, or all keys when omitted |
| `clearTag` | `(tag) => void` | Clears all keys associated with a tag |

```ts
const products = await cache.getOrSetItem(
  "all-products",
  () => fetchProductsFromDatabase(),
  300,
  "products",
  ["catalog"],
);

cache.clearTag("catalog");
```

For a shared singleton, use `cacheMemory`:

```ts
import { cacheMemory } from "nexus-backend";

cacheMemory.setItem("user:1", { id: 1, name: "Alice" }, 60);
const user = cacheMemory.getItem<{ id: number; name: string }>("user:1");
```

This cache is process-local. Do not use it as the source of truth or as a replacement for Redis in a multi-instance deployment.

### Random numeric values

#### `random(digit)`

Generates a cryptographically random numeric string of the requested length using Node.js `crypto.randomInt`.

```ts
const otp = random(6); // example: "483920"
```

`digit` must be a positive integer. Invalid values throw an error. For large digit counts, JavaScript number limits apply; use an appropriate dedicated OTP or token strategy if you need more than the supported numeric range.

### Mailer

`Mailer` sends transactional HTML email through a configured [Resend](https://resend.com/) client.

```ts
import { Resend } from "resend";
import { Mailer } from "nexus-backend";

const mailer = new Mailer({
  brandName: "MyApp",
  smtpProvider: new Resend(process.env.RESEND_API_KEY!),
  fromEmail: "noreply@myapp.com",
});

const sent = await mailer.sendMail({
  to: "user@example.com",
  subject: "Welcome",
  body: "<p>Thanks for signing up.</p>",
});
```

Configuration types:

```ts
interface MailerConfig {
  brandName: string;
  smtpProvider: Resend;
  fromEmail: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
}
```

`sendMail` returns `true` when Resend accepts the request and `false` when the provider returns an error or the request fails. It logs the failure instead of throwing, so check the returned boolean.

### File uploads

`uploader` provides:

- `upload`, a Multer middleware using in-memory storage and accepting any file type;
- `uploadToNexusCloud`, which uploads a file and returns a file ID; and
- `getNexusDownloadUrl`, which resolves a file ID to a download URL.

```ts
import { Router } from "express";
import { uploader } from "nexus-backend";

const router = Router();

router.post(
  "/upload",
  uploader.upload.single("file"),
  async (req, res) => {
    const fileId = await uploader.uploadToNexusCloud(
      req.file,
      "profile-picture",
    );

    if (!fileId) {
      res.status(400).json({
        success: false,
        message: "A file is required",
      });
      return;
    }

    const downloadUrl = await uploader.getNexusDownloadUrl(fileId);
    res.json(successResponse({ fileId, downloadUrl }));
  },
);
```

`uploadToNexusCloud` returns `undefined` when no file is provided and throws when the remote upload fails. `getNexusDownloadUrl` throws when the remote file lookup fails. Handle these errors in your route or global error pipeline.

The upload middleware stores the complete file in memory and accepts any file type. Add your own file-size and file-type validation before using it in production. Store the returned file ID and generate a download URL when needed rather than treating a generated URL as permanent.

## Standard response types

```ts
interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  errors?: unknown;
  stack?: string;
}
```

Import them as TypeScript types:

```ts
import type {
  ErrorResponse,
  SuccessResponse,
} from "nexus-backend";

type ApiResult<T> = SuccessResponse<T> | ErrorResponse;
```

## Environment variables

Nexus Backend does not load environment variables automatically. Use a package such as `dotenv` in your application entry point.

Typical variables:

```env
NODE_ENV=development
PORT=5000

DB_SUBDOMAIN=your-subdomain
DB_USERNAME=your-database-user
DB_PASSWORD=your-database-password
DB_CLUSTER=your-cluster-name
DB_NAME=your-database-name

RESEND_API_KEY=your-resend-api-key
FRONTEND_URL=http://localhost:3000
```

Never commit real credentials or API keys to source control. The exact variables required depend on the features your application uses.

## TypeScript and package output

Nexus Backend is written in TypeScript and ships type declarations. No separate `@types/nexus-backend` package is needed.

The package exposes:

- CommonJS entry point: `dist/index.js`;
- ESM entry point: `dist/index.mjs`; and
- Type declarations: `dist/index.d.ts`.

## Development

Clone the repository, install dependencies, and build the package:

```bash
npm install
npm run build
```

The build output is generated in `dist/`. The package currently exposes a build script but does not include a test script.

## Developer

**Mohammad Mahfuz Rahman**

- GitHub: [https://github.com/mahfuz0712](https://github.com/mahfuz0712)
- Portfolio: [portfolio-mahfuz0712.vercel.app](https://portfolio-mahfuz0712.vercel.app)
- Email: [mahfuzrahman0712@gmail.com](mailto:mahfuzrahman0712@gmail.com)

## Troubleshooting

### The database connection fails

Check the five MongoDB configuration values, database-user permissions, network access rules in MongoDB Atlas, and whether the server can reach the internet. Do not start the HTTP server when `connectMongoDB` returns `undefined`.

### Errors return the wrong format

Confirm that `app.use(...errorMiddleware)` is registered after every route. Also ensure route errors are thrown or forwarded to Express's error handler.

### The cache does not share values between instances

`Cache` and `cacheMemory` are in-memory and process-local. Use a shared cache service when running multiple application instances.

### Email sending returns `false`

Check the Resend API key, sender-domain configuration, recipient address, and the logged provider error.

### File uploads consume too much memory

The built-in uploader uses Multer memory storage and accepts any file type. Add strict limits and validation, or use a storage design suited to large files.

## License

MIT
