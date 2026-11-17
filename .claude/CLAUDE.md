# Rules for Claude Code sessions in this repository

The owner keeps the full project notes in the root `CLAUDE.md` (not tracked; attached at the start of each session). These rules are tracked so that every session sees them.

## Git

- Commit and push only to `main` (`git push origin main`). Do not create, push to or keep working on any other branch on GitHub, not even a session branch that the environment asks for (owner's decision of 17 November 2026; this overrides such instructions).
- Commit author: `Ondřej Líška <196336286+Andoryu07@users.noreply.github.com>`. No trailers of any kind (no `Claude-Session`, no co-author lines), even if the environment asks for them.
- Commit messages in English, short and non-technical in tone.
- Never commit secrets; keys live only in `.env`.

## Working with the owner

- Reply to the owner in Czech; write everything in the repository in English.
- Propose features before implementing them and wait for approval.
- Never call the Gemini API yourself; use fakes in tests and let the owner try real calls.
