use reqwest::StatusCode;
use tokio::sync::Mutex;

use super::metrics::{Load, exercise, status};
use crate::support::{CreatedTenant, TestResult, TestServer, random_slug};

pub async fn exercise_provisioning() -> TestResult {
    let server = TestServer::start().await?;
    let projects = Mutex::new(Vec::new());
    let trial = exercise("tenants-provision", Load::burst(24, 12), async |_| {
        let slug = random_slug();
        let response = server
            .request_tenant(&slug, Some(server.admin_token()))
            .await?;

        if response.status() == StatusCode::CREATED {
            let project = response.json::<CreatedTenant>().await?;
            projects.lock().await.push(project);

            return Ok("201".to_owned());
        }

        status(response).await
    })
    .await;
    let projects = projects.into_inner();
    let trial = trial?;
    let project_count = projects.len();

    for project in projects {
        assert!(server.tenant_database_exists(&project.slug).await?);
        server.drop_tenant(&project).await?;
    }

    trial.require_only(&["201", "503 service_busy"])?;
    assert!(project_count >= 2);
    assert_eq!(trial.count("201"), project_count);

    Ok(())
}
