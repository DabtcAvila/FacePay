-- Database Views for Complex Queries

-- User transaction summary view
CREATE OR REPLACE VIEW user_transaction_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    COUNT(t.id) as total_transactions,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_transactions,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_transactions,
    COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_transactions,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount END), 0) as total_completed_amount,
    COALESCE(AVG(CASE WHEN t.status = 'completed' THEN t.amount END), 0) as avg_transaction_amount,
    MAX(t.created_at) as last_transaction_date,
    u.created_at as user_created_at
FROM users u
LEFT JOIN transactions t ON u.id = t.user_id AND t.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.name, u.created_at;

-- Daily transaction statistics view
CREATE OR REPLACE VIEW daily_transaction_stats AS
SELECT 
    DATE(t.created_at) as transaction_date,
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_transactions,
    COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failed_transactions,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount END), 0) as total_volume,
    COALESCE(AVG(CASE WHEN t.status = 'completed' THEN t.amount END), 0) as avg_transaction_amount,
    COUNT(DISTINCT t.user_id) as unique_users,
    COUNT(DISTINCT t.payment_method_id) as unique_payment_methods
FROM transactions t
WHERE t.deleted_at IS NULL
    AND t.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(t.created_at)
ORDER BY transaction_date DESC;

-- Payment method usage statistics
CREATE OR REPLACE VIEW payment_method_stats AS
SELECT 
    pm.id as payment_method_id,
    pm.user_id,
    pm.type,
    pm.provider,
    pm.nickname,
    COUNT(t.id) as transaction_count,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.amount END), 0) as total_volume,
    COALESCE(AVG(CASE WHEN t.status = 'completed' THEN t.amount END), 0) as avg_transaction_amount,
    MAX(t.created_at) as last_used_date,
    pm.created_at as created_date
FROM payment_methods pm
LEFT JOIN transactions t ON pm.id = t.payment_method_id AND t.deleted_at IS NULL
WHERE pm.deleted_at IS NULL
GROUP BY pm.id, pm.user_id, pm.type, pm.provider, pm.nickname, pm.created_at;

-- Refund analysis view
CREATE OR REPLACE VIEW refund_analysis AS
SELECT 
    r.id as refund_id,
    r.transaction_id,
    t.user_id,
    r.amount as refund_amount,
    t.amount as original_amount,
    (r.amount / t.amount * 100) as refund_percentage,
    r.reason,
    r.status as refund_status,
    t.status as transaction_status,
    r.created_at as refund_date,
    t.created_at as transaction_date,
    EXTRACT(EPOCH FROM (r.created_at - t.created_at)) / 3600 as hours_to_refund
FROM refunds r
JOIN transactions t ON r.transaction_id = t.id
WHERE r.deleted_at IS NULL AND t.deleted_at IS NULL;

-- User activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.name,
    u.created_at as registration_date,
    u.last_login_at,
    COUNT(DISTINCT bd.id) as biometric_methods,
    COUNT(DISTINCT wc.id) as webauthn_credentials,
    COUNT(DISTINCT pm.id) as payment_methods,
    COUNT(t.id) as total_transactions,
    COALESCE(MAX(t.created_at), u.created_at) as last_activity_date,
    CASE 
        WHEN u.last_login_at IS NULL THEN 'never_logged_in'
        WHEN u.last_login_at < CURRENT_DATE - INTERVAL '30 days' THEN 'inactive'
        WHEN u.last_login_at < CURRENT_DATE - INTERVAL '7 days' THEN 'dormant'
        ELSE 'active'
    END as activity_status
FROM users u
LEFT JOIN biometric_data bd ON u.id = bd.user_id AND bd.deleted_at IS NULL AND bd.is_active = true
LEFT JOIN webauthn_credentials wc ON u.id = wc.user_id AND wc.deleted_at IS NULL AND wc.is_active = true
LEFT JOIN payment_methods pm ON u.id = pm.user_id AND pm.deleted_at IS NULL AND pm.is_active = true
LEFT JOIN transactions t ON u.id = t.user_id AND t.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.name, u.created_at, u.last_login_at;

-- Security events view (based on audit logs)
CREATE OR REPLACE VIEW security_events AS
SELECT 
    al.id as log_id,
    al.user_id,
    u.email,
    u.name,
    al.table_name,
    al.record_id,
    al.action,
    al.ip_address,
    al.user_agent,
    al.created_at,
    CASE 
        WHEN al.table_name IN ('webauthn_credentials', 'biometric_data') AND al.action = 'CREATE' THEN 'auth_method_added'
        WHEN al.table_name IN ('webauthn_credentials', 'biometric_data') AND al.action = 'DELETE' THEN 'auth_method_removed'
        WHEN al.table_name = 'users' AND al.action = 'UPDATE' THEN 'profile_updated'
        WHEN al.table_name = 'payment_methods' AND al.action = 'CREATE' THEN 'payment_method_added'
        WHEN al.table_name = 'payment_methods' AND al.action = 'DELETE' THEN 'payment_method_removed'
        WHEN al.table_name = 'transactions' AND al.action = 'CREATE' THEN 'transaction_created'
        ELSE 'other'
    END as event_type
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
WHERE al.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY al.created_at DESC;

-- Financial overview view
CREATE OR REPLACE VIEW financial_overview AS
SELECT 
    'today' as period,
    COUNT(*) as transaction_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_volume,
    COALESCE(SUM(fee), 0) as total_fees,
    COUNT(DISTINCT user_id) as unique_users
FROM transactions 
WHERE DATE(created_at) = CURRENT_DATE AND deleted_at IS NULL

UNION ALL

SELECT 
    'this_week' as period,
    COUNT(*) as transaction_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_volume,
    COALESCE(SUM(fee), 0) as total_fees,
    COUNT(DISTINCT user_id) as unique_users
FROM transactions 
WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE) AND deleted_at IS NULL

UNION ALL

SELECT 
    'this_month' as period,
    COUNT(*) as transaction_count,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
    COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_volume,
    COALESCE(SUM(fee), 0) as total_fees,
    COUNT(DISTINCT user_id) as unique_users
FROM transactions 
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) AND deleted_at IS NULL;

-- Create indexes on views for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_transaction_summary_user_id 
ON user_transaction_summary (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_transaction_stats_date 
ON daily_transaction_stats (transaction_date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_method_stats_user_id 
ON payment_method_stats (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_summary_activity_status 
ON user_activity_summary (activity_status);

-- Add comments to views for documentation
COMMENT ON VIEW user_transaction_summary IS 'Aggregated transaction statistics per user';
COMMENT ON VIEW daily_transaction_stats IS 'Daily transaction volume and statistics for the last 90 days';
COMMENT ON VIEW payment_method_stats IS 'Usage statistics for each payment method';
COMMENT ON VIEW refund_analysis IS 'Detailed refund analysis with original transaction data';
COMMENT ON VIEW user_activity_summary IS 'User activity classification and statistics';
COMMENT ON VIEW security_events IS 'Security-related events from audit logs';
COMMENT ON VIEW financial_overview IS 'High-level financial metrics by period';