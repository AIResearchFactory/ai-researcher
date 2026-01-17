---
description: Feature Development Workflow (Multi-Agent)
---

This workflow guides the end-to-end process of implementing a new feature or fixing a bug using a multi-agent approach.

### 1. Version Control Setup
// turbo
1. Check current git branch. If on `main` or `master`, create and switch to a new descriptive branch: `git checkout -b feature/requirement-name`.
2. Ensure the working directory is clean.

### 2. Architecture & Design (Role: Architect)
1. Analyze the requirements thoroughly.
2. Define the architectural approach, including:
    - Component structure and data flow.
    - Integration points.
    - Performance and scalability considerations.
3. Establish best practices and design patterns specifically for this implementation.
4. Document the design in a temporary research file or implementation plan.

### 3. Implementation (Role: Senior Software Engineer)
1. Implement the feature according to the architect's design.
2. Follow the established best practices.
3. Ensure the code is clean, readable, and properly modularized.
4. Verify basic functionality as you develop.

### 4. Quality Assurance (Role: QA Architect)
1. Review the implemented changes.
2. Evaluate the implementation against the architectural design and best practices.
3. Perform exploratory testing and edge-case analysis.
4. Identify any defects, inconsistencies, or architectural violations.
5. If defects are found, return to step 3 for the Senior SE to address them.

### 5. Automation & Regression (Role: Automation Engineer)
1. Run all existing automated tests to ensure no regressions were introduced.
2. Create new automated tests (unit, integration, or e2e) covering the new functionality.
3. Ensure all tests pass with high confidence.

### 6. Completion & Submission
1. Review the final state of the code.
// turbo
2. Add all changes: `git add .`
// turbo
3. Commit with a descriptive message: `git commit -m "feat: implement requirement following architect guidelines"`
// turbo
4. Push the branch to the remote repository: `git push -u origin feature/branch-name`
5. Open a Pull Request via the browser or CLI if available.
