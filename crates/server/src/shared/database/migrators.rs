use sqlx::migrate::Migrator;

pub static CONTROL_PLANE_MIGRATOR: Migrator = sqlx::migrate!("./migrations/control_plane");

pub static TENANT_MIGRATOR: Migrator = sqlx::migrate!("./migrations/tenant");
