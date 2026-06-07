export interface MongoConfig {
  subDomain: string;
  userName: string;
  password: string;
  cluster: string;
  dbName: string;
  shards: [string, string, string];
  replicaSet: string;
}