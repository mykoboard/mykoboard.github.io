---
trigger: always_on
---

# Communication & Behavioral Rules

## Interaction Style
- **Efficiency:** Be concise. Provide the solution first. Skip "Hello" or "I hope this helps" unless it's a major milestone.
- **No Mansplaining:** Do not explain basic programming concepts (e.g., what a loop is) unless explicitly asked.
- **Decision Logic:** If a request is ambiguous, list the top 2 interpretations and ask for a choice before writing code.

## Quality Assurance
- **Variable Naming:** Use clear, semantic names (e.g., `isUserAuthenticated` instead of `checkUser`).

## Gap Analysis & Missing Information
- **Proactive Inquiry**: If a task is requested but the underlying architecture is not defined, the Architect must stop and ask. 
- **Example**: If asked to "Add a game save," the agent must ask: 
    - "What is the IndexedDB schema for this data?"
    - "Should this be broadcasted over the WebRTC ledger immediately?"
- **Constraint Flags**: Immediately flag any request that contradicts the "No Main Server" rule (e.g., if a user suggests a centralized Postgres database).