use serde::Deserialize;
use utoipa::ToSchema;
use validator::Validate;

use crate::modules::database::admin::table_definition::table_ddl::parse_name;
use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::tenants::database::database_roles::{ANON_ROLE, AUTHENTICATED_ROLE};

/// Bounds the expressions a policy carries.
const MAX_EXPRESSION_LENGTH: usize = 4_000;

/// A row level security policy: which requests (`roles`) may run `command` on which rows.
#[derive(Debug, Deserialize, ToSchema, Validate)]
pub struct CreatePolicyRequest {
    #[validate(length(min = 1, max = 63))]
    pub name: String,
    /// `all`, `select`, `insert`, `update` or `delete`.
    pub command: String,
    /// `anon` and/or `authenticated`.
    pub roles: Vec<String>,
    /// SQL condition on existing rows, such as `user_id = auth.uid()`.
    pub using: Option<String>,
    /// SQL condition on written rows.
    pub with_check: Option<String>,
}

/// `CREATE POLICY "name" ON public."t" FOR <command> TO <roles> USING (...) WITH CHECK (...)`.
///
/// The conditions are SQL the project member writes: they run as the developer role, which
/// can already run any SQL on the project's database, so they need no further restriction.
pub fn create_policy_sql(
    table: &str,
    request: &CreatePolicyRequest,
) -> Result<String, DatabaseRejection> {
    let table = parse_name(table)?;
    let name = parse_name(&request.name)?;
    let command = policy_command(&request.command)?;
    let roles = policy_roles(&request.roles)?;
    let mut sql = format!(
        "CREATE POLICY {} ON {} FOR {command} TO {roles}",
        name.quoted(),
        table.in_public()
    );

    if let Some(using) = condition(request.using.as_deref())? {
        sql.push_str(&format!(" USING ({using})"));
    }

    if let Some(with_check) = condition(request.with_check.as_deref())? {
        sql.push_str(&format!(" WITH CHECK ({with_check})"));
    }

    Ok(sql)
}

pub fn drop_policy_sql(table: &str, policy: &str) -> Result<String, DatabaseRejection> {
    Ok(format!(
        "DROP POLICY {} ON {}",
        parse_name(policy)?.quoted(),
        parse_name(table)?.in_public()
    ))
}

fn policy_command(command: &str) -> Result<&'static str, DatabaseRejection> {
    match command {
        "all" => Ok("ALL"),
        "select" => Ok("SELECT"),
        "insert" => Ok("INSERT"),
        "update" => Ok("UPDATE"),
        "delete" => Ok("DELETE"),
        other => Err(DatabaseRejection::invalid_query(format!(
            "unknown policy command {other}"
        ))),
    }
}

fn policy_roles(roles: &[String]) -> Result<String, DatabaseRejection> {
    if roles.is_empty() {
        return Err(DatabaseRejection::invalid_query(
            "a policy applies to anon, authenticated or both",
        ));
    }

    let names = roles
        .iter()
        .map(|role| match role.as_str() {
            "anon" => Ok(ANON_ROLE),
            "authenticated" => Ok(AUTHENTICATED_ROLE),
            other => Err(DatabaseRejection::invalid_query(format!(
                "unknown policy role {other}"
            ))),
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(names.join(", "))
}

fn condition(expression: Option<&str>) -> Result<Option<&str>, DatabaseRejection> {
    let Some(expression) = expression
        .map(str::trim)
        .filter(|text| text.is_empty() == false)
    else {
        return Ok(None);
    };

    // Characters, like every other length the admin API checks.
    if expression.chars().count() > MAX_EXPRESSION_LENGTH {
        return Err(DatabaseRejection::invalid_query(
            "the condition is too long",
        ));
    }

    Ok(Some(expression))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request(command: &str, roles: &[&str]) -> CreatePolicyRequest {
        CreatePolicyRequest {
            name: "own_rows".to_owned(),
            command: command.to_owned(),
            roles: roles.iter().map(|role| (*role).to_owned()).collect(),
            using: Some("user_id = auth.uid()".to_owned()),
            with_check: Some(" ".to_owned()),
        }
    }

    #[test]
    fn writes_the_policy() -> Result<(), DatabaseRejection> {
        assert_eq!(
            create_policy_sql("notes", &request("select", &["authenticated"]))?,
            "CREATE POLICY \"own_rows\" ON public.\"notes\" FOR SELECT \
             TO nelcota_authenticated USING (user_id = auth.uid())"
        );
        Ok(())
    }

    #[test]
    fn refuses_unknown_commands_and_roles() {
        assert!(create_policy_sql("notes", &request("merge", &["anon"])).is_err());
        assert!(create_policy_sql("notes", &request("all", &["postgres"])).is_err());
        assert!(create_policy_sql("notes", &request("all", &[])).is_err());
    }
}
