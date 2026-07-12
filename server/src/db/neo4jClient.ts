import neo4j, { Driver, Session } from 'neo4j-driver';

let driver: Driver | null = null;
let neo4jEnabled = false;

export function initNeo4j(): void {
  const uri = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !password) {
    console.log('ℹ️  Neo4j env vars not set — Knowledge Graph will use in-memory fallback.');
    return;
  }

  try {
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      connectionTimeout: 10000,
      maxConnectionLifetime: 3 * 60 * 60 * 1000,
    });
    neo4jEnabled = true;
    console.log('✅ Neo4j driver initialized — Knowledge Graph layer active.');
  } catch (err: any) {
    console.error('❌ Failed to initialize Neo4j driver:', err.message);
    neo4jEnabled = false;
  }
}

export function isNeo4jEnabled(): boolean {
  return neo4jEnabled && driver !== null;
}

export function getNeo4jSession(): Session | null {
  if (!driver || !neo4jEnabled) return null;
  try {
    return driver.session({ database: 'neo4j' });
  } catch {
    return null;
  }
}

export async function runCypher<T = any>(
  query: string,
  params: Record<string, any> = {}
): Promise<T[]> {
  const session = getNeo4jSession();
  if (!session) return [];
  try {
    const result = await session.run(query, params);
    return result.records.map((r) => {
      const obj: Record<string, any> = {};
      r.keys.forEach((k) => {
        const val = r.get(k);
        if (neo4j.isInt(val)) obj[k as string] = neo4j.integer.toNumber(val);
        else if (val && typeof val === 'object' && 'properties' in val) obj[k as string] = val.properties;
        else obj[k as string] = val;
      });
      return obj as T;
    });
  } catch (err: any) {
    console.error('[Neo4j] Query error:', err.message);
    return [];
  } finally {
    await session.close();
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    neo4jEnabled = false;
  }
}
