use base16ct::{lower, mixed};

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum HexDecodeError {
    #[error("hex input must have an even length")]
    OddLength,
    #[error("hex input contains a non-hex character")]
    InvalidCharacter,
}

/// Lowercase hex in a single allocation sized up front.
pub fn encode_hex(bytes: &[u8]) -> String {
    lower::encode_string(bytes)
}

/// Decodes straight from the input bytes; any non-ASCII byte is simply not a hex digit.
pub fn decode_hex(text: &str) -> Result<Vec<u8>, HexDecodeError> {
    let bytes = text.as_bytes();

    if bytes.len().is_multiple_of(2) == false {
        return Err(HexDecodeError::OddLength);
    }

    mixed::decode_vec(bytes).map_err(|_| HexDecodeError::InvalidCharacter)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_bytes() {
        let bytes = [0x00, 0x0f, 0xa5, 0xff];

        assert_eq!(encode_hex(&bytes), "000fa5ff");
        assert_eq!(decode_hex("000fa5ff"), Ok(bytes.to_vec()));
        assert_eq!(decode_hex("000FA5FF"), Ok(bytes.to_vec()));
    }

    #[test]
    fn rejects_odd_length() {
        assert_eq!(decode_hex("abc"), Err(HexDecodeError::OddLength));
    }

    #[test]
    fn rejects_non_hex_characters() {
        assert_eq!(decode_hex("zz"), Err(HexDecodeError::InvalidCharacter));
        // Two bytes of one non-ASCII character: still an even length, still not hex.
        assert_eq!(decode_hex("é"), Err(HexDecodeError::InvalidCharacter));
    }
}
