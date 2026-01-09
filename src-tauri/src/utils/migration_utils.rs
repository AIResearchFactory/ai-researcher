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
pub fn parse_legacy_value(value: &str) -> Value {
    let unquoted = strip_quotes(value);
    
    // Try to parse boolean values
    match unquoted {
        "true" => serde_json::json!(true),
        "false" => serde_json::json!(false),
        _ => serde_json::json!(unquoted),
    }
}

/// Robust frontmatter extraction without external dependencies
pub fn extract_frontmatter(content: &str) -> (String, String) {
    let lines: Vec<&str> = content.lines().collect();
    
    if lines.len() < 2 || lines[0].trim() != "---" {
        return (String::new(), content.to_string());
    }
    
    let mut end_index = None;
    for (i, line) in lines.iter().enumerate().skip(1) {
        if line.trim() == "---" {
            end_index = Some(i);
            break;
        }
    }
    
    if let Some(idx) = end_index {
        let frontmatter = lines[1..idx].join("\n");
        let body = lines[idx+1..].join("\n");
        (frontmatter.trim().to_string(), body.trim().to_string())
    } else {
        (String::new(), content.to_string())
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
    fn test_parse_legacy_value_boolean_true() {
        assert_eq!(parse_legacy_value("true"), serde_json::json!(true));
    }

    #[test]
    fn test_parse_legacy_value_boolean_false() {
        assert_eq!(parse_legacy_value("false"), serde_json::json!(false));
    }

    #[test]
    fn test_parse_legacy_value_string() {
        assert_eq!(parse_legacy_value("hello"), serde_json::json!("hello"));
    }

    #[test]
    fn test_parse_legacy_value_quoted_string() {
        assert_eq!(parse_legacy_value("\"hello\""), serde_json::json!("hello"));
        assert_eq!(parse_legacy_value("'world'"), serde_json::json!("world"));
    }

    #[test]
    fn test_parse_legacy_value_quoted_boolean() {
        // Quoted booleans should be treated as booleans after stripping quotes
        assert_eq!(parse_legacy_value("\"true\""), serde_json::json!(true));
        assert_eq!(parse_legacy_value("'false'"), serde_json::json!(false));
    }
}
