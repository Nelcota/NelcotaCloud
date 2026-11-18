-- `user_metadata` is written by the user (profile data); `app_metadata` only by the tenant's
-- admins (roles, plans) and is copied into access tokens, so apps can authorize from the token.
ALTER TABLE users
    ADD COLUMN user_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(user_metadata) = 'object'),
    ADD COLUMN app_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(app_metadata) = 'object');
