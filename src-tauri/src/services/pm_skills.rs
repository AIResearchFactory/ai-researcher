pub fn get_pm_skills_definitions() -> Vec<(&'static str, &'static str)> {
    vec![
        (
            "generate-prd-draft",
            r#"# Generate PRD Draft Skill

## Overview
Generates an initial Product Requirements Document (PRD) from a high-level feature concept. Use this as the first step in a PM workflow to move from a raw idea to a structured document.

## Prompt Template
You are an expert Product Manager. Your task is to generate a comprehensive initial Product Requirements Document (PRD) for the following feature concept:

Feature Idea: {{feature_idea}}

The PRD should include:
1. **Executive Summary**: High-level overview of the feature.
2. **Problem Statement**: What problem are we solving? Who is the target user?
3. **Goals & Success Metrics**: What does success look like? How will we measure it?
4. **User Personas**: Description of the primary users.
5. **Functional Requirements**: List of core features and their behavior.
6. **Non-Functional Requirements**: Performance, security, and scalability considerations.
7. **Constraints & Assumptions**: Any limitations or dependencies.

Please use a professional, clear, and structured professional tone.

## Parameters

### feature_idea (string, required)
The high-level idea or concept for the new feature.

## Usage Guidelines
- Best used at the beginning of the product discovery phase.
- Output should be saved as a .md file or as a Requirement artifact.
"# 
        ),
        (
            "refine-prd-contextually",
            r#"# Refine PRD Contextually Skill

## Overview
Refines an existing PRD draft by incorporating project-wide context, competitive analysis, and technical constraints. It also identifies gaps and asks clarifying questions to ensure the PRD is ready for engineering.

## Prompt Template
You are a Senior Product Manager refining a PRD. You must analyze the provided PRD draft in the context of the entire project to ensure alignment and completeness.

PRD Draft: {{prd_content}}

Project Context & Related Files:
{{context}}

Your task:
1. **Contextual Alignment**: Update the PRD to align with existing project architecture, brand guidelines, or technical decisions mentioned in the context.
2. **Competitive Edge**: If competitor information is present, suggest enhancements to differentiate the feature.
3. **Gap Analysis**: Identify missing sections or ambiguous requirements.
4. **Clarifying Questions**: List at least 3-5 specific questions for the stakeholders to finalize the requirements.

Output the REFINED PRD followed by a clear "CLARIFYING QUESTIONS" section.

## Parameters

### prd_content (string, required)
The markdown content of the initial PRD draft.

### context (string, optional)
Aggregated content from relevant project files (e.g., competitors, existing docs).

## Usage Guidelines
- Use this after generating an initial draft to add depth and accuracy.
- Ensure all relevant project files are passed in the 'context' parameter.
"#
        ),
        (
            "generate-user-stories",
            r#"# Generate User Stories Skill

## Overview
Transforms a refined PRD into a set of actionable user stories. Each story follows the "As a [user], I want [action], so that [value]" format and includes detailed acceptance criteria.

## Prompt Template
You are a Product Manager/Business Analyst. Your goal is to break down the following PRD into granular, "Ready" user stories for the development team.

PRD Content: {{prd_content}}

For each significant feature/requirement in the PRD, generate:
1. **Title**: Concise name for the story.
2. **User Story**: "As a [persona], I want [action], so that [benefit]."
3. **Acceptance Criteria**: A checklist of 3-5 specific, testable conditions (Given/When/Then style preferred).
4. **Priority**: High/Medium/Low.

Output the stories in a structured list suitable for a backlog or task management tool.

## Parameters

### prd_content (string, required)
The markdown content of the refined PRD.

## Usage Guidelines
- Use this once the PRD is finalized or highly stable.
- The output can be used to populate Jira, Aha!, or other project management tools.
"#
        ),
        (
            "pptx-pitch-architect",
            r#"# PPTX Pitch Architect Skill

## Overview
A high-fidelity agent skill for designing and generating professional PowerPoint (.pptx) business pitches and presentations. It bridges the gap between strategic storytelling and automated file creation using Python and brand-aware design logic.

## Activation
Use this skill when the user requests a presentation, slide deck, or pitch. The primary goal is to produce a .pptx file. If the environment lacks python-pptx, produce a high-quality Markdown storyboard as a fallback.

## Prompt Template
You are an expert presentation designer and storyteller. Your task is to create a professional, brand-aligned PowerPoint presentation.

Presentation Topic / Source Content:
{{presentation_topic}}

{{source_content}}

Brand Rules:
{{brand_rules}}

### Step 1 — Branding Logic
Before building slides, apply brand constraints:
- If brand rules are provided above, extract and apply the colors, typography, and tone.
- If no brand rules are provided, use the Neutral Corporate default theme:
  - Primary: #2C3E50 (Midnight Blue)
  - Accent: #2980B9 (Belize Blue)
  - Text: #333333
  - Font: Arial or Helvetica
- All shapes, headers, and bullet points must strictly follow the detected color hex codes.

### Step 2 — Narrative Architecture
Structure the deck using this proven pitch framework (unless the user specifies otherwise):
1. **The Hook** — Title slide with a high-level value proposition.
2. **The Problem** — Clearly define the pain point (max 3 bullets).
3. **The Solution** — How the product/service solves the problem.
4. **Market Opportunity** — Data-driven slide (TAM/SAM/SOM or equivalent).
5. **Traction / Roadmap** — What has been achieved and what is next.
6. **Call to Action** — "The Ask" or clear next steps.

### Step 3 — File Generation
Generate a Python script using python-pptx that creates the .pptx file:
- Apply the brand colors to all shapes and text.
- Use the narrative structure above.
- Save the file as `presentation_output.pptx` in the current directory.
- If python-pptx is not available, output a detailed Markdown storyboard with slide-by-slide content instead.

Output the complete Python script followed by instructions to run it.

## Parameters

### presentation_topic (string, required)
The main topic, title, or concept for the presentation.

### source_content (string, optional)
Raw content, document text, or notes to be transformed into slides.

### brand_rules (string, optional)
Brand guidelines in JSON or free-text format defining colors, fonts, tone, and assets.
Default: Use Neutral Corporate theme if not provided.

## Usage Guidelines
- Works standalone from the Skills panel: provide a topic and optional brand rules.
- Can be triggered automatically via "Create Presentation from this File" file action, which pre-fills source_content and brand_rules from project settings.
- Output .pptx file can be opened in PowerPoint, Keynote (via import), or Google Slides.
"#
        ),
        (
            "format-data",
            r#"# Format Data for MCP Skill

## Overview
Structures user story and requirement data into a clean JSON format compatible with MCP servers like Jira, Aha!, or Monday. This skill acts as a bridge between human-readable documentation and automated project management integrations.

## Prompt Template
You are a Technical Product Manager. Your task is to extract and format the user stories from the provided text into a structured JSON array suitable for API ingestion or MCP tools.

Input Content: {{input_content}}
Target System: {{target_system}}

Output a JSON array of objects, where each object has:
- `title`: The story title.
- `description`: The "As a..." statement.
- `acceptance_criteria`: A list of strings.
- `priority`: Normalized to "High", "Medium", or "Low".

Output ONLY the raw JSON array. Do not include markdown blocks or extra text.

## Parameters

### input_content (string, required)
The text containing user stories or requirements to be formatted.

### target_system (string, optional)
The intended destination system (e.g., Jira, Aha, Monday).
Default: "Jira"

## Usage Guidelines
- Use this as the final step in a PM workflow before syncing with external tools.
- The output is designed to be passed to an MCP command.
"#
        ),
    ]
}
