-- One account per provider per user, enforced by the database: two concurrent OAuth logins
-- with different provider accounts and the same email cannot both link to one user.
CREATE UNIQUE INDEX identities_user_provider_idx ON identities (user_id, provider);
