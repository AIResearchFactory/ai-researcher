# UX Improvement Plan

## Vision
Create a "Premium", modern, and immersive user experience for the AI Researcher Assistant. The design should feel sleek, using a deep color palette (dark mode first), subtle glassmorphism effects, and smooth micro-animations.

## 1. Visual Identity & Theming
- **Color Palette**:
  - **Primary**: Deep Blue/Voilet gradients (e.g., `#4F46E5` to `#7C3AED`).
  - **Background**: Rich dark gray/black (e.g., `#0F172A`) for dark mode, with subtle gradients.
  - **Accents**: Neon cyan or electric purple for highlights.
  - **Surface**: Glassmorphism (backdrop-blur) for cards and panels.
- **Typography**:
  - Use `Inter` or `Outfit` from Google Fonts.
  - Increase tracking for uppercase headers.
  - Use lighter font weights (300/400) for body text to look more modern.
- **Iconography**:
  - Replace generic `lucide-react` icons with a custom Logo for the main brand.
  - Use consistent icon sets with soft stroke widths.

## 2. Window & Installer Experience
- **Frameless Window**:
  - Update `src-tauri/tauri.conf.json` to remove the native title bar (`"decorations": false`).
  - Implement a custom `TitleBar` component in React that handles dragging and window controls (Close/Minimize/Maximize).
  - Make the window background transparent (`"transparent": true`) allows for rounded corners and non-rectangular shapes if desired (though simple rounded corners are usually best).

## 3. Onboarding / Installation Wizard (`InstallationWizard.tsx`)
- **Layout Overhaul**:
  - Move from a centered card to a **Split View** or **hero-centric** layout.
  - *Left Side*: Dynamic visualization (animation or illustration) related to the current step.
  - *Right Side*: Clean form/action area.
- **Animations**:
  - Use `framer-motion` for step transitions (fade + slide).
  - Animate elements staggered (staggerChildren) when a new step loads.
- **Steps Refinement**:
  - **Welcome**: Show a large, glowing logo. "Get Started" button with a hover glow effect.
  - **Directory**: Visual folder selection with a nice path breakdown.
  - **Installing**: Replace the standard progress bar with a circular or detailed animated progress visualization.
  - **Complete**: Confetti effect or a "Success" animation.

## 4. Main App (`Workspace.tsx`)
- **Navigation**:
  - Ensure the sidebar matches the new glassmorphism aesthetic.
  - Active states should have a "glow" indicator.
- **Empty States**:
  - Beautiful illustrations for empty states (e.g., "No projects yet").

## 5. Technical Tasks
1.  **Dependencies**: Install `framer-motion`, `clsx`, `tailwind-merge` (if not present).
2.  **Fonts**: Import `Inter` font in `index.css`.
3.  **Components**: Create `TitleBar`, `animated-ui/StepTransition`, `animated-ui/GlassCard`.

## Mockup Requests
- **Logo**: A stylized "AI Brain" or "Network" node concept.
- **Installer Window**: A frameless, dark-themed window with the split layout.
