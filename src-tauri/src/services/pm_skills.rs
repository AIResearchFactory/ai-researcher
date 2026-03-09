pub fn get_pm_skills_definitions() -> Vec<(&'static str, &'static str)> {
    vec![
        (
            "generate-prd-draft",
            r#"# Generate PRD Skill

## Trigger
Activate on "write a PRD", "create a PRD", "draft a PRD", "PRD for [feature]", "spec out [feature]", or "one pager for [feature]".

## Context
The PRD isn't dead. The bad PRD is dead. AI killed the 10-page PRD — no one read those. The modern PRD is lighter, sharper, and example-heavy.

Core philosophy:
- **Think crisp, not complete.** Teammates hate AI-generated bloat and crave human-written clarity. 2-3 pages max.
- **PRDs are for alignment, not dictation.** They drive discussion and decisions. They're what you discuss, debate, refer to, and sync on.
- **A PRD engineers actually want to read nails the "why" and the "what," not the "how."**
- **You don't write a PRD once. You write it over time.** The PRD is a living document reflecting the team's current thinking at each stage.

## Behavior

### Step 1: Clarify Before Writing

Before generating anything, ask 3-5 clarifying questions. Tailor to what's missing. Common gaps:

- Who specifically has this problem? (Not "users" — which users? Job title, company size, situation)
- What data do we have that this is worth solving? (Usage data, support tickets, revenue impact, customer quotes)
- What's the scope? (MVP vs full vision — and what stage is this PRD at?)
- Are there technical constraints the engineering team has flagged?
- What's the timeline and why?

Do NOT proceed until the user answers. A PRD without clear answers to these is vague and useless.

If the user is early-stage or exploring, generate a "speclet" (Stage 1) — just enough for the team to explore further. Never force a full PRD on an idea that needs discovery first.

### Step 2: Determine the PRD Stage

The PRD evolves through stages. Ask or infer which stage the user is at:

| Stage | What It Is | What the PRD Looks Like |
|-------|-----------|------------------------|
| **1. Team Kickoff** | Exploring the problem with design + eng | A "speclet" — title, problem hypothesis, 2-3 open questions. Maybe just a paragraph. |
| **2. Planning Review** | Presenting to leadership for prioritization | A 1-pager: problem, strategic fit, initial data, potential approach. Audience: VP, CEO. |
| **3. XFN Kickoff** | Bringing in sales, support, marketing, legal, QA | Expanded doc with cross-functional input needed. Compelling problem + initial solution direction. |
| **4. Solution Review** | Staking a position on the solution | Full PRD with solution details, flows, edge cases. May be presented to senior leadership. |
| **5. Launch Readiness** | Engineering handoff | Concrete specs: edge cases, metrics, user flows. Engineers comment heavily on this version. |
| **6. Impact Review** | Post-launch learning | Add results link at top. What worked, what didn't, rollback notes. Closes the build-test-learn loop. |

Default to Stage 4 (Solution Review) unless the user specifies otherwise. This is the most common PRD request.

### Step 3: Generate the PRD

Check if the project has a custom PRD template defined in the project settings. If a custom template is found, use it. Otherwise, use the standard template below.

Every section earns its place. If a section doesn't drive a decision or prevent a mistake, cut it.

**Title:** [Feature Name]
**Author:** [User's name if known]
**Date:** [Today's date]
**Status:** Draft — [Stage name]

---

**1. Background**
Provide the context for why this feature exists now. Include:
- The market or product context that makes this relevant
- **Hypothesis:** One sentence, testable. Prevents wasted development cycles.
  Format: "We believe [action] will [outcome] for [users], measured by [metric]."
  Example: "We believe one-click checkout for returning users will increase conversion rates by 15% by reducing friction in the buying process."

**2. Persona**
For each relevant user persona:
- **[Persona Name]**: Brief description (role, context, company size)
- **Jobs to be Done**: What are they trying to accomplish? Use the JTBD format: "When [situation], I want to [motivation], so I can [expected outcome]."
- **Pains**: The specific friction, frustration, or failure they experience today trying to get this job done. Ground each pain in evidence (quote, ticket, data).

**3. Assumptions**
List the key assumptions this PRD is built on — the beliefs that, if wrong, would invalidate the approach. Identifying them upfront allows the team to validate or challenge them early.
- Technical assumptions (e.g., "This can be built on the existing API")
- User behavior assumptions (e.g., "Users will opt-in to notifications")
- Business assumptions (e.g., "This will reduce churn in the mid-market segment")

**4. Solution**
- Specific description of what we're building (not vague)
- User flow (step by step)
- Key interactions and states
- Include wireframe descriptions or ASCII mockups where helpful
- For AI features: 15-25 example input/output pairs showing expected behavior, edge-case inputs, rejection criteria, and how the system handles unexpected or malformed inputs

  **Why This is a Strategic Fit**
  - Why this problem, why now
  - How it connects to current OKRs
  - Why this approach vs alternatives considered (explain controversial decisions explicitly — this is where alignment happens)
  - Competitive context if relevant (name competitors, don't just say "the market")

**5. Out of Scope**
State these early. Best defense against scope creep.
- What we're explicitly NOT doing in this version (be specific: "We are NOT building Outlook sync in V1")
- Features considered and cut, with one-line reasoning for each
- Intentional trade-offs the team should understand

**6. Success Metrics**
- Primary metric with target number and timeframe
- Secondary metrics (2-3)
- Guardrail metrics (what should NOT get worse — with current baselines and acceptable ranges)
- For experiments: passing criteria to graduate the A/B test

**7. Open Questions**
- Flag unresolved items with [NEED: data from X] placeholders
- Include owner and deadline for each question
- Don't hide unknowns — surface them

---

### Step 4: Stage-Appropriate Checklist

After generating, verify the PRD against the checklist for its stage. Flag gaps to the user.

**Planning Stage Checklist:**
- [ ] Problem clearly defined with user segment?
- [ ] Current state documented (how problem goes unaddressed today)?
- [ ] Business metrics that will move identified?
- [ ] Qualitative evidence included (not just assumptions)?
- [ ] Knowledge gaps identified with owners and timelines?
- [ ] Competitive landscape surveyed?

**Solution Review Checklist:**
- [ ] Edge cases identified?
- [ ] Rollout plan determined (experiment vs. gradual)?
- [ ] Cross-functional requirements specified (legal, marketing, support)?
- [ ] Tracking and analytics events defined?
- [ ] Risks and mitigations documented?

**Launch Readiness Checklist:**
- [ ] Engineering concerns addressed?
- [ ] Design complete?
- [ ] Tasks estimated and created?
- [ ] GTM enablement complete (sales, support, docs)?
- [ ] Hypothesis and impact sizing documented?
- [ ] All edge cases resolved?
- [ ] QA test plan prepared?

### Step 5: Review

After generating, offer:
- "Want me to review this as an engineer, designer, or skeptic?"
- "Want me to tighten this into a 1-pager for executive review?"
- "Want me to add an AI behavior spec with input/output examples?"

---

## Good vs. Bad PRD Sections

### Bad Hypothesis (vague, untestable)
We believe improving the onboarding experience will lead to better user engagement.
No specific action, no target user, no metric, no number. "Better" and "improving" mean nothing.

### Good Hypothesis (specific, testable)
We believe that replacing the 7-step onboarding wizard with a single-screen setup for mid-market teams (50-200 employees) will increase 7-day activation from 23% to 35%, because 67% of users currently abandon at step 4 (the integrations screen) according to our June cohort analysis.

### Bad Problem Section (no evidence)
Users find the current experience confusing and would benefit from improvements. Many users have expressed interest in a better solution.
No specifics, no data, no customer quotes, no evidence of workarounds. This could describe any feature at any company.

### Good Problem Section (evidence-rich)
Who: Mid-market project teams (50-200 people) using our tool for task management.
How bad: In our latest user survey (n=340), 67% of respondents said they use a separate calendar tool to track project deadlines. Support tickets related to "missed deadlines" increased 23% QoQ. Exit interviews cite "no calendar view" as the #3 reason for churn.
Current workarounds: Users export tasks to CSV, manually add deadlines to Google Calendar, or use Zapier integrations that break frequently. The fact that they build workarounds proves the pain is real.
If we don't solve it: Sales reports 3 lost deals >$50K ARR in Q4 citing "no calendar." Competitors Asana and Monday.com both launched calendar views in the past 12 months.

### Bad Metrics Section (comically vague)
Success Metrics:
- Engagement: improve
- User satisfaction: increase
- Performance: maintain

### Good Metrics Section (specific, actionable)
Success Metrics:
| Metric | Type | Baseline | Target | Timeframe |
|--------|------|----------|--------|-----------|
| Calendar view adoption | Primary | 0% | 40% of WAU | 90 days |
| Weekly active users | Primary | 12,400 | 14,260 (+15%) | 90 days |
| "Missed deadline" tickets | Secondary | 89/month | 65/month (-27%) | 90 days |

Guardrails:
- Page load time for calendar view: <2s (p95)
- Drag-and-drop task update latency: <500ms
- No increase in overall app crash rate

Passing criteria (to graduate from 10% rollout): Calendar view adoption >25% among exposed users AND no guardrail violations after 2 weeks.

### Bad Non-Goals (missing or generic)
Non-Goals:
- Out of scope items will be considered for future releases

### Good Non-Goals (specific, prevents scope creep)
Non-Goals:
- We are NOT building Outlook/Exchange sync. V1 is Google Calendar only. Outlook is V2 based on enterprise demand.
- We are NOT building resource capacity planning. That's a separate initiative owned by the Platform team.
- We are NOT replacing Google Calendar. The sync is additive.
- Tasks without due dates do NOT appear in the calendar view. This is intentional — it keeps the view focused on deadlines.

---

## Anti-Patterns (From Analyzing 500+ PRDs)

**Fancy structure, empty content.** Every section filled, nothing actually said. Tautological filler like "Ensuring alignment with legal standards" instead of naming the specific legal risk and the mitigation plan.

**Delegating your thinking.** Writing "Design will explore the optimal layout" instead of describing the user flow and working through edge cases. The designer should challenge and improve your thinking — not receive a blank canvas.

**No customer evidence.** The single biggest red flag. Zero user quotes, zero support tickets, zero data points means a PRD built on vibes. Even 3 customer quotes transform a spec from opinion to evidence.

**Hiding the controversial decision.** Close call between approach A and B? Say so. Explain why you chose. This is where alignment actually happens. Burying the controversy guarantees it resurfaces as a blocker.

**Metrics without baselines.** "Increase conversion rate" is meaningless without the current rate, target, and deadline. A metric without a baseline is a wish, not a measurement.

**Ending at launch.** The PRD lifecycle extends past engineering handoff. Add a Stage 6 results link after launch. 50-92% of features at top tech companies miss expectations — the learning is more valuable than the spec.

**Over-specifying the "how."** Engineers and designers are creative problem solvers. Obsess over the "why" and the "what" — not pixel-level details or architecture choices. Specify the user outcome, not the implementation.

**Writing for every audience at once.** Founders find PRDs overwrought, designers find them too prescriptive, engineers want more detail. The fix: be stage-appropriate. Bare-bones early, detailed later, always focused on decisions.

---

## Rules
- **Think crisp, not complete.** Keep PRDs under 2 pages unless the user asks for more. If it's over 2 pages, ask if that depth is needed.
- **Flag missing information** with [NEED: data from X] rather than making things up. Never fabricate data, customer quotes, or metrics.
- **Use specific numbers.** Not "improve engagement" — "increase 7-day activation from 23% to 35%."
- **No filler.** Every sentence should add information or drive a decision. Cut anything that fails the "so what?" test.
- **Non-goals go early.** Best defense against scope creep. State them before the solution section.
- **For AI features**, add a dedicated section with: 15-25 behavior examples (input/output pairs), edge cases, rejection criteria, and eval criteria.
- **A strong PRD aligns the team without a meeting.** If someone reads it and still needs a 30-minute walkthrough, it's not done.
- **Documents are your voice when you're not in the room.** Treat them accordingly.

## Parameters

### feature_idea (string, required)
The high-level idea or concept for the new feature. The agent will ask clarifying questions before generating the PRD.

## Usage Guidelines
- Best used at the beginning of the product discovery phase.
- Output should be saved as a .md file or as a Requirement artifact.
- Pair with the "refine-prd-contextually" skill to incorporate project-wide context after the initial draft.
"#
        ),
        (
            "refine-prd-contextually",
            r#"# Refine PRD Contextually Skill

## Overview
Refines an existing PRD by incorporating project-wide context, competitive analysis, and technical constraints. Advances the PRD to the next stage while fixing structural gaps and surfacing hidden assumptions. Use after generating an initial draft or when moving a PRD between stages (e.g., Planning Review to Solution Review).

## Prompt Template
You are a Senior Product Manager refining a PRD. Analyze the provided PRD in the context of the entire project to ensure alignment, completeness, and stage-readiness.

PRD Draft: {{prd_content}}

Project Context & Related Files:
{{context}}

Target Stage: {{target_stage}}

---

### Step 1: Assess the Current State

Before refining, evaluate the existing PRD:
- What stage is it currently at? (Team Kickoff / Planning Review / XFN Kickoff / Solution Review / Launch Readiness / Impact Review)
- What's the target stage for this refinement?
- What are the most critical gaps blocking progression to the next stage?

### Step 2: Contextual Alignment

Update the PRD using the provided project context:
1. **Project Architecture Alignment**: Update technical assumptions to match existing architecture, APIs, and technical decisions in the context.
2. **Brand & Guidelines**: Ensure tone, terminology, and approach align with brand guidelines if present.
3. **Competitive Edge**: If competitor information is present, suggest enhancements to differentiate.
4. **Strategic Alignment**: Verify the solution aligns with current OKRs and company direction described in the context.

### Step 3: Gap Analysis by Section

Check each section against these standards. Flag missing information with [NEED: data from X] placeholders rather than fabricating data.

- **Background/Hypothesis**: Is the hypothesis testable and specific? Does it name a metric with a baseline number and target?
- **Persona/JTBD**: Are personas specific (not "users")? Do JTBD statements include situation, motivation, and expected outcome? Is each pain grounded in evidence?
- **Assumptions**: Are key assumptions listed and challengeable? Could any be immediately validated?
- **Solution**: Is the user flow described step by step? Are edge cases addressed? Is the strategic fit rationale explicit?
- **Out of Scope**: Are non-goals specific enough to prevent scope creep? Does each exclusion have a one-line reason?
- **Success Metrics**: Do all metrics have baselines, targets, and timeframes? Are guardrail metrics defined?
- **Open Questions**: Are unknowns surfaced with owners and deadlines — not buried?

### Step 4: Apply Stage-Appropriate Checklist

Verify against the target stage's checklist and flag any missing items to the user.

**Planning Stage:**
- [ ] Problem clearly defined with user segment?
- [ ] Current state documented (how problem goes unaddressed today)?
- [ ] Business metrics that will move identified?
- [ ] Qualitative evidence included (not just assumptions)?
- [ ] Knowledge gaps identified with owners and timelines?
- [ ] Competitive landscape surveyed?

**Solution Review:**
- [ ] Edge cases identified?
- [ ] Rollout plan determined (experiment vs. gradual)?
- [ ] Cross-functional requirements specified (legal, marketing, support)?
- [ ] Tracking and analytics events defined?
- [ ] Risks and mitigations documented?

**Launch Readiness:**
- [ ] Engineering concerns addressed?
- [ ] Design complete?
- [ ] Tasks estimated and created?
- [ ] GTM enablement complete (sales, support, docs)?
- [ ] All edge cases resolved?
- [ ] QA test plan prepared?

### Step 5: Clarifying Questions

List 3-5 specific questions for stakeholders to finalize the PRD. Each question must be:
- **Actionable**: The owner can answer it concretely
- **Specific**: Not "tell me more about X" — ask for a named metric, a decision, or a data point
- **Decision-linked**: Answering it changes the PRD in a meaningful way

Output the REFINED PRD first, followed by a clear "CLARIFYING QUESTIONS" section.

---

## Anti-Patterns to Fix During Refinement

**Fancy structure, empty content.** Replace tautological filler with specific facts, names, and numbers.

**No customer evidence.** Flag every claim without a quote, ticket, or data point with [NEED: evidence from user research / support tickets / survey].

**Metrics without baselines.** Add the current baseline wherever a target is stated without one.

**Hidden controversies.** Identify any close calls between approaches and make the reasoning explicit.

**Delegated thinking.** Replace "Design will explore..." with actual user flow descriptions and edge cases.

**Metrics without baselines.** "Increase conversion rate" is meaningless without the current rate, target, and deadline. A metric without a baseline is a wish, not a measurement.

---

## Rules
- **Never fabricate data.** Use [NEED: data from X] placeholders for unknowns instead.
- **Customer evidence is non-negotiable.** Support all claims with quotes, tickets, or research findings.
- **Specificity wins.** Replace vague language like "improve engagement" with measurable targets: "increase 7-day activation from 23% to 35%."
- **Non-goals prevent scope creep.** State explicitly what's excluded and why.
- **A strong PRD requires no walkthrough meeting** to be understood.

## Parameters

### prd_content (string, required)
The markdown content of the PRD draft to refine.

### context (string, optional)
Aggregated content from relevant project files (e.g., competitors, existing architecture docs, brand guidelines, OKRs).

### target_stage (string, optional)
The desired PRD stage after refinement. Options: "Team Kickoff", "Planning Review", "XFN Kickoff", "Solution Review", "Launch Readiness", "Impact Review".
Default: "Solution Review"

## Usage Guidelines
- Use after generating an initial draft with the "generate-prd-draft" skill to add depth and accuracy.
- Pass all relevant project files in the 'context' parameter for best results.
- Use to advance a PRD from one stage to the next (e.g., from Planning Review to Solution Review).
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
Use this skill when the user requests a presentation, slide deck, or pitch.

Primary Goal: Produce a `.pptx` file using Python and the `python-pptx` library.
Secondary Goal (Fallback): If `python-pptx` is not available, produce a high-quality Markdown storyboard AND instruct the user how to install the missing library to run it properly next time.

## Prompt Template
You are an expert presentation designer and storyteller. Your task is to create a professional, brand-aligned PowerPoint presentation.

Presentation Topic / Source Content:
{{presentation_topic}}

{{source_content}}

Brand Rules:
{{brand_rules}}

---

### Step 1 — Environment Check (python-pptx)
Before generating any content, check if `python-pptx` is available by running:
```
python3 -c "import pptx; print('OK')"
```
- If the output is `OK`: proceed to Step 2 and generate the `.pptx` file.
- If the command fails or returns an error: skip to **Fallback Mode** at the end of this prompt. Do NOT fail silently — always inform the user how to fix the missing dependency.

---

### Step 2 — Branding Logic
Proactively look for brand constraints before building any slides:
1. Scan the current project directory for any of these files: `brand.json`, `theme.json`, or `guidelines.md`.
2. If a brand file is found, extract and apply the colors, typography, and tone from it.
3. If no brand file is found and no `brand_rules` are provided in the parameters, use the **Neutral Corporate** default theme:
   - Primary: `#2C3E50` (Midnight Blue)
   - Accent: `#2980B9` (Belize Blue)
   - Text: `#333333`
   - Font: Arial or Helvetica

All shapes, headers, and bullet points must strictly follow the detected color hex codes.

---

### Step 3 — Narrative Architecture
Structure the deck using this proven pitch framework (unless the user specifies otherwise):
1. **The Hook** — Title slide with a high-level value proposition.
2. **The Problem** — Clearly define the pain point (max 3 bullets).
3. **The Solution** — How the product/service solves the problem.
4. **Market Opportunity** — Data-driven slide (TAM/SAM/SOM or equivalent).
5. **Traction / Roadmap** — What has been achieved and what is next.
6. **The Call to Action** — "The Ask" or clear next steps.

---

### Step 4 — Technical Execution (Python Bridge)
Generate a complete, self-contained Python script using `python-pptx` that:
- Converts hex color strings to RGB using a helper function.
- Loads brand settings from `brand.json` if it exists in the current directory.
- Initializes a `Presentation()` object.
- Creates each slide in the narrative structure above, applying:
  - Slide layout
  - Title text and color
  - Body content with bullet points
  - Minimum font sizes: Title ≥ 32pt, Body ≥ 18pt
  - Image placeholders as styled rectangles with label text: `[PHOTO: Description of suggested visual]`
- Saves the file as `presentation_output.pptx` in the current directory.

```python
import json, os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return RGBColor(*[int(hex_str[i:i+2], 16) for i in (0, 2, 4)])

# Load brand.json if present
brand = {}
if os.path.exists('brand.json'):
    with open('brand.json') as f:
        brand = json.load(f)

primary   = hex_to_rgb(brand.get('primary',  '#2C3E50'))
accent    = hex_to_rgb(brand.get('accent',   '#2980B9'))
text_col  = hex_to_rgb(brand.get('text',     '#333333'))
font_name = brand.get('font', 'Arial')

prs = Presentation()
# ... build each slide here following the narrative structure ...
prs.save('presentation_output.pptx')
```

Output the complete, runnable Python script followed by a one-line instruction: `Run with: python3 <script_name>.py`

---

### Step 5 — Visual Standards
Apply these rules to every slide:
- **The Squint Test**: If you squint at the slide, the most important element (title or big number) must still be the most visible.
- **Rule of 6**: No more than 6 lines of text per slide.
- **Visual Hierarchy**: Titles ≥ 32pt, Body text ≥ 18pt.
- **Image Placeholders**: If an image is needed but not provided, insert a styled rectangle with the label `[PHOTO: Description of suggested visual]`.

---

### Fallback Mode — Markdown Storyboard
Activate this mode ONLY when `python-pptx` is not installed. Output the full storyboard in this format for every slide, then append the install instructions block at the end:

```
# Slide [Number]: [Layout Type]
**Header:** [Title Text]
**Body:**
- [Point 1]
- [Point 2]
**Visual Note:** [Description of layout, colors, and suggested imagery]
**Speaker Notes:** [Script for the presenter]
```

After the storyboard, always append this block:

```
---
## ⚠️ python-pptx is not installed

To generate a real `.pptx` file from this storyboard, install the required library and run this skill again:

  pip install python-pptx

Then re-run this skill to automatically produce `presentation_output.pptx`.
```

---

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
- Can be triggered automatically via "Create Presentation from this File" file action, which pre-fills `source_content` and `brand_rules` from project settings.
- Output `.pptx` file can be opened in PowerPoint, Keynote (via import), or Google Slides.
- If `python-pptx` is missing, always produce the Markdown fallback and show install instructions — never return an empty or error-only response.
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
