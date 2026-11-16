const BITS_PER_NIBBLE: u32 = 4;
const HEX_RADIX: u32 = 16;

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum HexDecodeError {
    #[error("hex input must have an even length")]
    OddLength,
    #[error("hex input contains a non-hex character")]
    InvalidCharacter,
}

pub fn encode_hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub fn decode_hex(text: &str) -> Result<Vec<u8>, HexDecodeError> {
    let characters: Vec<char> = text.chars().collect();

    if characters.len().is_multiple_of(2) == false {
        return Err(HexDecodeError::OddLength);
    }

    let (pairs, _) = characters.as_chunks::<2>();

    pairs.iter().map(decode_hex_pair).collect()
}

fn decode_hex_pair(pair: &[char; 2]) -> Result<u8, HexDecodeError> {
    let [high_character, low_character] = pair;
    let high = high_character.to_digit(HEX_RADIX);
    let low = low_character.to_digit(HEX_RADIX);
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
    }

    #[test]
    fn rejects_odd_length() {
        assert_eq!(decode_hex("abc"), Err(HexDecodeError::OddLength));
    }

    #[test]
    fn rejects_non_hex_characters() {
        assert_eq!(decode_hex("zz"), Err(HexDecodeError::InvalidCharacter));
    }
}
