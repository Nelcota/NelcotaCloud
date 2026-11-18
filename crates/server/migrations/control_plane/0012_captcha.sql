-- A project's Cloudflare Turnstile widget. The site key is public (the app renders the widget
-- with it); the secret key is encrypted, bound to the tenant.
CREATE TABLE tenant_captcha_settings (
    tenant_id UUID PRIMARY KEY REFERENCES tenants (id) ON DELETE CASCADE,
    site_key TEXT NOT NULL,
    secret_key_ciphertext BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
