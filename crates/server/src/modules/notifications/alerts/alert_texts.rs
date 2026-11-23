use uuid::Uuid;

use crate::modules::notifications::alerts::usage_alert_checks::percent_of;
use crate::modules::notifications::delivery::alert_dispatch::AlertDraft;

/// Bytes in a megabyte, for storage figures.
const MEGABYTE: i64 = 1024 * 1024;

pub fn data_api_errors_text(project: (Uuid, &str), requests: i64, errors: i64) -> AlertDraft {
    let (tenant_id, name) = project;
    let percent = percent_of(errors, requests);

    AlertDraft {
        subject: format!("Erros na Data API do projeto {name}"),
        heading: "Erros na Data API".to_owned(),
        message: format!(
            "A Data API do projeto {name} respondeu {errors} erros de servidor na última hora ({percent}% das requisições)."
        ),
        action_label: "Ver as métricas".to_owned(),
        path: format!("projects/{tenant_id}/database"),
    }
}

pub fn login_failures_text(project: (Uuid, &str), failures: i64) -> AlertDraft {
    let (tenant_id, name) = project;

    AlertDraft {
        subject: format!("Muitos logins recusados no projeto {name}"),
        heading: "Muitos logins recusados".to_owned(),
        message: format!(
            "O projeto {name} recusou {failures} logins com senha errada nos últimos 15 minutos. Alguém pode estar tentando adivinhar senhas."
        ),
        action_label: "Ver a atividade".to_owned(),
        path: format!("projects/{tenant_id}/activity"),
    }
}

pub fn storage_text(project: (Uuid, &str), (bytes, files): (i64, i64)) -> AlertDraft {
    let (tenant_id, name) = project;
    let megabytes = bytes.checked_div(MEGABYTE).unwrap_or(0);

    AlertDraft {
        subject: format!("O armazenamento do projeto {name} está quase cheio"),
        heading: "Armazenamento quase cheio".to_owned(),
        message: format!(
            "O projeto {name} usa {megabytes} MB em {files} arquivos, mais de 80% do limite. Novos envios serão recusados quando ele encher."
        ),
        action_label: "Ver os arquivos".to_owned(),
        path: format!("projects/{tenant_id}/storage"),
    }
}

pub fn webhook_text(project: (Uuid, &str), endpoint_id: Uuid, is_paused: bool) -> AlertDraft {
    let (tenant_id, name) = project;
    let path = format!("projects/{tenant_id}/webhooks/{endpoint_id}");

    if is_paused {
        return AlertDraft {
            subject: format!("Pausamos um webhook do projeto {name}"),
            heading: "Webhook pausado".to_owned(),
            message: format!(
                "Um endpoint de webhook do projeto {name} recusou as entregas por 5 dias e foi pausado."
            ),
            action_label: "Reativar o endpoint".to_owned(),
            path,
        };
    }

    AlertDraft {
        subject: format!("Um webhook do projeto {name} está falhando"),
        heading: "Webhook falhando".to_owned(),
        message: format!(
            "Um endpoint de webhook do projeto {name} recusa as entregas há mais de 6 horas."
        ),
        action_label: "Ver o endpoint".to_owned(),
        path,
    }
}

/// What "Enviar teste" sends: proof the channel works, pointing at the notifications page.
pub fn test_text(project: (Uuid, &str)) -> AlertDraft {
    let (tenant_id, name) = project;

    AlertDraft {
        subject: format!("Teste de notificação do projeto {name}"),
        heading: "Canal funcionando".to_owned(),
        message: format!("Os avisos do projeto {name} vão chegar por aqui."),
        action_label: "Ver as notificações".to_owned(),
        path: format!("projects/{tenant_id}/settings"),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn texts_name_the_project_and_link_to_its_page() {
        let project = (Uuid::nil(), "Loja");
        let errors = data_api_errors_text(project, 400, 40);
        let storage = storage_text(project, (900 * MEGABYTE, 12));

        assert!(errors.message.contains("40 erros"));
        assert!(errors.message.contains("10%"));
        assert_eq!(errors.path, format!("projects/{}/database", Uuid::nil()));
        assert!(storage.message.contains("900 MB em 12 arquivos"));
        assert_eq!(
            webhook_text(project, Uuid::nil(), true).heading,
            "Webhook pausado"
        );
    }
}
