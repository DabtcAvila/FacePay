-- ============================================================================
-- FacePay Complete Database Schema for Supabase
-- ============================================================================
-- This file contains the complete database schema generated from Prisma
-- Run this in your Supabase SQL Editor to initialize the database
-- ============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    credit_balance BIGINT DEFAULT 0 NOT NULL,
    current_challenge TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at);

-- ============================================================================
-- BIOMETRIC DATA TABLE
-- ============================================================================
CREATE TABLE biometric_data (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    device_id TEXT,
    confidence DOUBLE PRECISION,
    is_active BOOLEAN DEFAULT true NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for biometric_data table
CREATE INDEX idx_biometric_data_user_id ON biometric_data(user_id);
CREATE INDEX idx_biometric_data_type ON biometric_data(type);
CREATE INDEX idx_biometric_data_is_active ON biometric_data(is_active);
CREATE INDEX idx_biometric_data_user_type_active ON biometric_data(user_id, type, is_active);
CREATE INDEX idx_biometric_data_created_at ON biometric_data(created_at);
CREATE INDEX idx_biometric_data_deleted_at ON biometric_data(deleted_at);

-- ============================================================================
-- WEBAUTHN CREDENTIALS TABLE
-- ============================================================================
CREATE TABLE webauthn_credentials (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    credential_id TEXT UNIQUE NOT NULL,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0 NOT NULL,
    transports TEXT[] DEFAULT ARRAY['internal'] NOT NULL,
    backed_up BOOLEAN DEFAULT false NOT NULL,
    device_type TEXT DEFAULT 'unknown' NOT NULL,
    device_name TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for webauthn_credentials table
CREATE INDEX idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX idx_webauthn_credentials_credential_id ON webauthn_credentials(credential_id);
CREATE INDEX idx_webauthn_credentials_is_active ON webauthn_credentials(is_active);
CREATE INDEX idx_webauthn_credentials_user_active ON webauthn_credentials(user_id, is_active);
CREATE INDEX idx_webauthn_credentials_last_used_at ON webauthn_credentials(last_used_at);
CREATE INDEX idx_webauthn_credentials_deleted_at ON webauthn_credentials(deleted_at);

-- ============================================================================
-- PAYMENT METHODS TABLE
-- ============================================================================
CREATE TABLE payment_methods (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    details JSONB NOT NULL,
    nickname TEXT,
    is_default BOOLEAN DEFAULT false NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for payment_methods table
CREATE INDEX idx_payment_methods_user_id ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_type ON payment_methods(type);
CREATE INDEX idx_payment_methods_provider ON payment_methods(provider);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(is_default);
CREATE INDEX idx_payment_methods_is_active ON payment_methods(is_active);
CREATE INDEX idx_payment_methods_user_active ON payment_methods(user_id, is_active);
CREATE INDEX idx_payment_methods_user_default_active ON payment_methods(user_id, is_default, is_active);
CREATE INDEX idx_payment_methods_last_used_at ON payment_methods(last_used_at);
CREATE INDEX idx_payment_methods_expires_at ON payment_methods(expires_at);
CREATE INDEX idx_payment_methods_deleted_at ON payment_methods(deleted_at);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE transactions (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    payment_method_id TEXT NOT NULL REFERENCES payment_methods(id),
    description TEXT,
    reference TEXT,
    fee DECIMAL(15, 2),
    metadata JSONB,
    is_active BOOLEAN DEFAULT true NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for transactions table
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_currency ON transactions(currency);
CREATE INDEX idx_transactions_payment_method_id ON transactions(payment_method_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_completed_at ON transactions(completed_at);
CREATE INDEX idx_transactions_user_status ON transactions(user_id, status);
CREATE INDEX idx_transactions_user_created_at ON transactions(user_id, created_at);
CREATE INDEX idx_transactions_status_created_at ON transactions(status, created_at);
CREATE INDEX idx_transactions_amount ON transactions(amount);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_is_active ON transactions(is_active);
CREATE INDEX idx_transactions_deleted_at ON transactions(deleted_at);

-- ============================================================================
-- REFUNDS TABLE
-- ============================================================================
CREATE TABLE refunds (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    reference TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    metadata JSONB
);

-- Create indexes for refunds table
CREATE INDEX idx_refunds_transaction_id ON refunds(transaction_id);
CREATE INDEX idx_refunds_status ON refunds(status);
CREATE INDEX idx_refunds_created_at ON refunds(created_at);
CREATE INDEX idx_refunds_processed_at ON refunds(processed_at);
CREATE INDEX idx_refunds_amount ON refunds(amount);
CREATE INDEX idx_refunds_reference ON refunds(reference);
CREATE INDEX idx_refunds_is_active ON refunds(is_active);
CREATE INDEX idx_refunds_deleted_at ON refunds(deleted_at);

-- ============================================================================
-- RECEIPTS TABLE
-- ============================================================================
CREATE TABLE receipts (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    receipt_number TEXT UNIQUE NOT NULL,
    format TEXT DEFAULT 'json' NOT NULL,
    data JSONB NOT NULL,
    file_url TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for receipts table
CREATE INDEX idx_receipts_transaction_id ON receipts(transaction_id);
CREATE INDEX idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX idx_receipts_format ON receipts(format);
CREATE INDEX idx_receipts_generated_at ON receipts(generated_at);
CREATE INDEX idx_receipts_is_active ON receipts(is_active);
CREATE INDEX idx_receipts_deleted_at ON receipts(deleted_at);

-- ============================================================================
-- AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for audit_logs table
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_user_created_at ON audit_logs(user_id, created_at);

-- ============================================================================
-- ANALYTICS EVENTS TABLE
-- ============================================================================
CREATE TABLE analytics_events (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    name TEXT NOT NULL,
    properties JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id TEXT,
    session_id TEXT NOT NULL,
    url TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for analytics_events table
CREATE INDEX idx_analytics_events_name ON analytics_events(name);
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_source ON analytics_events(source);
CREATE INDEX idx_analytics_events_name_timestamp ON analytics_events(name, timestamp);
CREATE INDEX idx_analytics_events_user_timestamp ON analytics_events(user_id, timestamp);

-- ============================================================================
-- CONVERSION EVENTS TABLE
-- ============================================================================
CREATE TABLE conversion_events (
    id TEXT PRIMARY KEY,
    event_name TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT NOT NULL,
    value DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for conversion_events table
CREATE INDEX idx_conversion_events_event_name ON conversion_events(event_name);
CREATE INDEX idx_conversion_events_timestamp ON conversion_events(timestamp);
CREATE INDEX idx_conversion_events_user_id ON conversion_events(user_id);
CREATE INDEX idx_conversion_events_session_id ON conversion_events(session_id);
CREATE INDEX idx_conversion_events_event_timestamp ON conversion_events(event_name, timestamp);
CREATE INDEX idx_conversion_events_user_timestamp ON conversion_events(user_id, timestamp);

-- ============================================================================
-- USER JOURNEY STEPS TABLE
-- ============================================================================
CREATE TABLE user_journey_steps (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    session_id TEXT NOT NULL,
    step TEXT NOT NULL,
    category TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for user_journey_steps table
CREATE INDEX idx_user_journey_steps_user_id ON user_journey_steps(user_id);
CREATE INDEX idx_user_journey_steps_session_id ON user_journey_steps(session_id);
CREATE INDEX idx_user_journey_steps_step ON user_journey_steps(step);
CREATE INDEX idx_user_journey_steps_category ON user_journey_steps(category);
CREATE INDEX idx_user_journey_steps_timestamp ON user_journey_steps(timestamp);
CREATE INDEX idx_user_journey_steps_user_timestamp ON user_journey_steps(user_id, timestamp);
CREATE INDEX idx_user_journey_steps_session_timestamp ON user_journey_steps(session_id, timestamp);

-- ============================================================================
-- BIOMETRIC EVENTS TABLE
-- ============================================================================
CREATE TABLE biometric_events (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    session_id TEXT NOT NULL,
    method TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    error_code TEXT,
    duration INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    properties JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for biometric_events table
CREATE INDEX idx_biometric_events_method ON biometric_events(method);
CREATE INDEX idx_biometric_events_success ON biometric_events(success);
CREATE INDEX idx_biometric_events_timestamp ON biometric_events(timestamp);
CREATE INDEX idx_biometric_events_user_id ON biometric_events(user_id);
CREATE INDEX idx_biometric_events_method_success ON biometric_events(method, success);
CREATE INDEX idx_biometric_events_method_timestamp ON biometric_events(method, timestamp);
CREATE INDEX idx_biometric_events_user_timestamp ON biometric_events(user_id, timestamp);

-- ============================================================================
-- ERROR REPORTS TABLE
-- ============================================================================
CREATE TABLE error_reports (
    id TEXT PRIMARY KEY,
    message TEXT NOT NULL,
    stack TEXT,
    filename TEXT,
    lineno INTEGER,
    colno INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    url TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    severity TEXT NOT NULL,
    context JSONB,
    fingerprint TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for error_reports table
CREATE INDEX idx_error_reports_severity ON error_reports(severity);
CREATE INDEX idx_error_reports_timestamp ON error_reports(timestamp);
CREATE INDEX idx_error_reports_fingerprint ON error_reports(fingerprint);
CREATE INDEX idx_error_reports_user_id ON error_reports(user_id);
CREATE INDEX idx_error_reports_url ON error_reports(url);
CREATE INDEX idx_error_reports_severity_timestamp ON error_reports(severity, timestamp);
CREATE INDEX idx_error_reports_fingerprint_timestamp ON error_reports(fingerprint, timestamp);

-- ============================================================================
-- PERFORMANCE METRICS TABLE
-- ============================================================================
CREATE TABLE performance_metrics (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    unit TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    url TEXT NOT NULL,
    user_id TEXT,
    session_id TEXT NOT NULL,
    device_info JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance_metrics table
CREATE INDEX idx_performance_metrics_name ON performance_metrics(name);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);
CREATE INDEX idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_url ON performance_metrics(url);
CREATE INDEX idx_performance_metrics_name_timestamp ON performance_metrics(name, timestamp);
CREATE INDEX idx_performance_metrics_url_timestamp ON performance_metrics(url, timestamp);

-- ============================================================================
-- ALERTS TABLE
-- ============================================================================
CREATE TABLE alerts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved BOOLEAN DEFAULT false NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for alerts table
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_resolved ON alerts(resolved);
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX idx_alerts_type_severity ON alerts(type, severity);
CREATE INDEX idx_alerts_resolved_timestamp ON alerts(resolved, timestamp);

-- ============================================================================
-- A/B TESTING TABLES
-- ============================================================================
CREATE TABLE ab_tests (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'draft' NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    traffic INTEGER DEFAULT 100 NOT NULL,
    metrics JSONB NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ab_tests_status ON ab_tests(status);
CREATE INDEX idx_ab_tests_start_date ON ab_tests(start_date);
CREATE INDEX idx_ab_tests_end_date ON ab_tests(end_date);
CREATE INDEX idx_ab_tests_created_at ON ab_tests(created_at);

CREATE TABLE ab_test_variants (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    weight INTEGER NOT NULL,
    config JSONB NOT NULL,
    is_control BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ab_test_variants_test_id ON ab_test_variants(test_id);
CREATE INDEX idx_ab_test_variants_is_control ON ab_test_variants(is_control);

CREATE TABLE ab_test_assignments (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id TEXT NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    user_id TEXT,
    session_id TEXT NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    exposure_logged BOOLEAN DEFAULT false NOT NULL,
    
    UNIQUE(test_id, user_id),
    UNIQUE(test_id, session_id)
);

CREATE INDEX idx_ab_test_assignments_test_id ON ab_test_assignments(test_id);
CREATE INDEX idx_ab_test_assignments_variant_id ON ab_test_assignments(variant_id);
CREATE INDEX idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);
CREATE INDEX idx_ab_test_assignments_session_id ON ab_test_assignments(session_id);
CREATE INDEX idx_ab_test_assignments_assigned_at ON ab_test_assignments(assigned_at);

CREATE TABLE ab_test_results (
    id TEXT PRIMARY KEY DEFAULT 'c' || encode(gen_random_bytes(12), 'base64url'),
    test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id TEXT NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    metric TEXT NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    user_id TEXT,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ab_test_results_test_id ON ab_test_results(test_id);
CREATE INDEX idx_ab_test_results_variant_id ON ab_test_results(variant_id);
CREATE INDEX idx_ab_test_results_metric ON ab_test_results(metric);
CREATE INDEX idx_ab_test_results_timestamp ON ab_test_results(timestamp);
CREATE INDEX idx_ab_test_results_test_metric ON ab_test_results(test_id, metric);
CREATE INDEX idx_ab_test_results_variant_metric ON ab_test_results(variant_id, metric);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT FIELDS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_biometric_data_updated_at BEFORE UPDATE ON biometric_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webauthn_credentials_updated_at BEFORE UPDATE ON webauthn_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid()::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid()::text);

-- Biometric data policies
CREATE POLICY "Users can view own biometric data" ON biometric_data
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own biometric data" ON biometric_data
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own biometric data" ON biometric_data
    FOR UPDATE USING (user_id = auth.uid()::text);

-- WebAuthn credentials policies
CREATE POLICY "Users can view own credentials" ON webauthn_credentials
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own credentials" ON webauthn_credentials
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own credentials" ON webauthn_credentials
    FOR UPDATE USING (user_id = auth.uid()::text);

-- Payment methods policies
CREATE POLICY "Users can view own payment methods" ON payment_methods
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own payment methods" ON payment_methods
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own payment methods" ON payment_methods
    FOR UPDATE USING (user_id = auth.uid()::text);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Refunds policies (read-only for users)
CREATE POLICY "Users can view own refunds" ON refunds
    FOR SELECT USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE user_id = auth.uid()::text
        )
    );

-- Receipts policies (read-only for users)
CREATE POLICY "Users can view own receipts" ON receipts
    FOR SELECT USING (
        transaction_id IN (
            SELECT id FROM transactions WHERE user_id = auth.uid()::text
        )
    );

-- Audit logs are admin-only
CREATE POLICY "Only service role can access audit logs" ON audit_logs
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert some example data for testing
INSERT INTO users (email, name, credit_balance) VALUES 
    ('demo@facepay.com', 'Demo User', 10000),
    ('test@facepay.com', 'Test User', 5000);

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- User activity summary
CREATE VIEW user_activity_summary AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.credit_balance,
    u.last_login_at,
    COUNT(t.id) as total_transactions,
    COALESCE(SUM(t.amount), 0) as total_spent,
    COUNT(pm.id) as payment_methods_count,
    COUNT(wc.id) as webauthn_credentials_count
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id AND t.status = 'completed'
LEFT JOIN payment_methods pm ON u.id = pm.user_id AND pm.is_active = true
LEFT JOIN webauthn_credentials wc ON u.id = wc.user_id AND wc.is_active = true
WHERE u.is_active = true
GROUP BY u.id, u.email, u.name, u.credit_balance, u.last_login_at;

-- Daily transaction summary
CREATE VIEW daily_transaction_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    COUNT(DISTINCT user_id) as unique_users
FROM transactions
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================================================
-- FUNCTIONS FOR BUSINESS LOGIC
-- ============================================================================

-- Function to update user credit balance
CREATE OR REPLACE FUNCTION update_user_credits(
    user_id_param TEXT,
    amount_param BIGINT,
    description_param TEXT DEFAULT 'Credit adjustment'
) RETURNS BOOLEAN AS $$
DECLARE
    current_balance BIGINT;
BEGIN
    -- Get current balance
    SELECT credit_balance INTO current_balance 
    FROM users 
    WHERE id = user_id_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Check if transaction would result in negative balance
    IF (current_balance + amount_param) < 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Update balance
    UPDATE users 
    SET credit_balance = credit_balance + amount_param,
        updated_at = NOW()
    WHERE id = user_id_param;
    
    -- Log the transaction in audit_logs
    INSERT INTO audit_logs (
        user_id, 
        table_name, 
        record_id, 
        action, 
        old_values, 
        new_values
    ) VALUES (
        user_id_param,
        'users',
        user_id_param,
        'UPDATE',
        jsonb_build_object('credit_balance', current_balance),
        jsonb_build_object('credit_balance', current_balance + amount_param, 'description', description_param)
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
-- Schema initialization complete!
-- Next steps:
-- 1. Run: npm run db:generate to generate Prisma client
-- 2. Run: npm run db:deploy to deploy migrations
-- 3. Configure your environment variables
-- ============================================================================