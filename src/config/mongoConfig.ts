import mongoose from "mongoose";

import type { MongoConfig } from "../types/mongoConfig.types";

export const connectMongoDb = async (config: MongoConfig) => {
  const { subDomain, userName, password, cluster, dbName } = config;
  // Primary +srv URL
  const srvURL = `mongodb+srv://${userName}:${password}@${cluster.toLowerCase()}.${subDomain}.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=${cluster.toLowerCase()}`;
  // Fallback standard mongodb:// URL (you need to adjust hostnames from Atlas)
  const fallbackURL = `mongodb://${userName}:${password}@ac-hkntio7-shard-00-00.${subDomain}.mongodb.net:27017,ac-hkntio7-shard-00-01.${subDomain}.mongodb.net:27017,ac-hkntio7-shard-00-02.${subDomain}.mongodb.net:27017/${dbName}?ssl=true&replicaSet=atlas-cji6jk-shard-0&authSource=admin&appName=${cluster}`;
  try {
    console.log("Trying primary +srv connection...");
    await mongoose.connect(srvURL);
    console.log("Connected to MongoDB Atlas via +srv URL");
    return true;
  } catch (err: any) {
    console.warn("+srv connection failed:", err.message);
    console.log("Trying fallback standard connection...");
    try {
      await mongoose.connect(fallbackURL);
      console.log("Connected to MongoDB Atlas via fallback URL");
      return true;
    } catch (fallbackErr: any) {
      console.error("Fallback connection failed:", fallbackErr.message);
      return false;
    }
  }
};