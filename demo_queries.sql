-- ============================================================================
-- MULTI-PARADIGM SOCMINT PLATFORM: DEMONSTRATION QUERIES
-- Academic DBMS Demonstration Reference File
-- Features: Views, Aggregations, GROUP BY + HAVING, LEFT JOIN, Subqueries,
--           Vector Cosine Search (pgvector HNSW), GIN Full-Text Indexing,
--           Stored Procedures, Atomic Transactions, DDL ALTER, and Neo4j Cypher.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SQL VIEW QUERY (Dashboard Main Feed)
-- ----------------------------------------------------------------------------
-- Reads from v_active_phishing_threats with filtering and sorting
SELECT 
    account_id,
    platform_handle,
    display_name,
    threat_status,
    risk_score,
    targeted_executive,
    company_name,
    platform_name
FROM v_active_phishing_threats
WHERE threat_status = 'Confirmed_Phishing'
ORDER BY risk_score DESC;


-- ----------------------------------------------------------------------------
-- 2. DASHBOARD ANALYTIC WIDGET 1: GROUP BY + HAVING
-- ----------------------------------------------------------------------------
-- Identifies high-value corporate executives targeted by 2 or more active impostors
SELECT 
    e.first_name || ' ' || e.last_name AS executive,
    e.official_title,
    c.company_name,
    COUNT(m.account_id) AS impostor_count
FROM Executives e
JOIN Companies c ON e.company_id = c.company_id
JOIN Monitored_Accounts m ON m.target_executive_id = e.executive_id
WHERE m.threat_status IN ('Suspect', 'Confirmed_Phishing')
GROUP BY e.executive_id, e.first_name, e.last_name, e.official_title, c.company_name
HAVING COUNT(m.account_id) >= 2
ORDER BY impostor_count DESC;


-- ----------------------------------------------------------------------------
-- 3. DASHBOARD ANALYTIC WIDGET 2: LEFT JOIN WITH ZERO-COUNT PRESERVATION
-- ----------------------------------------------------------------------------
-- Returns company threat surface across all registered companies, preserving 0-threat entities
SELECT 
    c.company_name,
    COUNT(m.account_id) FILTER (WHERE m.threat_status IN ('Suspect', 'Confirmed_Phishing')) AS threat_count
FROM Companies c
LEFT JOIN Executives e ON e.company_id = c.company_id
LEFT JOIN Monitored_Accounts m ON m.target_executive_id = e.executive_id
GROUP BY c.company_id, c.company_name
ORDER BY threat_count DESC;


-- ----------------------------------------------------------------------------
-- 4. DASHBOARD ANALYTIC WIDGET 3: SUBQUERY WITH SCALAR COMPARISON
-- ----------------------------------------------------------------------------
-- Extracts accounts whose risk score exceeds the global average risk score
SELECT 
    m.account_id,
    m.platform_handle,
    m.threat_status,
    m.risk_score,
    e.first_name || ' ' || e.last_name AS targeted_executive,
    c.company_name
FROM Monitored_Accounts m
LEFT JOIN Executives e ON m.target_executive_id = e.executive_id
LEFT JOIN Companies c ON e.company_id = c.company_id
WHERE m.risk_score > (SELECT AVG(risk_score) FROM Monitored_Accounts)
ORDER BY m.risk_score DESC
LIMIT 10;


-- ----------------------------------------------------------------------------
-- 5. DETAILED ENTITY RETRIEVAL (Account + Executive + Company + Platform)
-- ----------------------------------------------------------------------------
SELECT
    m.account_id,
    m.platform_handle,
    m.display_name,
    m.threat_status,
    m.risk_score,
    m.neo4j_node_ref,
    e.executive_id,
    e.first_name || ' ' || e.last_name AS executive_name,
    e.official_title,
    e.employment_status,
    c.company_id,
    c.company_name,
    c.primary_domain,
    p.platform_name
FROM Monitored_Accounts m
LEFT JOIN Executives e ON m.target_executive_id = e.executive_id
LEFT JOIN Companies c ON e.company_id = c.company_id
JOIN Social_Platforms p ON m.platform_id = p.platform_id
WHERE m.account_id = (SELECT account_id FROM Monitored_Accounts LIMIT 1);


-- ----------------------------------------------------------------------------
-- 6. FULL-TEXT SEARCH (PostgreSQL GIN tsvector / ts_rank)
-- ----------------------------------------------------------------------------
-- Keyword-based full text search with lexical ranking
SELECT 
    sp.post_id,
    sp.raw_content,
    sp.posted_at,
    ma.platform_handle,
    ma.threat_status,
    ts_rank(to_tsvector('english', sp.raw_content), plainto_tsquery('english', 'urgent transfer credentials')) AS similarity
FROM Social_Posts sp
JOIN Monitored_Accounts ma ON sp.account_id = ma.account_id
WHERE to_tsvector('english', sp.raw_content) @@ plainto_tsquery('english', 'urgent transfer credentials')
ORDER BY similarity DESC
LIMIT 10;


