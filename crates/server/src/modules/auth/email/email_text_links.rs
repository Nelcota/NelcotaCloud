use validator::ValidationError;

const SCHEME_SEPARATOR: &str = "://";
const WWW_PREFIX: &str = "www.";
/// Top-level domains are letters only, from `io` to the longest generic ones.
const TOP_LEVEL_DOMAIN_LENGTHS: std::ops::RangeInclusive<usize> = 2..=24;
const WORD_PUNCTUATION: &[char] = &[
    ',', ';', ':', '!', '?', '(', ')', '[', ']', '"', '\'', '<', '>', '.',
];

/// Refuses text with a link or a domain in it (`https://…`, `www.…`, `evil.com`).
///
/// A project's email words are sent from the platform's own address, with the platform's
/// reputation: only the button carries a link, and it is always the platform's, so custom
/// text cannot point readers anywhere else (phishing through someone else's mail server).
pub fn check_no_links(text: &str) -> Result<(), ValidationError> {
    if contains_link(&text.to_lowercase()) {
        return Err(ValidationError::new("link").with_message(
            "must not contain links or domain names: the email's button carries the link".into(),
        ));
    }

    Ok(())
}

fn contains_link(text: &str) -> bool {
    if text.contains(SCHEME_SEPARATOR) || text.contains(WWW_PREFIX) {
        return true;
    }

    text.split_whitespace()
        .map(|word| word.trim_matches(WORD_PUNCTUATION))
        .any(is_domain)
}

/// `name.tld` or deeper: every label made of letters, digits or `-`, the last letters only.
fn is_domain(word: &str) -> bool {
    let labels: Vec<&str> = word.split('.').collect();
    let top_level = match labels.last() {
        Some(top_level) => top_level,
        None => return false,
    };

    if labels.len() < 2 || TOP_LEVEL_DOMAIN_LENGTHS.contains(&top_level.len()) == false {
        return false;
    }

    let is_label = |label: &&str| {
        label.is_empty() == false
            && label
                .chars()
                .all(|character| character.is_alphanumeric() || character == '-')
    };

    top_level.chars().all(char::is_alphabetic) && labels.iter().all(is_label)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn refuses_links_and_domains() {
        for text in [
            "Open https://evil.example now",
            "Visit www.evil",
            "Go to evil.com.",
            "Write to support at help.acme-corp.io today",
            "(see Pay.Me)",
        ] {
            assert!(check_no_links(text).is_err(), "{text}");
        }
    }

    #[test]
    fn accepts_ordinary_text() {
        for text in [
            "Confirm your email for {app_name}.",
            "The link expires in 1 hour.\nIf it was not you, ignore this email.",
            "Version 2.0 is out, e.g. for teams",
            "Olá! Confirme seu e-mail.",
        ] {
            assert!(check_no_links(text).is_ok(), "{text}");
        }
    }
}
