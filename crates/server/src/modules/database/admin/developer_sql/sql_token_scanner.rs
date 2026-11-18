//! Moves over one token of a SQL script at a time: enough to find where statements end
//! (quotes, quoted identifiers, dollar quotes and comments hide their `;`).

/// The index after the token at `index`, and whether it is content (not a comment or space).
pub fn skip_token(script: &str, index: usize) -> (usize, bool) {
    let bytes = script.as_bytes();
    let following = bytes.get(index.saturating_add(1)).copied();

    match (bytes.get(index).copied(), following) {
        (Some(b'-'), Some(b'-')) => (line_comment_end(bytes, index), false),
        (Some(b'/'), Some(b'*')) => (block_comment_end(bytes, index), false),
        (Some(b'\''), _) => (
            quoted_end(bytes, index, is_escape_string(bytes, index)),
            true,
        ),
        (Some(b'"'), _) => (identifier_end(bytes, index), true),
        (Some(b'$'), _) => (dollar_quote_end(script, index), true),
        (Some(byte), _) => (index.saturating_add(1), byte.is_ascii_whitespace() == false),
        (None, _) => (index.saturating_add(1), false),
    }
}

fn line_comment_end(bytes: &[u8], start: usize) -> usize {
    let rest = bytes.get(start..).unwrap_or_default();

    rest.iter()
        .position(|&byte| byte == b'\n')
        .map_or(bytes.len(), |offset| start.saturating_add(offset))
}

/// Block comments nest in Postgres: `/* a /* b */ c */` is one comment.
fn block_comment_end(bytes: &[u8], start: usize) -> usize {
    let mut depth: usize = 0;
    let mut index = start;

    while let Some(&byte) = bytes.get(index) {
        let next = bytes.get(index.saturating_add(1)).copied();

        match (byte, next) {
            (b'/', Some(b'*')) => depth = depth.saturating_add(1),
            (b'*', Some(b'/')) => depth = depth.saturating_sub(1),
            _ => {
                index = index.saturating_add(1);
                continue;
            }
        }

        index = index.saturating_add(2);

        if depth == 0 {
            return index;
        }
    }

    bytes.len()
}

/// `E'it\'s'` takes backslash escapes; in any string, `''` is a quote.
fn quoted_end(bytes: &[u8], open: usize, has_backslash_escapes: bool) -> usize {
    let mut index = open.saturating_add(1);

    while let Some(&byte) = bytes.get(index) {
        let next = bytes.get(index.saturating_add(1)).copied();

        match (byte, next) {
            (b'\\', _) if has_backslash_escapes => index = index.saturating_add(2),
            (b'\'', Some(b'\'')) => index = index.saturating_add(2),
            (b'\'', _) => return index.saturating_add(1),
            _ => index = index.saturating_add(1),
        }
    }

    bytes.len()
}

fn is_escape_string(bytes: &[u8], open: usize) -> bool {
    let Some(prefix_index) = open.checked_sub(1) else {
        return false;
    };
    let prefix = bytes.get(prefix_index).copied();
    let before_prefix = prefix_index
        .checked_sub(1)
        .and_then(|index| bytes.get(index).copied());

    matches!(prefix, Some(b'e' | b'E')) && before_prefix.is_some_and(is_identifier_byte) == false
}

/// `"a""b"` is one identifier.
fn identifier_end(bytes: &[u8], open: usize) -> usize {
    let mut index = open.saturating_add(1);

    while let Some(&byte) = bytes.get(index) {
        let next = bytes.get(index.saturating_add(1)).copied();

        match (byte, next) {
            (b'"', Some(b'"')) => index = index.saturating_add(2),
            (b'"', _) => return index.saturating_add(1),
            _ => index = index.saturating_add(1),
        }
    }

    bytes.len()
}

/// `$$…$$` or `$tag$…$tag$`; a `$` that opens no tag (`$1`) is a single character.
fn dollar_quote_end(script: &str, open: usize) -> usize {
    let after_open = open.saturating_add(1);
    let rest = script.get(after_open..).unwrap_or_default();
    let tag_length = rest
        .bytes()
        .take_while(|&byte| is_identifier_byte(byte))
        .count();
    let starts_with_digit = rest
        .bytes()
        .next()
        .is_some_and(|byte| byte.is_ascii_digit());
    let close_index = after_open.saturating_add(tag_length);

    if starts_with_digit || script.as_bytes().get(close_index) != Some(&b'$') {
        return after_open;
    }

    let body_start = close_index.saturating_add(1);
    let Some(tag) = script.get(open..body_start) else {
        return after_open;
    };
    let body = script.get(body_start..).unwrap_or_default();

    body.find(tag).map_or(script.len(), |offset| {
        body_start.saturating_add(offset).saturating_add(tag.len())
    })
}

pub fn is_identifier_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || byte == b'_'
}
