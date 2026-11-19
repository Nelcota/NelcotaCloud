use std::time::Duration;

use crate::shared::rate_limiting::quota_spec::QuotaSpec;

/// Wrong passwords for one account from one network: 10, then one every 30 seconds.
pub const LOGIN_PER_EMAIL_FROM_NETWORK: QuotaSpec = QuotaSpec {
    burst: 10,
    replenish_every: Duration::from_secs(30),
};
/// Wrong passwords for one account from anywhere: about 100 an hour.
pub const LOGIN_PER_EMAIL: QuotaSpec = QuotaSpec {
    burst: 100,
    replenish_every: Duration::from_secs(36),
};
pub const LOGIN_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 30,
    replenish_every: Duration::from_secs(2),
};
/// Argon2 runs (login, signup) one client causes across every project.
pub const PASSWORD_WORK_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 60,
    replenish_every: Duration::from_secs(1),
};
/// Recovery and verification emails: 3 in a row per address, then one every 5 minutes.
pub const EMAIL_PER_ADDRESS: QuotaSpec = QuotaSpec {
    burst: 3,
    replenish_every: Duration::from_secs(300),
};
pub const EMAIL_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 10,
    replenish_every: Duration::from_secs(30),
};
/// Emails to one address across every project: 5, then one every 10 minutes.
pub const EMAIL_PER_RECIPIENT: QuotaSpec = QuotaSpec {
    burst: 5,
    replenish_every: Duration::from_secs(600),
};
/// Auth emails one project sends: about 1000 an hour, so nobody relays spam through the
/// platform by spreading requests over many addresses and networks.
pub const EMAIL_PER_PROJECT: QuotaSpec = QuotaSpec {
    burst: 1000,
    replenish_every: Duration::from_millis(3_600),
};
/// Signup: each one costs an Argon2 run and may send an email.
pub const SIGNUP_PER_EMAIL: QuotaSpec = QuotaSpec {
    burst: 3,
    replenish_every: Duration::from_secs(300),
};
pub const SIGNUP_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 10,
    replenish_every: Duration::from_secs(60),
};
/// MFA codes: six digits, so an account gets few guesses before slowing down.
pub const MFA_PER_ACCOUNT: QuotaSpec = QuotaSpec {
    burst: 5,
    replenish_every: Duration::from_secs(60),
};
pub const MFA_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 20,
    replenish_every: Duration::from_secs(6),
};
/// Redeeming a token or code (refresh, email links, OAuth codes, logout).
///
/// Each one opens the project's database. 300, then 20 per second: enough for thousands of users renewing their
/// sessions behind one NAT, or an app's server renewing them for its users.
pub const TOKEN_REDEMPTION_PER_CLIENT_IP: QuotaSpec = QuotaSpec {
    burst: 300,
    replenish_every: Duration::from_millis(50),
};
/// Profile changes: each one sends a `user.updated` webhook.
pub const PROFILE_UPDATE_PER_ACCOUNT: QuotaSpec = QuotaSpec {
    burst: 20,
    replenish_every: Duration::from_secs(3),
};
/// Profile photos: decoding an image is heavy and each change sends a webhook.
pub const AVATAR_CHANGE_PER_ACCOUNT: QuotaSpec = QuotaSpec {
    burst: 5,
    replenish_every: Duration::from_secs(60),
};
