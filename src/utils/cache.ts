import NodeCache from "node-cache";

type CacheValue = unknown;
type ComputeFn<T> = () => Promise<T> | T;

export class Cache extends NodeCache {
  private namespaces: Set<string>;
  private tagMap: Map<string, Set<string>>;

  constructor(options: NodeCache.Options = {}) {
    const defaults: NodeCache.Options = {
      stdTTL: 60,
      checkperiod: 120,
    };

    super({ ...defaults, ...options });

    this.namespaces = new Set<string>();
    this.tagMap = new Map<string, Set<string>>();

    this.on("expired", (key: string, value: unknown) => {
      console.log(`[Cache] Key expired: ${key} ->`, value);
      this.removeKeyFromTags(key);
    });
  }

  private getKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  private removeKeyFromTags(key: string): void {
    for (const [tag, keys] of this.tagMap.entries()) {
      if (keys.has(key)) {
        keys.delete(key);
        if (keys.size === 0) {
          this.tagMap.delete(tag);
        }
      }
    }
  }

  setItem(
    key: string,
    value: CacheValue,
    ttl: number =60,
    namespace?: string,
    tags: string[] = []
  ): void {
    const fullKey = this.getKey(key, namespace);

    if (namespace) {
      this.namespaces.add(namespace);
    }

    const storedValue =
      typeof value === "string" ? value : JSON.stringify(value);

    this.set(fullKey, storedValue, ttl);

    for (const tag of tags) {
      if (!this.tagMap.has(tag)) {
        this.tagMap.set(tag, new Set<string>());
      }
      this.tagMap.get(tag)!.add(fullKey);
    }
  }

  getItem<T = unknown>(key: string, namespace?: string): T | undefined {
    const fullKey = this.getKey(key, namespace);
    const value = this.get(fullKey);

    if (value === undefined) return undefined;

    try {
      return JSON.parse(value as string) as T;
    } catch {
      return value as T;
    }
  }

  async getOrSetItem<T>(
    key: string,
    computeFn: ComputeFn<T>,
    ttl?: number,
    namespace?: string,
    tags: string[] = []
  ): Promise<T> {
    let value = this.getItem<T>(key, namespace);

    if (value === undefined) {
      value = await computeFn();
      this.setItem(key, value, ttl, namespace, tags);
    }

    return value;
  }

  deleteItem(key: string, namespace?: string): number {
    const fullKey = this.getKey(key, namespace);
    this.removeKeyFromTags(fullKey);
    return this.del(fullKey);
  }

  clearNamespace(namespace?: string): void {
    if (!namespace) {
      this.flushAll();
      this.tagMap.clear();
      console.log("[Cache] All keys cleared");
      return;
    }

    for (const key of this.keys()) {
      if (key.startsWith(`${namespace}:`)) {
        this.deleteItem(key);
      }
    }

    console.log(`[Cache] Namespace "${namespace}" cleared`);
  }

  /**
   * Delete all keys associated with a tag
   */
  clearTag(tag: string): void {
    const keys = this.tagMap.get(tag);
    if (!keys) return;

    for (const key of keys) {
      this.del(key);
    }

    this.tagMap.delete(tag);
    console.log(`[Cache] All keys with tag "${tag}" cleared`);
  }
}
