use pulldown_cmark::{Parser, html, Options, Event, Tag};
use serde::{Deserialize, Serialize};

pub struct MarkdownService;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TocEntry {
    pub level: u32,
    pub title: String,
    pub slug: String,
}

impl MarkdownService {
    /// Render markdown to HTML with advanced features
    pub fn render_to_html(markdown: &str) -> String {
        let mut options = Options::empty();
        options.insert(Options::ENABLE_TABLES);
        options.insert(Options::ENABLE_FOOTNOTES);
        options.insert(Options::ENABLE_STRIKETHROUGH);
        options.insert(Options::ENABLE_TASKLISTS);
        options.insert(Options::ENABLE_HEADING_ATTRIBUTES);

        let parser = Parser::new_ext(markdown, options);
        let mut html_output = String::new();
        html::push_html(&mut html_output, parser);

        html_output
    }

    /// Extract all links from markdown
    pub fn extract_links(markdown: &str) -> Vec<String> {
        let parser = Parser::new(markdown);
        let mut links = Vec::new();

        for event in parser {
            if let Event::Start(Tag::Link(_, dest_url, _)) = event {
                links.push(dest_url.to_string());
            }
        }

        links
    }

    /// Generate table of contents from markdown headings
    pub fn generate_toc(markdown: &str) -> Vec<TocEntry> {
        let parser = Parser::new(markdown);
        let mut toc = Vec::new();
        let mut current_heading: Option<(u32, String)> = None;

        for event in parser {
            match event {
                Event::Start(Tag::Heading(level, _, _)) => {
                    current_heading = Some((level as u32, String::new()));
                }
                Event::End(Tag::Heading(_, _, _)) => {
                    if let Some((level, title)) = current_heading.take() {
                        let slug = Self::slugify(&title);
                        toc.push(TocEntry {
                            level,
                            title,
                            slug,
                        });
                    }
                }
                Event::Text(text) => {
                    if let Some((_, ref mut title)) = current_heading {
                        title.push_str(&text);
                    }
                }
                Event::Code(code) => {
                    if let Some((_, ref mut title)) = current_heading {
                        title.push_str(&code);
                    }
                }
                _ => {}
            }
        }

        toc
    }

    /// Convert text to URL-friendly slug
    fn slugify(text: &str) -> String {
        text.to_lowercase()
            .chars()
            .map(|c| {
                if c.is_alphanumeric() {
                    c
                } else {
                    ' '
                }
            })
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<&str>>()
            .join("-")
            .trim_matches('-')
            .to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_to_html() {
        let markdown = "# Hello\n\nThis is **bold** and *italic*.";
        let html = MarkdownService::render_to_html(markdown);
        assert!(html.contains("<h1>Hello</h1>"));
        assert!(html.contains("<strong>bold</strong>"));
        assert!(html.contains("<em>italic</em>"));
    }

    #[test]
    fn test_extract_frontmatter() {
        let markdown = "---\ntitle: Test\nauthor: John\n---\n\n# Content";
        let (frontmatter, content) = crate::utils::migration_utils::extract_frontmatter(markdown);
        assert_eq!(frontmatter, "title: Test\nauthor: John");
        assert!(content.contains("# Content"));
    }

    #[test]
    fn test_extract_frontmatter_no_frontmatter() {
        let markdown = "# Just content";
        let (frontmatter, content) = crate::utils::migration_utils::extract_frontmatter(markdown);
        assert_eq!(frontmatter, "");
        assert_eq!(content, markdown);
    }

    #[test]
    fn test_extract_links() {
        let markdown = "[Link1](https://example.com) and [Link2](https://test.com)";
        let links = MarkdownService::extract_links(markdown);
        assert_eq!(links.len(), 2);
        assert_eq!(links[0], "https://example.com");
        assert_eq!(links[1], "https://test.com");
    }

    #[test]
    fn test_generate_toc() {
        let markdown = "# Heading 1\n\n## Heading 2\n\n### Heading 3";
        let toc = MarkdownService::generate_toc(markdown);
        assert_eq!(toc.len(), 3);
        assert_eq!(toc[0].level, 1);
        assert_eq!(toc[0].title, "Heading 1");
        assert_eq!(toc[0].slug, "heading-1");
        assert_eq!(toc[1].level, 2);
        assert_eq!(toc[2].level, 3);
    }

    #[test]
    fn test_slugify() {
        assert_eq!(MarkdownService::slugify("Hello World"), "hello-world");
        assert_eq!(MarkdownService::slugify("Hello  World"), "hello-world");
        assert_eq!(MarkdownService::slugify("Hello-World"), "hello-world");
        assert_eq!(MarkdownService::slugify("Hello_World"), "hello-world");
        assert_eq!(MarkdownService::slugify("Hello, World!"), "hello-world");
    }

    #[test]
    fn test_render_with_tables() {
        let markdown = "| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |";
        let html = MarkdownService::render_to_html(markdown);
        assert!(html.contains("<table>"));
        assert!(html.contains("<td>Cell 1</td>"));
    }

    #[test]
    fn test_render_with_strikethrough() {
        let markdown = "This is ~~strikethrough~~ text.";
        let html = MarkdownService::render_to_html(markdown);
        assert!(html.contains("<del>strikethrough</del>"));
    }

    #[test]
    fn test_render_with_task_lists() {
        let markdown = "- [ ] Task 1\n- [x] Task 2";
        let html = MarkdownService::render_to_html(markdown);
        assert!(html.contains("checkbox"));
    }
}
