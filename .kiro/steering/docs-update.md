---
inclusion: auto
---

# Documentation Update Rule

Whenever any code change is made to this project (new commands, modified behavior, new features, changed parameters, etc.), you MUST also update the following documentation files if relevant:

1. **README.md** — Developer/admin documentation. Update if:
   - New commands added
   - Project structure changes
   - New environment variables needed
   - New dependencies
   - Architecture changes
   - New features

2. **COMMANDS.md** — User-facing documentation. Update if:
   - New slash commands added
   - Command parameters changed
   - New input formats supported
   - New aliases added
   - Output format changed
   - New features users need to know about

3. **/help command** (`src/commands/help.js`) — In-Discord guide. Update if:
   - New commands added
   - Usage examples changed

Always keep all three docs in sync with the actual code behavior.
