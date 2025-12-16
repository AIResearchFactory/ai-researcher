/// Utility functions for parsing YAML frontmatter
use serde_json::Value;

/// Strip surrounding quotes from a string value if present
/// 
/// Removes single or double quotes from the beginning and end of a string.
/// Returns the unquoted string slice.
/// 
/// # Examples
/// 
/// ```
/// let quoted = "\"hello\"";
/// assert_eq!(strip_quotes(quoted), "hello");
/// 
/// let single_quoted = "'world'";
/// assert_eq!(strip_quotes(single_quoted), "world");
/// 
/// let unquoted = "test";
/// assert_eq!(strip_quotes(unquoted), "test");
/// ```
pub fn strip_quotes(value: &str) -> &str {
    if (value.starts_with('"') && value.ends_with('"')) 
        || (value.starts_with('\'') && value.ends_with('\'')) 
    {
        if value.len() >= 2 {
            &value[1..value.len()-1]
        } else {
            value
        }
    } else {
        value
    }
}

/// Parse a YAML value into the appropriate JSON value type
/// 
/// Attempts to parse boolean values, then falls back to string.
/// Automatically strips quotes from string values.
/// 
/// # Examples
/// 
/// ```
/// assert_eq!(parse_yaml_value("true"), serde_json::json!(true));
/// assert_eq!(parse_yaml_value("false"), serde_json::json!(false));
/// assert_eq!(parse_yaml_value("\"hello\""), serde_json::json!("hello"));
/// assert_eq!(parse_yaml_value("world"), serde_json::json!("world"));
/// ```
pub fn parse_yaml_value(value: &str) -> Value {
    let unquoted = strip_quotes(value);
    
    // Try to parse boolean values
    match unquoted {
        "true" => serde_json::json!(true),
        "false" => serde_json::json!(false),
        _ => serde_json::json!(unquoted),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_quotes_double() {
        assert_eq!(strip_quotes("\"hello\""), "hello");
    }

    #[test]
    fn test_strip_quotes_single() {
        assert_eq!(strip_quotes("'world'"), "world");
    }

    #[test]
    fn test_strip_quotes_unquoted() {
        assert_eq!(strip_quotes("test"), "test");
    }

    #[test]
    fn test_strip_quotes_empty() {
        assert_eq!(strip_quotes(""), "");
    }

    #[test]
    fn test_strip_quotes_single_char() {
        assert_eq!(strip_quotes("\"\""), "");
        assert_eq!(strip_quotes("''"), "");
    }

    #[test]
    fn test_parse_yaml_value_boolean_true() {
        assert_eq!(parse_yaml_value("true"), serde_json::json!(true));
    }

    #[test]
    fn test_parse_yaml_value_boolean_false() {
        assert_eq!(parse_yaml_value("false"), serde_json::json!(false));
    }

    #[test]
    fn test_parse_yaml_value_string() {
        assert_eq!(parse_yaml_value("hello"), serde_json::json!("hello"));
    }

    #[test]
    fn test_parse_yaml_value_quoted_string() {
        assert_eq!(parse_yaml_value("\"hello\""), serde_json::json!("hello"));
        assert_eq!(parse_yaml_value("'world'"), serde_json::json!("world"));
    }

    #[test]
    fn test_parse_yaml_value_quoted_boolean() {
        // Quoted booleans should be treated as booleans after stripping quotes
        assert_eq!(parse_yaml_value("\"true\""), serde_json::json!(true));
        assert_eq!(parse_yaml_value("'false'"), serde_json::json!(false));
    }
}
