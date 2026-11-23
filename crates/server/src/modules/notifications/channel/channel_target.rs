use reqwest::Url;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::modules::auth::integration::team_notifications::EmailAddress;

/// How a channel delivers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum ChannelKind {
    Email,
    Discord,
    Slack,
}

impl ChannelKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Email => "email",
            Self::Discord => "discord",
            Self::Slack => "slack",
        }
    }

    pub fn parse(raw: &str) -> Option<Self> {
        [Self::Email, Self::Discord, Self::Slack]
            .into_iter()
            .find(|kind| kind.as_str() == raw)
    }
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum InvalidChannelTarget {
    #[error("invalid email address")]
    Email,
    #[error("not a Discord webhook URL (https://discord.com/api/webhooks/...)")]
    Discord,
    #[error("not a Slack webhook URL (https://hooks.slack.com/services/...)")]
    Slack,
}

/// A destination that passed its kind's rule, and the short text the console shows for it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChannelTarget {
    pub kind: ChannelKind,
    pub value: String,
    pub hint: String,
}

const DISCORD_HOSTS: [&str; 2] = ["discord.com", "discordapp.com"];
const DISCORD_PATH: &str = "/api/webhooks/";
const SLACK_HOST: &str = "hooks.slack.com";
const SLACK_PATH: &str = "/services/";
/// Characters of the URL's secret path kept in the hint, so owners tell two hooks apart.
const HINT_SUFFIX_LENGTH: usize = 4;

/// Chat webhooks only go to Discord's and Slack's own hosts over https: a fixed allow list
/// instead of an address check, so a channel can never point at a private server.
pub fn parse_target(kind: ChannelKind, raw: &str) -> Result<ChannelTarget, InvalidChannelTarget> {
    let trimmed = raw.trim();

    match kind {
        ChannelKind::Email => parse_email(trimmed),
        ChannelKind::Discord => parse_hook(kind, trimmed).ok_or(InvalidChannelTarget::Discord),
        ChannelKind::Slack => parse_hook(kind, trimmed).ok_or(InvalidChannelTarget::Slack),
    }
}

fn parse_email(raw: &str) -> Result<ChannelTarget, InvalidChannelTarget> {
    let email = EmailAddress::parse(raw).map_err(|_| InvalidChannelTarget::Email)?;
    let value = email.as_str().to_owned();

    Ok(ChannelTarget {
        kind: ChannelKind::Email,
        hint: value.clone(),
        value,
    })
}

fn parse_hook(kind: ChannelKind, raw: &str) -> Option<ChannelTarget> {
    let url = Url::parse(raw).ok()?;
    let host = url.host_str()?;
    let path = url.path();

    if url.scheme() != "https" || url.port().is_some() || url.username().is_empty() == false {
        return None;
    }

    if is_allowed(kind, host, path) == false {
        return None;
    }

    Some(ChannelTarget {
        kind,
        hint: hook_hint(host, path),
        value: url.to_string(),
    })
}

fn is_allowed(kind: ChannelKind, host: &str, path: &str) -> bool {
    match kind {
        ChannelKind::Discord => {
            DISCORD_HOSTS.contains(&host) && has_secret_after(path, DISCORD_PATH)
        }
        ChannelKind::Slack => host == SLACK_HOST && has_secret_after(path, SLACK_PATH),
        ChannelKind::Email => false,
    }
}

fn has_secret_after(path: &str, prefix: &str) -> bool {
    path.strip_prefix(prefix)
        .is_some_and(|rest| rest.trim_matches('/').is_empty() == false)
}

/// `hooks.slack.com/…a1b2`: the host and the last characters, never the secret path.
fn hook_hint(host: &str, path: &str) -> String {
    let characters: Vec<char> = path.trim_end_matches('/').chars().collect();
    let start = characters.len().saturating_sub(HINT_SUFFIX_LENGTH);
    let suffix: String = characters.get(start..).unwrap_or_default().iter().collect();

    format!("{host}/…{suffix}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn emails_are_normalized_and_shown_whole() {
        let target = parse_target(ChannelKind::Email, " Ops@Example.com ");

        assert_eq!(
            target.map(|target| target.hint),
            Ok("ops@example.com".to_owned())
        );
        assert_eq!(
            parse_target(ChannelKind::Email, "not an email"),
            Err(InvalidChannelTarget::Email)
        );
    }

    #[test]
    fn chat_hooks_must_be_the_services_own_https_urls() {
        let discord = "https://discord.com/api/webhooks/123/abcdWXYZ";
        let slack = "https://hooks.slack.com/services/T0/B0/secretKEY9";

        assert!(parse_target(ChannelKind::Discord, discord).is_ok());
        assert!(parse_target(ChannelKind::Slack, slack).is_ok());
        for refused in [
            "http://discord.com/api/webhooks/1/a",
            "https://discord.com.evil.test/api/webhooks/1/a",
            "https://discord.com:8443/api/webhooks/1/a",
            "https://discord.com/api/webhooks/",
            "https://user@discord.com/api/webhooks/1/a",
            "https://127.0.0.1/api/webhooks/1/a",
        ] {
            assert!(
                parse_target(ChannelKind::Discord, refused).is_err(),
                "{refused}"
            );
        }

        assert!(parse_target(ChannelKind::Slack, discord).is_err());
    }

    #[test]
    fn hints_keep_the_host_and_the_last_characters() {
        let target = parse_target(
            ChannelKind::Slack,
            "https://hooks.slack.com/services/T0/B0/secretKEY9",
        );

        assert_eq!(
            target.map(|target| target.hint),
            Ok("hooks.slack.com/…KEY9".to_owned())
        );
    }
}
