-- Performance Optimizations

-- Enable PostgreSQL extensions for better performance
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- Create partial indexes for better performance on commonly filtered data
-- Partial index for active users only
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_active_email_idx 
ON users (email) WHERE is_active = true AND deleted_at IS NULL;

-- Partial index for active payment methods
CREATE INDEX CONCURRENTLY IF NOT EXISTS payment_methods_active_user_idx 
ON payment_methods (user_id, type) WHERE is_active = true AND deleted_at IS NULL;

-- Partial index for pending transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_pending_idx 
ON transactions (created_at, user_id) WHERE status = 'pending' AND deleted_at IS NULL;

-- Partial index for completed transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_completed_amount_idx 
ON transactions (user_id, amount, created_at) WHERE status = 'completed' AND deleted_at IS NULL;

-- Partial index for active WebAuthn credentials
CREATE INDEX CONCURRENTLY IF NOT EXISTS webauthn_credentials_active_user_idx 
ON webauthn_credentials (user_id, device_type) WHERE is_active = true AND deleted_at IS NULL;

-- Partial index for active biometric data
CREATE INDEX CONCURRENTLY IF NOT EXISTS biometric_data_active_type_idx 
ON biometric_data (user_id, type, confidence) WHERE is_active = true AND deleted_at IS NULL;

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_user_status_date_idx 
ON transactions (user_id, status, created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_amount_currency_status_idx 
ON transactions (amount, currency, status) WHERE deleted_at IS NULL;

-- GIN indexes for JSON data searching
CREATE INDEX CONCURRENTLY IF NOT EXISTS payment_methods_details_gin_idx 
ON payment_methods USING GIN (details) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_metadata_gin_idx 
ON transactions USING GIN (metadata) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_old_values_gin_idx 
ON audit_logs USING GIN (old_values);

CREATE INDEX CONCURRENTLY IF NOT EXISTS audit_logs_new_values_gin_idx 
ON audit_logs USING GIN (new_values);

-- Text search indexes for full-text search capabilities
CREATE INDEX CONCURRENTLY IF NOT EXISTS users_name_trgm_idx 
ON users USING GIN (name gin_trgm_ops) WHERE name IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS users_email_trgm_idx 
ON users USING GIN (email gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_description_trgm_idx 
ON transactions USING GIN (description gin_trgm_ops) WHERE description IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS refunds_reason_trgm_idx 
ON refunds USING GIN (reason gin_trgm_ops) WHERE deleted_at IS NULL;

-- Functional indexes for computed values
CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_date_only_idx 
ON transactions (DATE(created_at)) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS users_registration_month_idx 
ON users (DATE_TRUNC('month', created_at)) WHERE deleted_at IS NULL;

-- Hash indexes for exact match lookups (when appropriate)
CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_reference_hash_idx 
ON transactions USING HASH (reference) WHERE reference IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS receipts_number_hash_idx 
ON receipts USING HASH (receipt_number) WHERE deleted_at IS NULL;

-- Create materialized view for expensive analytics queries
CREATE MATERIALIZED VIEW IF NOT EXISTS user_monthly_stats AS
SELECT 
    DATE_TRUNC('month', t.created_at) as month,
    t.user_id,
    u.email,
    u.name,
    COUNT(*) as transaction_count,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_count,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount END), 0) as total_volume,
    COALESCE(AVG(CASE WHEN t.status = 'completed' THEN t.amount END), 0) as avg_amount,
    COUNT(DISTINCT t.payment_method_id) as unique_payment_methods,
    MIN(t.created_at) as first_transaction,
    MAX(t.created_at) as last_transaction
FROM transactions t
JOIN users u ON t.user_id = u.id
WHERE t.deleted_at IS NULL AND u.deleted_at IS NULL
GROUP BY DATE_TRUNC('month', t.created_at), t.user_id, u.email, u.name;

-- Index on the materialized view
CREATE INDEX IF NOT EXISTS user_monthly_stats_month_idx ON user_monthly_stats (month);
CREATE INDEX IF NOT EXISTS user_monthly_stats_user_idx ON user_monthly_stats (user_id);
CREATE INDEX IF NOT EXISTS user_monthly_stats_volume_idx ON user_monthly_stats (total_volume);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_monthly_stats;
END;
$$ LANGUAGE plpgsql;

