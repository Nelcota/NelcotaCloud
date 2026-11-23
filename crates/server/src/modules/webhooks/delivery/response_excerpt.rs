/// The start of a refusal is enough to see the receiver's error; the rest may hold anything.
pub const MAX_EXCERPT_BYTES: usize = 512;

/// Reads at most `MAX_EXCERPT_BYTES` of a refused request's answer. Best effort: a body that
/// cannot be read leaves no excerpt, and the attempt is recorded all the same.
pub async fn read_excerpt(mut response: reqwest::Response) -> Option<String> {
    let mut bytes: Vec<u8> = Vec::with_capacity(MAX_EXCERPT_BYTES);

    while bytes.len() < MAX_EXCERPT_BYTES {
        match response.chunk().await {
            Ok(Some(chunk)) => bytes.extend_from_slice(&chunk),
            Ok(None) => break,
            Err(error) => {
                tracing::debug!(error = %error.without_url(), "could not read a webhook refusal");
                break;
            }
        }
    }

    excerpt_of(&bytes)
}

/// Text safe to store and show: cut to the limit, invalid UTF-8 replaced, control characters
/// (other than line breaks and tabs) turned into spaces; `None` when nothing is left.
pub fn excerpt_of(bytes: &[u8]) -> Option<String> {
    let limited = bytes.get(..MAX_EXCERPT_BYTES).unwrap_or(bytes);
    let text = String::from_utf8_lossy(limited);
    let cleaned: String = text.chars().map(printable).collect();
    let trimmed = cleaned.trim();

    if trimmed.is_empty() {
        return None;
    }

    Some(trimmed.to_owned())
}

fn printable(character: char) -> char {
    if character.is_control() && character != '\n' && character != '\t' {
        return ' ';
    }

    character
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_short_text_as_it_is() {
        assert_eq!(
            excerpt_of(b"{\"error\":\"bad signature\"}"),
            Some("{\"error\":\"bad signature\"}".to_owned())
        );
    }

    #[test]
    fn cuts_long_answers_at_the_limit() {
        let long = vec![b'a'; MAX_EXCERPT_BYTES * 2];

        assert_eq!(
            excerpt_of(&long).map(|excerpt| excerpt.len()),
            Some(MAX_EXCERPT_BYTES)
        );
    }

    #[test]
    fn replaces_control_characters_and_invalid_bytes() {
        let excerpt = excerpt_of(b"line\r\nnext\x1b[31m\xff");

        assert_eq!(excerpt, Some("line \nnext [31m\u{fffd}".to_owned()));
    }

    #[test]
    fn empty_or_blank_answers_leave_nothing() {
        assert_eq!(excerpt_of(b""), None);
        assert_eq!(excerpt_of(b" \n\t "), None);
    }
}