-- ----------------------------------------------------------------------------
-- 7. VECTOR SIMILARITY SEARCH (pgvector Cosine Distance <=>)
-- ----------------------------------------------------------------------------
-- Extracts semantic matches by querying 768-D normalized embedding vector
-- Note: Replace sample vector below with target vector from @xenova/transformers
SELECT 
    sp.post_id,
    sp.raw_content,
    sp.posted_at,
    ma.platform_handle,
    ma.threat_status,
    1 - (sp.content_embedding <=> (SELECT content_embedding FROM Social_Posts LIMIT 1)) AS similarity
FROM Social_Posts sp
JOIN Monitored_Accounts ma ON sp.account_id = ma.account_id
ORDER BY sp.content_embedding <=> (SELECT content_embedding FROM Social_Posts LIMIT 1)
LIMIT 10;


-- ----------------------------------------------------------------------------
-- 8. EXPLAIN ANALYZE: VECTOR QUERY USING HNSW INDEX
-- ----------------------------------------------------------------------------
-- Demonstrates execution plan, index scan vs sequence scan, and buffer reads
EXPLAIN ANALYZE
SELECT 
    sp.post_id,
    sp.raw_content,
    1 - (sp.content_embedding <=> (SELECT content_embedding FROM Social_Posts LIMIT 1)) AS similarity
FROM Social_Posts sp
ORDER BY sp.content_embedding <=> (SELECT content_embedding FROM Social_Posts LIMIT 1)
LIMIT 10;


-- ----------------------------------------------------------------------------
-- 9. DDL DEMONSTRATION: ALTER TABLE (Add & Drop Column)
-- ----------------------------------------------------------------------------
-- Step A: Add a harmless metadata audit flag
ALTER TABLE Monitored_Accounts 
ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT FALSE;

-- Verify addition
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'monitored_accounts' AND column_name = 'requires_manual_review';

-- Step B: Drop the harmless column to clean up
ALTER TABLE Monitored_Accounts 
DROP COLUMN IF EXISTS requires_manual_review;


-- ----------------------------------------------------------------------------
-- 10. MANUAL TRANSACTION DEMONSTRATION WITH TRIGGER & STORED PROCEDURE
-- ----------------------------------------------------------------------------
-- Demonstrates atomic transaction with session variable set_config for trigger audit
BEGIN;

-- 1. Pass acting user UUID to session variable
SELECT set_config(
    'app.current_user_id', 
    (SELECT user_id::text FROM System_Users WHERE username = 'admin_security'), 
    true
);

-- 2. Call the stored procedure to update risk and trigger threat status reclassification
CALL update_account_risk(
    (SELECT account_id FROM Monitored_Accounts WHERE threat_status = 'Suspect' LIMIT 1),
    92.50
);

-- 3. Commit changes atomically
COMMIT;

-- 4. Verify trigger trg_audit_account_status populated Audit_Logs with the user and changes
SELECT 
    al.log_id,
    al.action_type,
    al.target_table,
    al.action_timestamp,
    u.username AS acting_user,
    al.change_details
FROM Audit_Logs al
LEFT JOIN System_Users u ON al.user_id = u.user_id
ORDER BY al.action_timestamp DESC
LIMIT 1;


-- ----------------------------------------------------------------------------
-- 11. BULK CONFIRMATION TRANSACTION (Stored Procedure)
-- ----------------------------------------------------------------------------
-- Bulk procedural update demonstrating atomic ring confirmation
BEGIN;

SELECT set_config(
    'app.current_user_id',
    (SELECT user_id::text FROM System_Users WHERE username = 'analyst_cyber'),
    true
);

CALL bulk_confirm_accounts(
    ARRAY(SELECT account_id FROM Monitored_Accounts WHERE threat_status = 'Suspect' LIMIT 3)
);

COMMIT;


-- ----------------------------------------------------------------------------
-- 12. NEO4J CYPHER QUERIES (Graph Paradigm)
-- ----------------------------------------------------------------------------
-- Run in Neo4j Browser (http://localhost:7474)

-- A. Find shared infrastructure (IPs and Email Domains) for an account
/*
MATCH (a:Account {id: 'acc_0'})
OPTIONAL MATCH (a)-[:USED_IP]->(ip:IP)<-[:USED_IP]-(peer:Account)
OPTIONAL MATCH (a)-[:REGISTERED_WITH]->(ed:EmailDomain)<-[:REGISTERED_WITH]-(peer2:Account)
RETURN a, ip, peer, ed, peer2;
*/

-- B. Detect coordinated scam rings with shared IP addresses
/*
MATCH (a1:Account)-[:USED_IP]->(ip:IP)<-[:USED_IP]-(a2:Account)
WHERE a1.id < a2.id
RETURN ip.address AS shared_ip, collect(DISTINCT a1.handle) + collect(DISTINCT a2.handle) AS ring_accounts;
*/

