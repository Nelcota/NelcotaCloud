use crate::modules::database::types::type_catalog::ValueType;

/// Postgres types whose JSON form (as the Data API writes it) is a number.
const NUMBER_TYPES: &[&str] = &["int2", "int4", "int8", "float4", "float8", "numeric", "oid"];

/// Postgres types whose JSON form is a string: text, identifiers, dates, times and binaries.
const STRING_TYPES: &[&str] = &[
    "text",
    "varchar",
    "bpchar",
    "char",
    "name",
    "citext",
    "uuid",
    "date",
    "time",
    "timetz",
    "timestamp",
    "timestamptz",
    "interval",
    "bytea",
    "inet",
    "cidr",
    "macaddr",
    "macaddr8",
    "money",
    "xml",
    "bit",
    "varbit",
    "tsvector",
    "tsquery",
];

/// The TypeScript type of a value as the Data API sends it; arrays stay arrays.
pub fn typescript_type(value: &ValueType) -> String {
    let element = element_type(value);

    if value.is_array {
        return format!("({element})[]");
    }

    element
}

fn element_type(value: &ValueType) -> String {
    let name = value.name.as_str();

    if value.is_enum {
        return format!("Database[\"public\"][\"Enums\"][{}]", quoted(name));
    }

    if let Some(relation) = &value.relation {
        return relation_row(relation);
    }

    primitive_type(name).to_owned()
}

fn primitive_type(name: &str) -> &'static str {
    if NUMBER_TYPES.contains(&name) {
        return "number";
    }

    if STRING_TYPES.contains(&name) {
        return "string";
    }

    match name {
        "bool" => "boolean",
        "json" | "jsonb" => "Json",
        "void" => "undefined",
        _ => "unknown",
    }
}

/// The row of a table or view, for a function that returns it.
fn relation_row(relation: &str) -> String {
    let name = quoted(relation);

    format!("(Database[\"public\"][\"Tables\"] & Database[\"public\"][\"Views\"])[{name}][\"Row\"]")
}

/// A catalog name as a TypeScript string literal; JSON escaping is valid there and keeps any
/// quote or line break in the name from ending the literal.
pub fn quoted(name: &str) -> String {
    serde_json::Value::String(name.to_owned()).to_string()
}

/// A property key: bare when it is a plain identifier, quoted otherwise.
pub fn property_key(name: &str) -> String {
    let mut characters = name.chars();
    let Some(first) = characters.next() else {
        return quoted(name);
    };

    if is_identifier_start(first) && characters.all(is_identifier_part) {
        return name.to_owned();
    }

    quoted(name)
}

fn is_identifier_start(character: char) -> bool {
    character.is_ascii_alphabetic() || character == '_' || character == '$'
}

fn is_identifier_part(character: char) -> bool {
    is_identifier_start(character) || character.is_ascii_digit()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn value(name: &str) -> ValueType {
        ValueType {
            name: name.to_owned(),
            is_array: false,
            is_enum: false,
            relation: None,
        }
    }

    #[test]
    fn maps_the_json_form_of_each_type() {
        assert_eq!(typescript_type(&value("int8")), "number");
        assert_eq!(typescript_type(&value("timestamptz")), "string");
        assert_eq!(typescript_type(&value("bool")), "boolean");
        assert_eq!(typescript_type(&value("jsonb")), "Json");
        assert_eq!(typescript_type(&value("vector")), "unknown");
    }

    #[test]
    fn arrays_enums_and_rows_keep_their_shape() {
        let tags = ValueType {
            is_array: true,
            ..value("text")
        };
        let status = ValueType {
            is_enum: true,
            ..value("order_status")
        };
        let posts = ValueType {
            relation: Some("posts".to_owned()),
            ..value("posts")
        };

        assert_eq!(typescript_type(&tags), "(string)[]");
        assert_eq!(
            typescript_type(&status),
            "Database[\"public\"][\"Enums\"][\"order_status\"]"
        );
        assert!(typescript_type(&posts).ends_with("[\"posts\"][\"Row\"]"));
    }

    #[test]
    fn keys_are_quoted_unless_plain_identifiers() {
        assert_eq!(property_key("created_at"), "created_at");
        assert_eq!(property_key("first name"), "\"first name\"");
        assert_eq!(property_key("2fa"), "\"2fa\"");
        assert_eq!(property_key("a\"b"), "\"a\\\"b\"");
        assert_eq!(property_key(""), "\"\"");
    }
}
