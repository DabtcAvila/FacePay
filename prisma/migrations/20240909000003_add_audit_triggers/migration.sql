-- Audit Triggers for Automatic Logging

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
DECLARE
    old_values JSONB;
    new_values JSONB;
    user_id TEXT;
BEGIN
    -- Skip audit logging for audit_logs table to prevent infinite recursion
    IF TG_TABLE_NAME = 'audit_logs' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Extract user_id if available in the record
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        -- Try to extract user_id from NEW record
        IF NEW IS NOT NULL AND (NEW.user_id IS NOT NULL OR (SELECT to_jsonb(NEW) ? 'user_id')) THEN
            user_id := (to_jsonb(NEW) ->> 'user_id');
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Try to extract user_id from OLD record
        IF OLD IS NOT NULL AND (OLD.user_id IS NOT NULL OR (SELECT to_jsonb(OLD) ? 'user_id')) THEN
            user_id := (to_jsonb(OLD) ->> 'user_id');
        END IF;
    END IF;

    -- Prepare old and new values
    IF TG_OP = 'DELETE' THEN
        old_values := to_jsonb(OLD);
        new_values := NULL;
    ELSIF TG_OP = 'INSERT' THEN
        old_values := NULL;
        new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        old_values := to_jsonb(OLD);
        new_values := to_jsonb(NEW);
    END IF;

    -- Insert audit log entry
    INSERT INTO audit_logs (
        user_id,
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        created_at
    ) VALUES (
        user_id,
        TG_TABLE_NAME,
        COALESCE((new_values ->> 'id'), (old_values ->> 'id')),
        TG_OP,
        old_values,
        new_values,
        NOW()
    );

    -- Return appropriate record
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for all main tables

-- Users table audit trigger
DROP TRIGGER IF EXISTS users_audit_trigger ON users;
CREATE TRIGGER users_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Biometric data audit trigger
DROP TRIGGER IF EXISTS biometric_data_audit_trigger ON biometric_data;
CREATE TRIGGER biometric_data_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON biometric_data
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- WebAuthn credentials audit trigger
DROP TRIGGER IF EXISTS webauthn_credentials_audit_trigger ON webauthn_credentials;
CREATE TRIGGER webauthn_credentials_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON webauthn_credentials
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Payment methods audit trigger
DROP TRIGGER IF EXISTS payment_methods_audit_trigger ON payment_methods;
CREATE TRIGGER payment_methods_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Transactions audit trigger
DROP TRIGGER IF EXISTS transactions_audit_trigger ON transactions;
CREATE TRIGGER transactions_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Refunds audit trigger
DROP TRIGGER IF EXISTS refunds_audit_trigger ON refunds;
CREATE TRIGGER refunds_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON refunds
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Receipts audit trigger
DROP TRIGGER IF EXISTS receipts_audit_trigger ON receipts;
CREATE TRIGGER receipts_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON receipts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create function to update last_login_at automatically
CREATE OR REPLACE FUNCTION update_user_last_login() RETURNS TRIGGER AS $$
BEGIN
    -- Update last_login_at when webauthn credentials are used
    IF TG_TABLE_NAME = 'webauthn_credentials' AND TG_OP = 'UPDATE' THEN
        IF OLD.counter < NEW.counter THEN -- Counter increased means credential was used
            UPDATE users 
            SET last_login_at = NOW() 
            WHERE id = NEW.user_id;
            
            -- Update the credential's last_used_at
            NEW.last_used_at := NOW();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update last login time
DROP TRIGGER IF EXISTS webauthn_usage_trigger ON webauthn_credentials;
CREATE TRIGGER webauthn_usage_trigger
    BEFORE UPDATE ON webauthn_credentials
    FOR EACH ROW EXECUTE FUNCTION update_user_last_login();

-- Create function to update payment method last_used_at
CREATE OR REPLACE FUNCTION update_payment_method_usage() RETURNS TRIGGER AS $$
BEGIN
    -- Update payment method last_used_at when a transaction is created
    IF TG_OP = 'INSERT' THEN
        UPDATE payment_methods 
        SET last_used_at = NOW() 
        WHERE id = NEW.payment_method_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update payment method usage
DROP TRIGGER IF EXISTS transaction_payment_method_trigger ON transactions;
CREATE TRIGGER transaction_payment_method_trigger
    AFTER INSERT ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_payment_method_usage();

-- Create function for soft delete validation
CREATE OR REPLACE FUNCTION validate_soft_delete() RETURNS TRIGGER AS $$
BEGIN
    -- Prevent hard deletes on tables with soft delete support
    IF TG_OP = 'DELETE' AND TG_TABLE_NAME IN (
        'users', 'biometric_data', 'webauthn_credentials', 
        'payment_methods', 'transactions', 'refunds', 'receipts'
    ) THEN
        RAISE EXCEPTION 'Hard deletes are not allowed on table %. Use soft delete by setting deleted_at and is_active = false', TG_TABLE_NAME;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create soft delete validation triggers
DROP TRIGGER IF EXISTS users_soft_delete_validation ON users;
CREATE TRIGGER users_soft_delete_validation
    BEFORE DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_soft_delete();

DROP TRIGGER IF EXISTS biometric_data_soft_delete_validation ON biometric_data;
CREATE TRIGGER biometric_data_soft_delete_validation
    BEFORE DELETE ON biometric_data
    FOR EACH ROW EXECUTE FUNCTION validate_soft_delete();

