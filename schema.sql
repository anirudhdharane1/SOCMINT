-- =========================================================
-- MULTI-PARADIGM SOCMINT PLATFORM - DATABASE SEED SCRIPT (v2)
-- =========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS Audit_Logs CASCADE;
DROP TABLE IF EXISTS Social_Posts CASCADE;
DROP TABLE IF EXISTS Monitored_Accounts CASCADE;
DROP TABLE IF EXISTS Social_Platforms CASCADE;
DROP TABLE IF EXISTS Executives CASCADE;
DROP TABLE IF EXISTS Companies CASCADE;
DROP TABLE IF EXISTS System_Users CASCADE;
DROP TABLE IF EXISTS Roles CASCADE;

CREATE TABLE Roles (
    role_id INT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE System_Users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES Roles(role_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Companies (
    company_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(150) NOT NULL UNIQUE,
    primary_domain VARCHAR(100) NOT NULL
);

CREATE TABLE Executives (
    executive_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES Companies(company_id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    official_title VARCHAR(150) NOT NULL,
    employment_status VARCHAR(50) DEFAULT 'Active'
        CHECK (employment_status IN ('Active', 'Former'))
);

CREATE TABLE Social_Platforms (
    platform_id INT PRIMARY KEY,
    platform_name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE Monitored_Accounts (
    account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_id INT NOT NULL REFERENCES Social_Platforms(platform_id),
    target_executive_id UUID REFERENCES Executives(executive_id),
    platform_handle VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    threat_status VARCHAR(50) DEFAULT 'Pending'
        CHECK (threat_status IN ('Official','Pending','Suspect','Confirmed_Phishing','Benign')),
    risk_score DECIMAL(5,2) DEFAULT 0.00
        CHECK (risk_score >= 0.00 AND risk_score <= 100.00),
    neo4j_node_ref VARCHAR(100),
    UNIQUE (platform_id, platform_handle)
);

CREATE TABLE Social_Posts (
    post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES Monitored_Accounts(account_id) ON DELETE CASCADE,
    raw_content TEXT NOT NULL,
    content_embedding VECTOR(768),
    posted_at TIMESTAMP NOT NULL
);

CREATE TABLE Audit_Logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES System_Users(user_id),
    action_type VARCHAR(50) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_details JSONB
);

-- Indexes
CREATE INDEX idx_monitored_accounts_status ON Monitored_Accounts(threat_status);
CREATE INDEX idx_monitored_accounts_exec ON Monitored_Accounts(target_executive_id);
CREATE INDEX idx_social_posts_account ON Social_Posts(account_id);
CREATE INDEX idx_social_posts_embedding ON Social_Posts USING hnsw (content_embedding vector_cosine_ops);
CREATE INDEX idx_social_posts_fts ON Social_Posts USING GIN (to_tsvector('english', raw_content));

-- View
CREATE OR REPLACE VIEW v_active_phishing_threats AS
SELECT
    m.account_id, m.platform_handle, m.display_name, m.threat_status, m.risk_score,
    e.first_name || ' ' || e.last_name AS targeted_executive,
    c.company_name, p.platform_name
FROM Monitored_Accounts m
LEFT JOIN Executives e ON m.target_executive_id = e.executive_id
LEFT JOIN Companies c ON e.company_id = c.company_id
JOIN Social_Platforms p ON m.platform_id = p.platform_id
WHERE m.threat_status IN ('Suspect', 'Confirmed_Phishing');

-- Trigger: audit log now records WHO made the change.
-- The API must run, inside the same transaction:
--   SELECT set_config('app.current_user_id', '<user uuid>', true);
CREATE OR REPLACE FUNCTION log_threat_status_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user UUID;
BEGIN
    BEGIN
        v_user := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
    EXCEPTION WHEN OTHERS THEN
        v_user := NULL;
    END;

    IF (OLD.threat_status IS DISTINCT FROM NEW.threat_status)
       OR (OLD.risk_score IS DISTINCT FROM NEW.risk_score) THEN
        INSERT INTO Audit_Logs (user_id, action_type, target_table, change_details)
        VALUES (
            v_user,
            CASE WHEN OLD.threat_status IS DISTINCT FROM NEW.threat_status
                 THEN 'STATUS_UPDATE' ELSE 'RISK_UPDATE' END,
            'Monitored_Accounts',
            jsonb_build_object(
                'account_id', NEW.account_id,
                'handle', NEW.platform_handle,
                'old_status', OLD.threat_status,
                'new_status', NEW.threat_status,
                'old_score', OLD.risk_score,
                'new_score', NEW.risk_score
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_account_status
AFTER UPDATE ON Monitored_Accounts
FOR EACH ROW EXECUTE FUNCTION log_threat_status_changes();

-- Stored procedure: update score + auto-categorise status
CREATE OR REPLACE PROCEDURE update_account_risk(p_account_id UUID, p_new_score DECIMAL(5,2))
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE Monitored_Accounts
    SET risk_score = p_new_score,
        threat_status = CASE
            WHEN p_new_score >= 80.00 THEN 'Confirmed_Phishing'
            WHEN p_new_score >= 40.00 THEN 'Suspect'
            ELSE 'Benign'
        END
    WHERE account_id = p_account_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account % not found', p_account_id;
    END IF;
END;
$$;

-- Stored procedure for a TRANSACTION demo: confirm a whole scam ring at once.
-- Runs atomically: if any account id is invalid, everything rolls back.
CREATE OR REPLACE PROCEDURE bulk_confirm_accounts(p_account_ids UUID[])
LANGUAGE plpgsql AS $$
DECLARE
    v_id UUID;
BEGIN
    FOREACH v_id IN ARRAY p_account_ids LOOP
        CALL update_account_risk(v_id, 95.00);
    END LOOP;
END;
$$;