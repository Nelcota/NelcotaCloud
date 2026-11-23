-- Old OAuth codes cannot be checked against the provider settings that issued them.
DELETE FROM one_time_tokens WHERE purpose = 'oauth_login';

ALTER TABLE one_time_tokens
    ADD COLUMN oauth_provider TEXT,
    ADD COLUMN oauth_provider_revision UUID,
    ADD CONSTRAINT one_time_token_oauth_provider_context CHECK (
        (purpose = 'oauth_login' AND oauth_provider IS NOT NULL
            AND oauth_provider IN ('google', 'github') AND oauth_provider_revision IS NOT NULL)
        OR (purpose <> 'oauth_login' AND oauth_provider IS NULL AND oauth_provider_revision IS NULL)
    );
