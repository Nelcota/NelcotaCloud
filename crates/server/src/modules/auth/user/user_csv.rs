use csv::Writer;
use time::OffsetDateTime;
use time::format_description::well_known::Rfc3339;

use crate::modules::auth::user::user_display_name::display_name;
use crate::modules::auth::user::user_export::ExportUser;
use crate::shared::http::api_error::ApiError;

pub(super) const HEADER: [&str; 11] = [
    "id",
    "email",
    "name",
    "status",
    "email_verified_at",
    "banned_at",
    "mfa_enabled",
    "has_password",
    "providers",
    "last_sign_in_at",
    "created_at",
];
/// Spreadsheets run a cell that starts with one of these as a formula.
const FORMULA_STARTS: [char; 6] = ['=', '+', '-', '@', '\t', '\r'];
/// Joins the providers in one cell; no provider name contains it.
const PROVIDER_SEPARATOR: &str = ";";

pub(super) fn write_user(writer: &mut Writer<Vec<u8>>, user: &ExportUser) -> Result<(), ApiError> {
    let fields = row_fields(user)
        .map_err(ApiError::internal)?
        .map(spreadsheet_text);
    writer.write_record(fields).map_err(ApiError::internal)
}

fn row_fields(user: &ExportUser) -> Result<[String; 11], time::error::Format> {
    Ok([
        user.id.to_string(),
        user.email.clone(),
        display_name(&user.name_fields.0)
            .unwrap_or_default()
            .to_owned(),
        status_of(user).to_owned(),
        optional_time(user.email_verified_at)?,
        optional_time(user.banned_at)?,
        user.mfa_enabled.to_string(),
        user.has_password.to_string(),
        user.providers.join(PROVIDER_SEPARATOR),
        optional_time(user.last_sign_in_at)?,
        user.created_at.format(&Rfc3339)?,
    ])
}

/// The same precedence the console shows: a block wins over an unconfirmed email.
fn status_of(user: &ExportUser) -> &'static str {
    if user.banned_at.is_some() {
        return "banned";
    }

    if user.email_verified_at.is_none() {
        return "unverified";
    }

    "active"
}

fn optional_time(moment: Option<OffsetDateTime>) -> Result<String, time::error::Format> {
    match moment {
        Some(moment) => moment.format(&Rfc3339),
        None => Ok(String::new()),
    }
}

/// A spreadsheet could execute a user's own text (their email, their name) as a formula.
fn spreadsheet_text(text: String) -> String {
    if text.starts_with(FORMULA_STARTS) {
        return format!("'{text}");
    }

    text
}

#[cfg(test)]
mod tests {
    use serde_json::json;
    use sqlx::types::Json;
    use uuid::Uuid;

    use super::*;

    use crate::modules::auth::csv_stream::csv_chunk;

    const BYTE_ORDER_MARK: &str = "\u{feff}";

    fn user_csv(users: &[ExportUser]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let mut writer = csv_chunk(true);
        writer.write_record(HEADER)?;

        for user in users {
            write_user(&mut writer, user)?;
        }

        Ok(writer.into_inner()?)
    }

    type TestResult = Result<(), Box<dyn std::error::Error>>;

    fn user(name: &str) -> Result<ExportUser, time::error::ComponentRange> {
        let created_at = OffsetDateTime::from_unix_timestamp(1_790_000_000)?;
        let metadata = match json!({ "name": name }) {
            serde_json::Value::Object(map) => map,
            _ => serde_json::Map::new(),
        };

        Ok(ExportUser {
            id: Uuid::from_u128(1),
            email: "ana@example.com".to_owned(),
            email_verified_at: None,
            banned_at: None,
            created_at,
            mfa_enabled: true,
            name_fields: Json(metadata),
            last_sign_in_at: None,
            has_password: true,
            providers: vec!["github".to_owned(), "google".to_owned()],
        })
    }

    #[test]
    fn writes_a_header_and_one_line_per_user() -> TestResult {
        let csv = user_csv(&[user("Ana Souza")?])?;
        let header = HEADER.join(",");
        let id = Uuid::from_u128(1);

        assert_eq!(
            String::from_utf8(csv)?,
            format!(
                "{BYTE_ORDER_MARK}{header}\r\n{id},ana@example.com,Ana Souza,unverified,,,true,true,github;google,,2026-09-21T14:13:20Z\r\n"
            )
        );
        Ok(())
    }

    #[test]
    fn defuses_formulas_in_user_text() -> TestResult {
        let csv = user_csv(&[user("=HYPERLINK(\"x\")")?])?;
        let records = csv::Reader::from_reader(csv.as_slice())
            .into_records()
            .collect::<Result<Vec<_>, _>>()?;
        let name = records
            .first()
            .and_then(|record| record.get(2))
            .ok_or("expected a name")?;

        assert_eq!(name, "'=HYPERLINK(\"x\")");
        Ok(())
    }
}
