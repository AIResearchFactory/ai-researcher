# Use case 2: Using workflows

## Assumptions
- The user role is a product manager
- One of the user's tasks is to do competitive research
- The user is using Gemini to do some of the research but have little time to do so

## Job to be done
- The user has a list of competitors for their product and wants to do competitive research on them
- For each competitor the user needs to search for the existing capabilities and features of the competitor
- To finish the research, the user needs to summarize all the existing capabilities and features of each competitor
- This task needs to happen every quarter but it is time consuming and the user doesn't have time to do it

## Expected outcome
- The user wants to have a file for each competitor with current features and capabilities
- The user wants to have a summary table comparing their own product capabilities and features with the competitors based on the recent research

## Expected workflow using AI Researcher
1. The user creates a new project folder
2. The user creates a new file with a list of competitors
3. The user creates a new workflow that takes the list of competitors and does competitive research on each competitor
4. AI Researcher will run on the list of competitors in parallel and create an updated file for each competitor with the current features and capabilities
5. AI Researcher will create an updated summary file comparing the user's product capabilities vs the competitors capabilities
