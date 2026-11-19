use serde_json::{Map, Value};

use crate::modules::database::rejection::database_rejection::DatabaseRejection;
use crate::modules::database::schema::schema_model::{FunctionModel, SchemaModel};

/// The one function of that name that takes exactly these named arguments: every key is one
/// of its arguments, and every argument without a default is given.
pub fn resolve_function<'a>(
    schema: &'a SchemaModel,
    name: &str,
    arguments: &Map<String, Value>,
) -> Result<&'a FunctionModel, DatabaseRejection> {
    let mut candidates = schema
        .functions_named(name)
        .into_iter()
        .filter(|function| accepts(function, arguments));
    let function = candidates
        .next()
        .ok_or_else(|| DatabaseRejection::FunctionNotFound(name.to_owned()))?;

    if candidates.next().is_some() {
        return Err(DatabaseRejection::invalid_query(format!(
            "several functions named {name} accept these arguments"
        )));
    }

    Ok(function)
}

fn accepts(function: &FunctionModel, arguments: &Map<String, Value>) -> bool {
    let has_unnamed_argument = function
        .arguments
        .iter()
        .any(|argument| argument.name.is_empty());

    if has_unnamed_argument {
        return false;
    }

    let knows_every_key = arguments.keys().all(|key| function.argument(key).is_some());
    let gets_every_required = function
        .required_arguments()
        .all(|argument| arguments.contains_key(&argument.name));

    knows_every_key && gets_every_required
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::modules::database::schema::schema_model::{ArgumentModel, CatalogSnapshot};

    fn function(name: &str, arguments: &[&str], default_count: usize) -> FunctionModel {
        FunctionModel {
            name: name.to_owned(),
            returns_set: false,
            return_type: "integer".to_owned(),
            arguments: arguments
                .iter()
                .map(|argument| ArgumentModel {
                    name: (*argument).to_owned(),
                    type_name: "integer".to_owned(),
                })
                .collect(),
            default_count,
        }
    }

    fn schema() -> SchemaModel {
        SchemaModel::new(CatalogSnapshot {
            tables: Vec::new(),
            foreign_keys: Vec::new(),
            functions: vec![
                function("add", &["a", "b"], 1),
                function("add", &["a", "b", "c"], 0),
            ],
        })
    }

    fn arguments(value: &Value) -> Map<String, Value> {
        value.as_object().cloned().unwrap_or_default()
    }

    #[test]
    fn picks_the_overload_matching_the_arguments() -> Result<(), DatabaseRejection> {
        let schema = schema();
        let two = resolve_function(&schema, "add", &arguments(&json!({ "a": 1 })))?;
        let three = resolve_function(
            &schema,
            "add",
            &arguments(&json!({ "a": 1, "b": 2, "c": 3 })),
        )?;

        assert_eq!(two.arguments.len(), 2);
        assert_eq!(three.arguments.len(), 3);
        Ok(())
    }

    #[test]
    fn refuses_unknown_keys_and_missing_arguments() {
        let schema = schema();

        for body in [json!({ "x": 1 }), json!({}), json!({ "b": 1 })] {
            assert!(resolve_function(&schema, "add", &arguments(&body)).is_err());
        }
        assert!(resolve_function(&schema, "missing", &Map::new()).is_err());
    }
}
