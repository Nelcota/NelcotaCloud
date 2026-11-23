use std::borrow::Cow;

use csv::Writer;

use crate::modules::auth::audit::audit_export::AuditExportRow;
use crate::shared::http::api_error::ApiError;

pub(super) const HEADER: [&str; 12] = [
    "occurred_at",
    "action",
    "email",
    "user_id",
    "actor",
    "actor_account_id",
    "login_method",
    "ip_address",
    "failure_reason",
    "user_agent",
    "request_id",
    "details",
];
/// Spreadsheets run a cell that starts with one of these as a formula.
const FORMULA_STARTS: [char; 6] = ['=', '+', '-', '@', '\t', '\r'];

pub(super) fn write_event(
    writer: &mut Writer<Vec<u8>>,
    row: &AuditExportRow,
) -> Result<(), ApiError> {
    let fields = row_fields(row).map(|field| spreadsheet_text(field.unwrap_or_default()));
    writer
        .write_record(fields.iter().map(|field| field.as_bytes()))
        .map_err(ApiError::internal)
}

fn row_fields(row: &AuditExportRow) -> [Option<&str>; 12] {
    [
        Some(row.occurred_at.as_str()),
        Some(row.action.as_str()),
        row.email.as_deref(),
        row.user_id.as_deref(),
        Some(row.actor.as_str()),
        row.actor_account_id.as_deref(),
        row.login_method.as_deref(),
        row.ip_address.as_deref(),
        row.failure_reason.as_deref(),
        row.user_agent.as_deref(),
        row.request_id.as_deref(),
        row.details.as_deref(),
    ]
}

/// A spreadsheet could execute untrusted audit text as a formula even in a quoted CSV cell.
fn spreadsheet_text(text: &str) -> Cow<'_, str> {
    if text.starts_with(FORMULA_STARTS) {
        return Cow::Owned(format!("'{text}"));
    }

    Cow::Borrowed(text)
}

#[cfg(test)]
mod tests {
    use super::*;

    use crate::modules::auth::csv_stream::csv_chunk;

    const BYTE_ORDER_MARK: &str = "\u{feff}";

    fn audit_csv(rows: &[AuditExportRow]) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        let mut writer = csv_chunk(true);
        writer.write_record(HEADER)?;

        for row in rows {
            write_event(&mut writer, row)?;
        }

        Ok(writer.into_inner()?)
    }

    fn row(email: Option<&str>) -> AuditExportRow {
        AuditExportRow {
            occurred_at: "2026-11-18T14:30:00Z".to_owned(),
            action: "login_failed".to_owned(),
            email: email.map(str::to_owned),
            user_id: None,
            actor: "user".to_owned(),
            actor_account_id: None,
            login_method: Some("password".to_owned()),
            ip_address: Some("45.83.12.9".to_owned()),
            failure_reason: Some("unknown_email".to_owned()),
            user_agent: None,
            request_id: None,
            details: None,
        }
    }

    #[test]
    fn writes_a_header_and_one_line_per_row() -> Result<(), Box<dyn std::error::Error>> {
        let csv = audit_csv(&[row(Some("ana@acme.com"))])?;
        let header = HEADER.join(",");

        assert_eq!(
            csv,
            format!(
                "{BYTE_ORDER_MARK}{header}\r\n2026-11-18T14:30:00Z,login_failed,ana@acme.com,,user,,password,45.83.12.9,unknown_email,,,\r\n"
            ).as_bytes()
        );
        Ok(())
    }

    #[test]
    fn writes_only_the_header_without_rows() -> Result<(), Box<dyn std::error::Error>> {
        let header = HEADER.join(",");

        assert_eq!(
            audit_csv(&[])?,
            format!("{BYTE_ORDER_MARK}{header}\r\n").as_bytes()
        );
        Ok(())
    }

    #[test]
    fn preserves_fields_with_delimiters_quotes_and_line_breaks()
    -> Result<(), Box<dyn std::error::Error>> {
        let fields = ["a,b", "say \"hi\"", "a\nb", "plain"];
        let rows = fields.map(|text| row(Some(text)));
        let csv = audit_csv(&rows)?;
        let records = csv::Reader::from_reader(csv.as_slice())
            .into_records()
            .collect::<Result<Vec<_>, _>>()?;

        assert!(
            records
                .iter()
                .map(|record| record.get(2))
                .eq(fields.map(Some))
        );
        Ok(())
    }

    #[test]
    fn defuses_cells_a_spreadsheet_would_run() {
        assert_eq!(spreadsheet_text("=HYPERLINK(\"x\")"), "'=HYPERLINK(\"x\")");
        assert_eq!(spreadsheet_text("+1"), "'+1");
        assert_eq!(spreadsheet_text("@sum"), "'@sum");
    }
}
