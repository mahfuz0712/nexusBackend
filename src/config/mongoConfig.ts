import mongoose from "mongoose";
import type { MongoConfig } from "../types/mongoConfig.types";

export const connectMongoDb = async (config: MongoConfig) => {
  const { subDomain, userName, password, cluster, dbName } = config;

  const srvURL = `mongodb+srv://${userName}:${password}@${cluster.toLowerCase()}.${subDomain}.mongodb.net/${dbName}?retryWrites=true&w=majority&appName=${cluster.toLowerCase()}`;

  try {
    console.log("Trying +srv connection...");
    await mongoose.connect(srvURL);
    console.log("Connected to MongoDB Atlas");
    return true;
  } catch (err: any) {
    console.error("+srv connection failed:", err.message);
    return false;
  }
};