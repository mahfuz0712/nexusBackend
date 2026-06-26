// mongoConfig.ts
import mongoose from "mongoose";
import type { MongoConfig } from "../types/mongoConfig.types";

export const connectMongoDb = async (config: MongoConfig) => {
  const { subDomain, userName, password, cluster, dbName, shards, replicaSet } = config;

  const hosts = shards
    .map(s => `${s}.${subDomain}.mongodb.net:27017`)
    .join(",");

  const uri = `mongodb://${userName}:${password}@${hosts}/${dbName}?ssl=true&replicaSet=${replicaSet}&authSource=admin&appName=${cluster}`;

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB Atlas");
    return true;
  } catch (err: any) {
    console.error("Connection failed:", err.message);
    return false;
  }
};