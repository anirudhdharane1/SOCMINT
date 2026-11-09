# Master Project Plan: Multi-Paradigm SOCMINT Platform

## 1. Project Overview
**Title:** Multi-Paradigm SOCMINT Platform for Executive Impersonation Detection and Brand Protection
**Objective:** A web application designed to detect corporate executive impersonation and brand phishing across social media.
**Tech Stack:** 
*   **Frontend & API:** Next.js (App Router), React, Tailwind CSS
*   **Relational & Vector Database:** PostgreSQL with `pgvector` extension
*   **Graph Database:** Neo4j
*   **Data Generation:** Python (Faker, numpy) for synthetic seeding

---

## 2. Database Architecture 1: PostgreSQL & pgvector (8 Tables)
This database manages role-based access, ground-truth corporate rosters, account metadata, and vector embeddings for semantic search.

### Table 1: Roles
*   **role_id** (INT, PK) - *Ex: 1*
*   **role_name** (VARCHAR, UNIQUE) - *Ex: 'Admin'*

### Table 2: System_Users
*   **user_id** (UUID, PK) - *Ex: 'a1b2c3d4...'*
*   **username** (VARCHAR, UNIQUE) - *Ex: 'analyst_cyber'*
*   **password_hash** (VARCHAR) - *Ex: '$2b$12$eImiT...' (bcrypt)*
*   **role_id** (INT, FK) - *Ex: 2*
*   **created_at** (TIMESTAMP) - *Ex: '2026-11-02 10:00:00'*

### Table 3: Companies
*   **company_id** (UUID, PK) - *Ex: 'f5e6d7c8...'*
*   **company_name** (VARCHAR, UNIQUE) - *Ex: 'Apex Financial Solutions'*
*   **primary_domain** (VARCHAR) - *Ex: 'apexfinancial.com'*

### Table 4: Executives
*   **executive_id** (UUID, PK) - *Ex: '11223344...'*
*   **company_id** (UUID, FK) - *Ex: 'f5e6d7c8...'*
*   **first_name** (VARCHAR) - *Ex: 'Jane'*
*   **last_name** (VARCHAR) - *Ex: 'Doe'*
*   **official_title** (VARCHAR) - *Ex: 'Chief Executive Officer'*
*   **employment_status** (VARCHAR) - *Ex: 'Active'*

### Table 5: Social_Platforms
*   **platform_id** (INT, PK) - *Ex: 1*
*   **platform_name** (VARCHAR) - *Ex: 'LinkedIn'*

### Table 6: Monitored_Accounts (Cross-Paradigm Link)
*   **account_id** (UUID, PK) - *Ex: '99887766...'*
*   **platform_id** (INT, FK) - *Ex: 1*
*   **target_executive_id** (UUID, FK) - *Ex: '11223344...'*
*   **platform_handle** (VARCHAR) - *Ex: '@janedoe_official_real'*
*   **display_name** (VARCHAR) - *Ex: 'Jane Doe (Official)'*
*   **threat_status** (VARCHAR) - *Ex: 'Suspect' (Enum: Official, Pending, Suspect, Confirmed_Phishing, Benign)*
*   **risk_score** (DECIMAL) - *Ex: 85.50*
*   **neo4j_node_ref** (VARCHAR) - *Ex: 'acc_99887766...' (Links to Neo4j Node)*

### Table 7: Social_Posts (Vector Search Target)
*   **post_id** (UUID, PK) - *Ex: '55443322...'*
*   **account_id** (UUID, FK) - *Ex: '99887766...'*
*   **raw_content** (TEXT) - *Ex: 'URGENT: Verify credentials at http://sec-auth-portal.com'*
*   **content_embedding** (VECTOR(768)) - *Ex: '[0.012, -0.045, 0.789...]'*
*   **posted_at** (TIMESTAMP) - *Ex: '2026-11-01 14:30:00'*

### Table 8: Audit_Logs (Populated by Triggers)
*   **log_id** (UUID, PK) - *Ex: '77778888...'*
*   **user_id** (UUID, FK, Nullable) - *Ex: 'a1b2c3d4...'*
*   **action_type** (VARCHAR) - *Ex: 'STATUS_UPDATE'*
*   **target_table** (VARCHAR) - *Ex: 'Monitored_Accounts'*
*   **action_timestamp** (TIMESTAMP) - *Ex: '2026-11-02 12:00:00'*
*   **change_details** (JSONB) - *Ex: '{"old_status": "Pending", "new_status": "Confirmed_Phishing"}'*

