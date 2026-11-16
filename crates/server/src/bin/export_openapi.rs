#![forbid(unsafe_code)]

use std::error::Error;
use std::path::Path;

use server::api_doc::{OPENAPI_FILE, openapi_document};

/// Writes the API description the console generates its types from.
fn main() -> Result<(), Box<dyn Error>> {
    let document = openapi_document().to_pretty_json()?;
    let path = Path::new(env!("CARGO_MANIFEST_DIR")).join(OPENAPI_FILE);
    std::fs::write(path, format!("{document}\n"))?;

    Ok(())
}
