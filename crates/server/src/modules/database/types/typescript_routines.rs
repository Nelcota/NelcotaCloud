use std::collections::BTreeMap;

use crate::modules::database::types::type_catalog::{EnumType, FunctionType};
use crate::modules::database::types::typescript_block::block;
use crate::modules::database::types::typescript_type::{property_key, quoted, typescript_type};

/// Overloads of one name become a union of their argument objects.
pub fn functions_section(functions: &[FunctionType]) -> String {
    let mut by_name = BTreeMap::<&str, Vec<&FunctionType>>::new();

    for function in functions {
        by_name.entry(&function.name).or_default().push(function);
    }

    let entries: Vec<String> = by_name
        .into_iter()
        .map(|(name, overloads)| {
            format!(
                "      {}: {}",
                property_key(name),
                function_type(&overloads)
            )
        })
        .collect();

    block(&entries, "    ")
}

fn function_type(overloads: &[&FunctionType]) -> String {
    let arguments: Vec<String> = overloads
        .iter()
        .map(|function| arguments_object(function))
        .collect();
    let returns: Vec<String> = overloads
        .iter()
        .map(|function| return_type(function))
        .collect();

    format!(
        "{{\n        Args: {}\n        Returns: {}\n      }}",
        unique_union(arguments),
        unique_union(returns)
    )
}

fn arguments_object(function: &FunctionType) -> String {
    let entries: Vec<String> = function
        .arguments
        .iter()
        .filter(|argument| argument.name.is_empty() == false)
        .map(|argument| {
            let key = property_key(&argument.name);
            let value = typescript_type(&argument.value);

            match argument.has_default {
                true => format!("          {key}?: {value}"),
                false => format!("          {key}: {value}"),
            }
        })
        .collect();

    block(&entries, "        ")
}

fn return_type(function: &FunctionType) -> String {
    let value = typescript_type(&function.returns);

    match function.returns_set {
        true => format!("({value})[]"),
        false => value,
    }
}

pub fn enums_section(enums: &[EnumType]) -> String {
    let entries: Vec<String> = enums
        .iter()
        .map(|enumeration| {
            format!(
                "      {}: {}",
                property_key(&enumeration.name),
                labels(enumeration)
            )
        })
        .collect();

    block(&entries, "    ")
}

fn labels(enumeration: &EnumType) -> String {
    let labels: Vec<String> = enumeration
        .labels
        .iter()
        .map(|label| quoted(label))
        .collect();

    match labels.is_empty() {
        true => "never".to_owned(),
        false => labels.join(" | "),
    }
}

fn unique_union(types: Vec<String>) -> String {
    let mut unique: Vec<String> = Vec::new();

    for candidate in types {
        if unique.contains(&candidate) == false {
            unique.push(candidate);
        }
    }

    unique.join(" | ")
}