-- Create function for database maintenance
CREATE OR REPLACE FUNCTION perform_database_maintenance() RETURNS TABLE(
    operation TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Vacuum analyze all tables
    RETURN QUERY SELECT 'VACUUM ANALYZE users'::TEXT, 'SUCCESS'::TEXT, 'Completed'::TEXT;
    VACUUM ANALYZE users;
    
    RETURN QUERY SELECT 'VACUUM ANALYZE transactions'::TEXT, 'SUCCESS'::TEXT, 'Completed'::TEXT;
    VACUUM ANALYZE transactions;
    
    RETURN QUERY SELECT 'VACUUM ANALYZE payment_methods'::TEXT, 'SUCCESS'::TEXT, 'Completed'::TEXT;
    VACUUM ANALYZE payment_methods;
    
    RETURN QUERY SELECT 'VACUUM ANALYZE audit_logs'::TEXT, 'SUCCESS'::TEXT, 'Completed'::TEXT;
    VACUUM ANALYZE audit_logs;
    
    -- Refresh materialized views
    BEGIN
        PERFORM refresh_materialized_views();
        RETURN QUERY SELECT 'REFRESH MATERIALIZED VIEWS'::TEXT, 'SUCCESS'::TEXT, 'All views refreshed'::TEXT;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 'REFRESH MATERIALIZED VIEWS'::TEXT, 'ERROR'::TEXT, SQLERRM;
    END;
    
    -- Update table statistics
    RETURN QUERY SELECT 'UPDATE STATISTICS'::TEXT, 'SUCCESS'::TEXT, 'Statistics updated'::TEXT;
    ANALYZE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get database performance metrics
CREATE OR REPLACE FUNCTION get_performance_metrics() RETURNS TABLE(
    metric_name TEXT,
    metric_value TEXT,
    description TEXT
) AS $$
BEGIN
    -- Database size
    RETURN QUERY 
    SELECT 'database_size'::TEXT, 
           pg_size_pretty(pg_database_size(current_database()))::TEXT,
           'Total database size'::TEXT;
    
    -- Cache hit ratio
    RETURN QUERY 
    SELECT 'cache_hit_ratio'::TEXT,
           ROUND(
               100.0 * sum(blks_hit) / NULLIF(sum(blks_hit) + sum(blks_read), 0), 2
           )::TEXT || '%',
           'Buffer cache hit ratio'::TEXT
    FROM pg_stat_database 
    WHERE datname = current_database();
    
    -- Index usage
    RETURN QUERY 
    SELECT 'avg_index_usage'::TEXT,
           COALESCE(ROUND(AVG(
               CASE WHEN idx_scan + seq_scan = 0 THEN 0 
                    ELSE 100.0 * idx_scan / (idx_scan + seq_scan) 
               END
           ), 2), 0)::TEXT || '%',
           'Average index usage across all tables'::TEXT
    FROM pg_stat_all_tables 
    WHERE schemaname = 'public';
    
    -- Active connections
    RETURN QUERY 
    SELECT 'active_connections'::TEXT,
           count(*)::TEXT,
           'Number of active database connections'::TEXT
    FROM pg_stat_activity 
    WHERE state = 'active';
    
    -- Slow queries (if pg_stat_statements is available)
    BEGIN
        RETURN QUERY 
        SELECT 'slowest_query_avg_time'::TEXT,
               COALESCE(ROUND(max(mean_exec_time), 2), 0)::TEXT || ' ms',
               'Average time of slowest query'::TEXT
        FROM pg_stat_statements;
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY 
        SELECT 'slowest_query_avg_time'::TEXT,
               'N/A (pg_stat_statements not available)'::TEXT,
               'Average time of slowest query'::TEXT;
    END;
    
    -- Table sizes
    RETURN QUERY 
    SELECT 'largest_table'::TEXT,
           (SELECT schemaname||'.'||tablename || ' (' || pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) || ')'
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
            LIMIT 1)::TEXT,
           'Largest table by size'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Create function for query optimization recommendations
CREATE OR REPLACE FUNCTION get_optimization_recommendations() RETURNS TABLE(
    table_name TEXT,
    recommendation TEXT,
    priority TEXT,
    description TEXT
) AS $$
BEGIN
    -- Tables with low index usage
    RETURN QUERY 
    SELECT 
        t.schemaname||'.'||t.tablename,
        'Consider adding indexes',
        'HIGH',
        'Sequential scan ratio: ' || ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 1)::TEXT || '%'
    FROM pg_stat_user_tables t
    WHERE seq_scan > idx_scan * 2 
      AND seq_scan > 1000
      AND t.schemaname = 'public';
    
    -- Unused indexes
    RETURN QUERY 
    SELECT 
        i.schemaname||'.'||i.indexrelname,
        'Consider dropping unused index',
        'MEDIUM',
        'Index scans: ' || i.idx_scan::TEXT
    FROM pg_stat_user_indexes i
    JOIN pg_index pgi ON pgi.indexrelid = i.indexrelid
    WHERE i.idx_scan < 10 
      AND NOT pgi.indisunique 
      AND i.schemaname = 'public';
    
    -- Tables needing vacuum
    RETURN QUERY 
    SELECT 
        schemaname||'.'||relname,
        'Table needs vacuuming',
        'HIGH',
        'Dead tuples: ' || n_dead_tup::TEXT
    FROM pg_stat_user_tables 
    WHERE n_dead_tup > n_live_tup * 0.1 
      AND n_dead_tup > 1000
      AND schemaname = 'public';
END;
$$ LANGUAGE plpgsql;

-- Set up automatic statistics collection
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_io_timing = on;
ALTER SYSTEM SET track_functions = 'all';

-- Configure autovacuum for better performance
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.05;
ALTER SYSTEM SET autovacuum_naptime = '30s';

-- Configure shared buffers and work memory (adjust based on available RAM)
-- These are commented out as they require superuser privileges and system restart
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET work_mem = '16MB';
-- ALTER SYSTEM SET maintenance_work_mem = '128MB';

-- Reload configuration (requires superuser)
-- SELECT pg_reload_conf();

-- Add comments
COMMENT ON FUNCTION refresh_materialized_views() IS 'Refreshes all materialized views concurrently';
COMMENT ON FUNCTION perform_database_maintenance() IS 'Performs routine database maintenance tasks';
COMMENT ON FUNCTION get_performance_metrics() IS 'Returns current database performance metrics';
COMMENT ON FUNCTION get_optimization_recommendations() IS 'Provides optimization recommendations based on usage patterns';
COMMENT ON MATERIALIZED VIEW user_monthly_stats IS 'Pre-aggregated monthly user transaction statistics for fast reporting';