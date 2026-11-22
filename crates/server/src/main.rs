#![forbid(unsafe_code)]

use server::app_config::AppConfig;
use server::startup::readiness_probe::check_readiness;
use server::startup::server::run_server;
use server::startup::startup_error::StartupError;
use server::startup::webhook_worker_config::WebhookWorkerConfig;
use server::startup::webhook_worker_process::run_webhook_worker;
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

    let arguments: Vec<_> = std::env::args_os().skip(1).collect();

    match arguments.as_slice() {
        [] => run_server(AppConfig::from_environment()?).await,
        [command] if command == "--check-ready" => {
            let bind_address =
                std::env::var("BIND_ADDRESS").map_err(|_| StartupError::ReadinessAddress)?;
            let client_ip_header = std::env::var("CLIENT_IP_HEADER").ok();

            check_readiness(&bind_address, client_ip_header.as_deref()).await
        }
        [command] if command == "--webhook-worker" => {
            run_webhook_worker(&WebhookWorkerConfig::from_environment()?).await
        }
        _ => Err(StartupError::InvalidArguments),
    }
}