DROP TRIGGER IF EXISTS webauthn_credentials_soft_delete_validation ON webauthn_credentials;
CREATE TRIGGER webauthn_credentials_soft_delete_validation
    BEFORE DELETE ON webauthn_credentials
    FOR EACH ROW EXECUTE FUNCTION validate_soft_delete();

DROP TRIGGER IF EXISTS payment_methods_soft_delete_validation ON payment_methods;
CREATE TRIGGER payment_methods_soft_delete_validation
    BEFORE DELETE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION validate_soft_delete();

DROP TRIGGER IF EXISTS transactions_soft_delete_validation ON transactions;
CREATE TRIGGER transactions_soft_delete_validation
    BEFORE DELETE ON transactions
    FOR EACH ROW EXECUTE FUNCTION validate_soft_delete();

DROP TRIGGER IF EXISTS refunds_soft_delete_validation ON refunds;
CREATE TRIGGER refunds_soft_delete_validation
    BEFORE DELETE ON refunds
    FOR EACH ROW EXECUTE FUNCTION validate_soft_delete();

DROP TRIGGER IF EXISTS receipts_soft_delete_validation ON receipts;
CREATE TRIGGER receipts_soft_delete_validation
    BEFORE DELETE ON receipts
    FOR EACH ROW EXECUTE FUNCTION validate_soft_delete();

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at triggers for all tables that have updated_at column
DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;
CREATE TRIGGER users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS biometric_data_updated_at_trigger ON biometric_data;
CREATE TRIGGER biometric_data_updated_at_trigger
    BEFORE UPDATE ON biometric_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS webauthn_credentials_updated_at_trigger ON webauthn_credentials;
CREATE TRIGGER webauthn_credentials_updated_at_trigger
    BEFORE UPDATE ON webauthn_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS payment_methods_updated_at_trigger ON payment_methods;
CREATE TRIGGER payment_methods_updated_at_trigger
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS transactions_updated_at_trigger ON transactions;
CREATE TRIGGER transactions_updated_at_trigger
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS refunds_updated_at_trigger ON refunds;
CREATE TRIGGER refunds_updated_at_trigger
    BEFORE UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS receipts_updated_at_trigger ON receipts;
CREATE TRIGGER receipts_updated_at_trigger
    BEFORE UPDATE ON receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create function for data validation
CREATE OR REPLACE FUNCTION validate_transaction_data() RETURNS TRIGGER AS $$
BEGIN
    -- Validate transaction amount is positive
    IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Transaction amount must be positive. Got: %', NEW.amount;
    END IF;
    
    -- Validate currency code format
    IF LENGTH(NEW.currency) != 3 THEN
        RAISE EXCEPTION 'Currency code must be 3 characters. Got: %', NEW.currency;
    END IF;
    
    -- Validate status values
    IF NEW.status NOT IN ('pending', 'completed', 'failed', 'refunded', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid transaction status: %', NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger for transactions
DROP TRIGGER IF EXISTS transactions_validation_trigger ON transactions;
CREATE TRIGGER transactions_validation_trigger
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION validate_transaction_data();

-- Create function for refund validation
CREATE OR REPLACE FUNCTION validate_refund_data() RETURNS TRIGGER AS $$
DECLARE
    transaction_amount DECIMAL(15,2);
    total_refunded DECIMAL(15,2);
BEGIN
    -- Get original transaction amount
    SELECT amount INTO transaction_amount 
    FROM transactions 
    WHERE id = NEW.transaction_id AND deleted_at IS NULL;
    
    IF transaction_amount IS NULL THEN
        RAISE EXCEPTION 'Transaction not found or deleted: %', NEW.transaction_id;
    END IF;
    
    -- Check if refund amount is valid
    IF NEW.amount <= 0 THEN
        RAISE EXCEPTION 'Refund amount must be positive. Got: %', NEW.amount;
    END IF;
    
    -- Get total already refunded for this transaction
    SELECT COALESCE(SUM(amount), 0) INTO total_refunded
    FROM refunds 
    WHERE transaction_id = NEW.transaction_id 
      AND status IN ('completed', 'processing')
      AND deleted_at IS NULL
      AND (TG_OP = 'INSERT' OR id != NEW.id); -- Exclude current refund for updates
    
    -- Check if total refunds would exceed transaction amount
    IF (total_refunded + NEW.amount) > transaction_amount THEN
        RAISE EXCEPTION 'Total refunds (% + %) would exceed transaction amount (%)', 
                       total_refunded, NEW.amount, transaction_amount;
    END IF;
    
    -- Validate status values
    IF NEW.status NOT IN ('pending', 'processing', 'completed', 'failed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid refund status: %', NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger for refunds
DROP TRIGGER IF EXISTS refunds_validation_trigger ON refunds;
CREATE TRIGGER refunds_validation_trigger
    BEFORE INSERT OR UPDATE ON refunds
    FOR EACH ROW EXECUTE FUNCTION validate_refund_data();

-- Add comments to functions for documentation
COMMENT ON FUNCTION audit_trigger_function() IS 'Automatically logs all changes to audited tables';
COMMENT ON FUNCTION update_user_last_login() IS 'Updates user last login time when WebAuthn credentials are used';
COMMENT ON FUNCTION update_payment_method_usage() IS 'Updates payment method last used time when transactions are created';
COMMENT ON FUNCTION validate_soft_delete() IS 'Prevents hard deletes on tables with soft delete support';
COMMENT ON FUNCTION update_updated_at() IS 'Automatically updates the updated_at timestamp';
COMMENT ON FUNCTION validate_transaction_data() IS 'Validates transaction data before insert/update';
COMMENT ON FUNCTION validate_refund_data() IS 'Validates refund data and prevents over-refunding';