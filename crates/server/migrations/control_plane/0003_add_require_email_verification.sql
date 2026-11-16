-- When true, password logins need a verified email and signup never reveals existing accounts.
ALTER TABLE tenants ADD COLUMN require_email_verification BOOLEAN NOT NULL DEFAULT TRUE;
