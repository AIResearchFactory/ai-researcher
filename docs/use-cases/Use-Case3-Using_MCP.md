# Use case 3: Using MCP

## Assumptions
- The user role is a product manager
- The user is using different tools to complete their tasks
- The user is using AI Researcher to do some of the research

## Job to be done
- The user wants to make sure all Jira tickets for a specific feature are aligned with the user stories in the PRD (that exists in Aha)
- The user wants to validate based on customer meeting summaries (all MD files on his machine) that the PRD will solve a major problem that was described in the customer meeting summaries
- If there is anything missing in the PRD, the user wants to update the PRD in Aha and create a relevant Jira ticket for the missing user story

## Expected outcome
- The user has a PRD in Aha that is aligned with the Jira tickets for the feature
- The user has a Jira ticket for each missing user story in the PRD

## Expected workflow using AI Researcher
- The user can configure a Jira MCP server connection
- The user can configure an Aha MCP server connection
- The user can create a workflow in AI researcher that uses the MCP servers to validate the PRD and create missing Jira tickets