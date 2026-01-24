---
description: UI/UX Improvement Workflow (Multi-Agent)
---

This workflow is designed to overhaul the application's user experience, focusing on the Installer, Onboarding, and General Desktop UI. It starts with a UX audit and moves to implementation using the standard feature development process.

### 1. UX Audit & Design Specification (Role: UX Expert)
1. **Analyze Existing UI/UX**:
   - inspect the core frontend entry points: `src/App.tsx`, `src/main.tsx`.
   - Review global styling and theme: `src/styles.css`, `tailwind.config.js`.
   - List and review key pages in `src/pages` (look for Onboarding, Home, etc.).
   - List and review key components in `src/components`.
   - Check window/installer configuration in `src-tauri/tauri.conf.json` (window size, decorations, transparency).

2. **Design Strategy**:
   - Develop a "Premium" design concept (vibrant colors, glassmorphism, micro-animations) as per the `<web_application_development>` guidelines.
   - Focus on three key areas:
     - **Installer/First Launch**: How the app window looks immediately upon opening (frameless? splash screen?).
     - **Onboarding**: Simplify and beautify the setup flow.
     - **Main Desktop App**: Improve navigation, typography, and visual hierarchy.

3. **Output Specifications**:
   - Create a detailed design document: `docs/UX_IMPROVEMENT_PLAN.md`.
   - Include specific instructions for Tailwind classes, animation libraries (e.g., Framer Motion if needed), and layout changes.
   - If useful, use the `generate_image` tool to create mockups of the proposed UI and save them to `docs/mockups/`.

### 2. Feature Conversion (Role: Product Architect)
1. Read the `docs/UX_IMPROVEMENT_PLAN.md`.
2. Break down the plan into discrete, implementable Feature Requests (e.g., "Revamp Onboarding Steps", "Style Main Navigation", "Update Window Config").
3. Create a tracking list (e.g., in `docs/UX_TASKS.md`) to manage these items.

### 3. Implementation Cycle (Role: Full Stack Developer)
*Repeat this process for each feature defined in Step 2.*

1. **Select a Feature** from `docs/UX_TASKS.md`.
2. **Execute Feature Development**:
   - Follow the instructions in **`.agent/workflows/feature-development.md`** for this specific feature.
   - **Crucial**: Ensure you strictly adhere to the "Design Aesthetics" rules (Premium, No Placeholders, Modern Typography).
3. **Verify**:
   - Ensure the new UI matches the `UX_IMPROVEMENT_PLAN.md`.
   - Mark the task as "Complete" in `docs/UX_TASKS.md`.
