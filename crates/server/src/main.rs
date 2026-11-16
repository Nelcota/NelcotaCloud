#![forbid(unsafe_code)]

use server::app_config::AppConfig;
use server::startup::server::run_server;
use server::startup::startup_error::StartupError;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), StartupError> {
    // A missing .env file is normal in production, where variables come from the environment.
    if let Err(error) = dotenvy::dotenv()
        && error.not_found() == false
    {
        return Err(StartupError::EnvironmentFile(error));
    }

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env())
        .init();

    let config = AppConfig::from_environment()?;

    run_server(config).await
}
