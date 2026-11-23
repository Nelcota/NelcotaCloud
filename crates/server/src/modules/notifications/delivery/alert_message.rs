/// What an alert says, the same on every channel; `link` opens the console page to act on.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AlertMessage {
    pub subject: String,
    pub heading: String,
    pub message: String,
    pub action_label: String,
    pub link: String,
}

const MAX_CHAT_TEXT: usize = 1800;

/// Discord's `content`: the heading in bold, the message and the link on their own lines.
pub fn discord_text(alert: &AlertMessage) -> String {
    let text = format!(
        "**{}**\n{}\n{}: {}",
        alert.heading, alert.message, alert.action_label, alert.link
    );

    clipped(&text)
}

/// Slack's `text`, with the link labelled in Slack's `<url|label>` form.
pub fn slack_text(alert: &AlertMessage) -> String {
    let text = format!(
        "*{}*\n{}\n<{}|{}>",
        alert.heading, alert.message, alert.link, alert.action_label
    );

    clipped(&text)
}

/// Both services refuse long messages (Discord at 2000 characters); alerts stay well below.
fn clipped(text: &str) -> String {
    text.chars().take(MAX_CHAT_TEXT).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn alert() -> AlertMessage {
        AlertMessage {
            subject: "Assunto".to_owned(),
            heading: "Erros na Data API".to_owned(),
            message: "Muitos erros.".to_owned(),
            action_label: "Ver métricas".to_owned(),
            link: "https://console.test/projects/p/database".to_owned(),
        }
    }

    #[test]
    fn chat_texts_carry_the_heading_message_and_link() {
        assert_eq!(
            discord_text(&alert()),
            "**Erros na Data API**\nMuitos erros.\nVer métricas: https://console.test/projects/p/database"
        );
        assert_eq!(
            slack_text(&alert()),
            "*Erros na Data API*\nMuitos erros.\n<https://console.test/projects/p/database|Ver métricas>"
        );
    }

    #[test]
    fn long_texts_are_clipped() {
        let mut long = alert();
        long.message = "x".repeat(5000);

        assert_eq!(discord_text(&long).chars().count(), MAX_CHAT_TEXT);
    }
}
