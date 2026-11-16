const HEX_DIGITS: &[u8; 16] = b"0123456789abcdef";
const BITS_PER_NIBBLE: u32 = 4;
const LOW_NIBBLE_MASK: u8 = 0x0f;
const HEX_RADIX: u32 = 16;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum HexDecodeError {
    #[error("hex input must have an even length")]
    OddLength,
    #[error("hex input contains a non-hex character")]
    InvalidCharacter,
}

/// Lowercase hex in a single allocation sized up front.
pub fn encode_hex(bytes: &[u8]) -> String {
    let mut encoded = String::with_capacity(bytes.len().saturating_mul(2));

    for byte in bytes {
        encoded.push(hex_digit(byte >> BITS_PER_NIBBLE));
        encoded.push(hex_digit(byte & LOW_NIBBLE_MASK));
    }

    encoded
}

/// Decodes straight from the input bytes; any non-ASCII byte is simply not a hex digit.
pub fn decode_hex(text: &str) -> Result<Vec<u8>, HexDecodeError> {
    let bytes = text.as_bytes();

    if bytes.len().is_multiple_of(2) == false {
        return Err(HexDecodeError::OddLength);
    }

    let (pairs, _) = bytes.as_chunks::<2>();

    pairs.iter().map(decode_hex_pair).collect()
}

/// `nibble` is always below 16; the fallback only satisfies the no-panic indexing rule.
fn hex_digit(nibble: u8) -> char {
    let digit = HEX_DIGITS.get(usize::from(nibble)).copied().unwrap_or(b'0');

    char::from(digit)
}

fn decode_hex_pair(pair: &[u8; 2]) -> Result<u8, HexDecodeError> {
    let [high_byte, low_byte] = *pair;
    let high = char::from(high_byte).to_digit(HEX_RADIX);
    let low = char::from(low_byte).to_digit(HEX_RADIX);
    let (Some(high), Some(low)) = (high, low) else {
        return Err(HexDecodeError::InvalidCharacter);
    };
    let combined = (high << BITS_PER_NIBBLE) | low;

    u8::try_from(combined).map_err(|_| HexDecodeError::InvalidCharacter)
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
