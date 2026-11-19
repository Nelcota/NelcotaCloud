use serde_json::{Map, Value};
use sqlx::{Postgres, QueryBuilder};

use crate::modules::database::schema::schema_model::{ArgumentModel, FunctionModel};
use crate::modules::database::sql::read_statement::MAX_RESPONSE_BYTES;
use crate::shared::database::sql_identifier::quote_identifier;

const VOID_TYPE: &str = "void";
const ARRAY_SUFFIX: &str = "[]";
/// Arguments that take any JSON value as JSON text.
const JSON_TYPES: [&str; 2] = ["json", "jsonb"];

/// `SELECT <json>::text FROM public."fn"("a" := CAST($1 AS integer), ...) _r`: named arguments
/// from the JSON body, each cast to the argument's type by Postgres.
pub fn function_call_statement(
    function: &FunctionModel,
    arguments: &Map<String, Value>,
) -> QueryBuilder<Postgres> {
    let result = match function.return_type.as_str() {
        VOID_TYPE => "'null'::text",
        _ => "coalesce(to_json(_r)::text, 'null')",
    };
    let function_name = quote_identifier(&function.name);
    let prefix = match function.returns_set {
        true => format!(
            "WITH _encoded_rpc_rows AS MATERIALIZED \
             (SELECT to_json(_r) AS value FROM public.{function_name}("
        ),
        false => format!(
            "SELECT CASE WHEN octet_length(_b.value) <= {MAX_RESPONSE_BYTES} THEN _b.value END \
             FROM (SELECT {result} AS value FROM public.{function_name}("
        ),
    };
    let mut sql = QueryBuilder::new(prefix);

    for (index, (name, value)) in arguments.iter().enumerate() {
        let argument = match function.argument(name) {
            Some(argument) => argument,
            None => continue,
        };

        if index > 0 {
            sql.push(", ");
        }

        push_argument(&mut sql, argument, value);
    }

    if function.returns_set {
        sql.push(format!(
            ") _r) SELECT CASE WHEN coalesce(sum(coalesce(octet_length(value::text), 4)::bigint + 2), 0)::bigint \
             <= {MAX_RESPONSE_BYTES} THEN \
             (SELECT coalesce(json_agg(value), '[]')::text FROM _encoded_rpc_rows) END \
             FROM _encoded_rpc_rows"
        ));
        return sql;
    }

    sql.push(") _r) _b");
    sql
}

/// JSON arrays become Postgres arrays element by element; every other value is cast from its
/// text (strings) or JSON text (numbers, booleans, objects, and anything for a `json` or
/// `jsonb` argument, so a string stays a JSON string).
fn push_argument(sql: &mut QueryBuilder<Postgres>, argument: &ArgumentModel, value: &Value) {
    let type_name = &argument.type_name;
    sql.push(format!("{} := ", quote_identifier(&argument.name)));

    if type_name.ends_with(ARRAY_SUFFIX) && value.is_array() {
        sql.push("CAST(ARRAY(SELECT json_array_elements_text(CAST(");
        sql.push_bind(value.to_string());
        sql.push(format!(" AS json))) AS {type_name})"));
        return;
    }

    sql.push("CAST(").push_bind(argument_text(value, type_name));
    sql.push(format!(" AS {type_name})"));
}

fn argument_text(value: &Value, type_name: &str) -> Option<String> {
    match (value, type_name) {
        (Value::Null, _) => None,
        (Value::String(text), type_name) if JSON_TYPES.contains(&type_name) == false => {
            Some(text.clone())
        }
        (other, _) => Some(other.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn json_arguments_keep_strings_as_json() {
        let text = json!("hello");

        assert_eq!(argument_text(&text, "jsonb").as_deref(), Some("\"hello\""));
        assert_eq!(argument_text(&text, "text").as_deref(), Some("hello"));
        assert_eq!(argument_text(&json!(null), "jsonb"), None);
        assert_eq!(argument_text(&json!(2), "integer").as_deref(), Some("2"));
    }
}
