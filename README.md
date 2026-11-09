# Multi-Paradigm SOCMINT Platform

docker start socmint-pg socmint-neo4j
npm run seed; npm run dev


> **Executive Impersonation Detection & Brand Phishing Intelligence**  
> An enterprise-grade, academic multi-paradigm database system combining **Relational DB**, **Vector Similarity Search (pgvector)**, and **Graph Database (Neo4j)** without ORM abstraction.

---

## 1. System Architecture

```text
                           ┌────────────────────────┐
                           │   Next.js 16 Client    │
                           │ (App Router + Tailwind)│
                           └───────────┬────────────┘
                                       │ Raw SQL / Cypher
                                       ▼
                     ┌───────────────────────────────────┐
                     │         Backend Services          │
                     │  - pg.Pool (Node pg driver)       │
                     │  - neo4j-driver (Bolt protocol)   │
                     │  - @xenova/transformers (Embed)   │
                     └───────┬───────────────────┬───────┘
                             │                   │
         SQL Queries + Vector Ops                │ Cypher Graph Queries
                             ▼                   ▼
      ┌───────────────────────────────┐  ┌──────────────────────────────┐
      │     PostgreSQL 16 + pgvector  │  │        Neo4j 5 Graph         │
      │                               │  │                              │
      │ - 8 Relational Tables         │  │ - (:Account) Nodes           │
      │ - v_active_phishing_threats   │  │ - (:IP) Nodes                │
      │ - trg_audit_account_status    │  │ - (:EmailDomain) Nodes       │
      │ - update_account_risk()       │  │ - [:USED_IP] Edges           │
      │ - bulk_confirm_accounts()     │  │ - [:REGISTERED_WITH] Edges   │
      │ - HNSW Vector Index (768-D)   │  │                              │
      │ - GIN tsvector Index          │  │                              │
      └───────────────────────────────┘  └──────────────────────────────┘
```

---

## 2. Prerequisites

- **Docker Desktop** installed and running on Windows
- **Node.js 20+** installed
- **Windows PowerShell**

---

## 3. Database Infrastructure Setup (Docker)

### Step 1: Run PostgreSQL with pgvector

Ensure port `5432` is mapped to localhost:

```powershell
docker run -d `
  --name socmint-pg `
  -p 127.0.0.1:5432:5432 `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=socmint `
  pgvector/pgvector:pg16
```

### Step 2: Run Neo4j

Map HTTP port `7474` and Bolt port `7687`:

```powershell
docker run -d `
  --name socmint-neo4j `
  -p 7474:7474 `
  -p 7687:7687 `
  -e NEO4J_AUTH=neo4j/neo4jpass123 `
  neo4j:5
```

---

## 4. Database Seeding

Once Docker containers are running, you can seed both PostgreSQL and Neo4j automatically in one command:

```powershell
npm run seed
```

*(Alternatively, you can manually seed via Docker CLI):*

<details>
<summary>Manual Docker CLI Seeding Commands</summary>

```powershell
# PostgreSQL (Schema + Data)
docker cp "seed_database.sql" socmint-pg:/tmp/seed_database.sql
docker exec socmint-pg psql -U postgres -d socmint -f /tmp/seed_database.sql

# Neo4j: Open http://localhost:7474 and execute the contents of neo4j_seed.cypher
```
</details>

---

## 5. Configuration (`.env.local`)

Create or verify `.env.local` in the project root:

```ini
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/socmint
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4jpass123
JWT_SECRET=c3d5072162913a468284f20055fbd16c5818503aa1cdf7fda872e87ba69368ca
```

---

## 6. Running the Application

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Demo Credentials

| Role | Username | Password | Access Capabilities |
|---|---|---|---|
| **Security Administrator** | `admin_security` | `ChangeMe@123` | Full access: View all telemetry, commit risk changes, bulk confirm rings, delete accounts, view audit logs |
| **Cyber Analyst** | `analyst_cyber` | `ChangeMe@123` | Operational access: View matrix, run forensic vector search, commit risk changes, confirm rings |
| **Cyber Analyst** | `analyst_priya` | `ChangeMe@123` | Operational access |
| **Cyber Analyst** | `analyst_rahul` | `ChangeMe@123` | Operational access |

---

## 8. Academic DBMS Feature Demonstrations

All demonstration SQL queries are indexed in [`demo_queries.sql`](file:///c:/Users/Anirudh/Downloads/SOCMINT/socmint/demo_queries.sql).

### 1. SQL View: `v_active_phishing_threats`
- Aggregates accounts, executive details, company domains, and platforms.
- Powers the real-time filterable threats matrix on `/dashboard`.

### 2. Complex Aggregations & Subqueries
- **GROUP BY + HAVING**: Targets executives with $\ge 2$ impostor clones.
- **LEFT JOIN**: Evaluates company threat surface while preserving 0-threat organizations.
- **Subquery**: Identifies accounts where `risk_score > (SELECT AVG(risk_score) FROM Monitored_Accounts)`.

### 3. Vector Similarity Search (`pgvector`)
- Model: `Xenova/all-mpnet-base-v2` generating 768-dimensional normalized embeddings.
- Index: **HNSW** (`vector_cosine_ops`) with cosine distance (`<=>`).
- Returns semantic similarity calculated as `1 - (content_embedding <=> query_vector)`.

### 4. Full-Text Search (`tsvector` & `ts_rank`)
- Indexed with a **GIN** index on `to_tsvector('english', raw_content)`.
- Ranked via `plainto_tsquery`.

### 5. Stored Procedures & Triggers
- `update_account_risk(account_id, score)`: Dynamically reclassifies status between `Benign`, `Suspect`, and `Confirmed_Phishing`.
- `bulk_confirm_accounts(account_ids[])`: Iterates through an array of UUIDs to mark an entire scam cluster at once.
- `trg_audit_account_status`: Automatically records old/new status, score, timestamp, and acting user (`app.current_user_id`) into `Audit_Logs`.

### 6. Neo4j Graph Infrastructure
- Cross-paradigm entity linking via `Monitored_Accounts.neo4j_node_ref`.
- Detects coordinated scam rings through shared IP addresses and registration email domains.
- Rendered via interactive force-directed canvas on `/accounts/[id]`.

---

## 9. Security & Architecture Highlights

- **No ORM**: Direct parameterized SQL via `pg.Pool` prevents SQL injection and provides visible database features.
- **Next.js 16 Conventions**: Edge-compatible `proxy.ts` route protection, Node.js runtime for Route Handlers, asynchronous `params` and `cookies()`.
- **Role-Based Access Control**: Validated both at the proxy layer and internally within each individual Route Handler.
- **ACID Transactions**: Stored procedure calls and audit sessions execute inside isolated `BEGIN ... COMMIT` blocks with rollback safety.