---

## 3. Database Architecture 2: Neo4j Graph
This database maps shared attack infrastructure to expose coordinated scam rings.

### Nodes
*   **Account:** `{id: "acc_9988...", handle: "@janedoe_official_real"}`
*   **IP:** `{address: "192.168.45.12"}`
*   **EmailDomain:** `{domain: "temp-mail-sec.org"}`

### Relationships (Edges)
*   `(Account)-[:USED_IP]->(IP)`
*   `(Account)-[:REGISTERED_WITH]->(EmailDomain)`

---

## 4. Advanced Database Features (SQL)
To meet academic requirements, the system implements:
1.  **Vector Search:** `pgvector` cosine similarity (`<=>`) to find paraphrased phishing text.
2.  **Triggers:** `AFTER UPDATE` on `Monitored_Accounts` automatically inserts a JSON payload into `Audit_Logs`.
3.  **Views:** `v_active_phishing_threats` joins Accounts, Executives, and Platforms for a quick dashboard query.
4.  **Stored Procedures:** `update_account_risk(account_id, new_score)` updates the numeric score and automatically categorizes the text status (e.g., >= 80 becomes 'Confirmed_Phishing').

---

## 5. Synthetic Data Generation Strategy
No live scraping is used. A provided Python script (`generate_dataset.py`) handles all data creation:
*   **PostgreSQL Seed:** Uses `Faker` to generate fake companies, executives, and handles. Generates raw text (benign vs phishing) and creates 768-dimensional normalized numpy arrays for `pgvector`. Outputs a `seed_database.sql` file.
*   **Neo4j Seed:** Intentionally maps multiple fake "Suspect" accounts to the same IP addresses/email domains to create graph clusters. Outputs a `neo4j_seed.cypher` file.

---

## 6. Frontend Architecture (Next.js)
The web application requires **5 primary pages/views**:

1.  **`/login`**
    *   *Purpose:* Authenticate users using predefined credentials.
    *   *Integration:* Simple JWT or session cookie setup.
2.  **`/dashboard`**
    *   *Purpose:* Main overview for Analysts/Admins.
    *   *Components:* Metric cards (Total Threats, Active Scams). A data table displaying the `v_active_phishing_threats` SQL View.
3.  **`/investigate` (Semantic Search)**
    *   *Purpose:* Demonstrate Vector Database capabilities.
    *   *Components:* A text input for "Search suspicious phrasing".
    *   *Integration:* Calls an API route that converts the search query to an embedding and runs a similarity search against `Social_Posts`.
4.  **`/accounts/[id]` (Entity Detail & Graph View)**
    *   *Purpose:* Deep dive into a flagged account.
    *   *Components:* Executive details, list of recent posts, a form/button to trigger the `update_account_risk` stored procedure.
    *   *Integration:* Queries PostgreSQL for account data. Queries Neo4j for shared IP/Email links to render a simple list or basic visualization (e.g., using `react-force-graph`).
5.  **`/audit` (Admin Only)**
    *   *Purpose:* Display the automated database logs.
    *   *Components:* Read-only table of `Audit_Logs` parsing the `change_details` JSONB.

---

## 7. Integration & API Strategy
*   **Environment Variables (`.env.local`):**
    *   `DATABASE_URL` (PostgreSQL connection string)
    *   `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`
*   **Backend Connectors:** 
    *   Use the `pg` library (or an ORM like Prisma if preferred, though raw SQL via `pg` is better to demonstrate advanced SQL queries directly).
    *   Use the `neo4j-driver` library for graph queries.
*   **API Routes (`/app/api/...`):**
    *   `GET /api/threats` -> Fetches the SQL View.
    *   `POST /api/search` -> Handles pgvector cosine similarity matching.
    *   `PATCH /api/accounts/[id]/risk` -> Executes the Stored Procedure.
    *   `GET /api/accounts/[id]/network` -> Fetches Neo4j connected nodes.