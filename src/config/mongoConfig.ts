// mongoConfig.ts
import mongoose from "mongoose";
import type { MongoConfig } from "../types/mongoConfig.types";

export const connectMongoDB = async (config: MongoConfig) => {
  const { subDomain, userName, password, cluster, dbName } = config;

  const uri = `mongodb+srv://${userName}:${password}@${cluster}.${subDomain}.mongodb.net:27017/${dbName}?ssl=true&replicaSet=${cluster}&authSource=admin&appName=${cluster}`;
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB Atlas");
    return mongoose;
  } catch (err: any) {
    console.error("Connection failed:", err.message);
    console.dir(err);
  }
};


export async function disconnectMongoDB() {
  await mongoose.connection.close();
}




