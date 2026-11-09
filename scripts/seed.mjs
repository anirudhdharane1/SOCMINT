import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import neo4j from 'neo4j-driver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env.local if present
const envPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

async function seedPostgres() {
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/socmint';
  console.log(`\n📦 [1/2] Connecting to PostgreSQL at ${dbUrl}...`);

  const client = new pg.Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('✓ Connected to PostgreSQL');

    const seedSqlPath = path.join(rootDir, 'seed_database.sql');
    if (!fs.existsSync(seedSqlPath)) {
      throw new Error(`seed_database.sql not found at ${seedSqlPath}`);
    }

    console.log('⏳ Executing seed_database.sql (schema, views, triggers, and seed data)...');
    const sql = fs.readFileSync(seedSqlPath, 'utf8');
    await client.query(sql);
    console.log('✓ PostgreSQL seeded successfully!');
  } catch (err) {
    console.error('\n❌ PostgreSQL connection/seeding failed:');
    console.error(err.message || err);
    console.error('\n👉 Ensure your PostgreSQL container is running on port 5432:');
    console.error('   docker start socmint-pg');
    console.error('   (or docker run -d --name socmint-pg -p 127.0.0.1:5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=socmint pgvector/pgvector:pg16)\n');
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

async function seedNeo4j() {
  const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const neo4jUser = process.env.NEO4J_USER || 'neo4j';
  const neo4jPass = process.env.NEO4J_PASSWORD || 'neo4jpass123';
  console.log(`\n🕸️  [2/2] Connecting to Neo4j at ${neo4jUri}...`);

  let driver;
  try {
    driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPass));
    await driver.verifyConnectivity();
    console.log('✓ Connected to Neo4j');

    const cypherPath = path.join(rootDir, 'neo4j_seed.cypher');
    if (!fs.existsSync(cypherPath)) {
      console.log('⚠️  neo4j_seed.cypher not found, skipping Neo4j seed.');
      return;
    }

    console.log('⏳ Executing neo4j_seed.cypher statements...');
    const cypherContent = fs.readFileSync(cypherPath, 'utf8');

    // Remove comment-only lines and split by semicolon
    const cleanCypher = cypherContent
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');

    const statements = cleanCypher
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const session = driver.session();
    try {
      for (const statement of statements) {
        if (statement) {
          await session.run(statement);
        }
      }
      console.log(`✓ Neo4j seeded successfully (${statements.length} queries executed)!`);
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error('\n❌ Neo4j connection/seeding failed:');
    console.error(err.message || err);
    console.error('\n👉 Ensure your Neo4j container is running on port 7687:');
    console.error('   docker start socmint-neo4j');
    console.error('   (or docker run -d --name socmint-neo4j -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/neo4jpass123 neo4j:5)\n');
    throw err;
  } finally {
    if (driver) {
      await driver.close().catch(() => {});
    }
  }
}

async function main() {
  console.log('==============================================');
  console.log('  Multi-Paradigm SOCMINT Platform - Seeder    ');
  console.log('==============================================');

  await seedPostgres();
  await seedNeo4j();

  console.log('\n🎉 Seeding complete! You can now run `npm run dev` and log in.\n');
}

main().catch(() => {
  process.exit(1);
});

