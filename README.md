# Only One Life

A solo, decision-based life simulation built with **React Native**.
You start as a nobody and climb your way up — **every choice matters**, and the world fights back with **random events** that can change your path.

## 🎮 Concept

- **Single-player** narrative / simulation game
- **Choices + consequences** (your decisions shape stats, status, relationships, resources)
- **System randomness** (events, luck, risk, surprises) so every run can feel different
- **First setting:** Medieval rise — from **peasant** → **knight / feudal lord / (and more)**

## 🧭 Gameplay loop (high level)

1. You get a situation (story card / event)
2. You pick an option (A/B/C...)
3. The system applies:
   - direct consequences (gain/lose money, reputation, health, etc.)
   - **random modifier** (luck, risk roll, hidden outcomes)

4. Your “life path” evolves: new opportunities unlock, others close.

## 🧱 Planned mechanics (draft)

- **Stats:** Health, Strength, Intelligence, Charisma, Reputation, Wealth
- **Roles / ranks:** Peasant → Worker → Soldier → Knight → Lord (etc.)
- **Resources:** gold, food, equipment, time/energy
- **Events:** work, fights, taxes, festivals, wars, illness, mentors, betrayals
- **Progression:** unlock new locations + storylines as your rank grows

## 🎞️ Visual style & animations (idea)

The goal is to make it feel alive using animations instead of heavy 3D:

- animated “story cards”
- small character + background motion
- simple FX for outcomes (spark, shake, fade, coins, etc.)

**Not sure how yet — this repo will be my playground to explore it.**

## 🛠️ Tech stack

- **React Native**
- TypeScript (planned)
- Animations: TBD (Reanimated / Lottie / Skia — will experiment)

## 🗺️ Roadmap (early)

- [ ] Define core stats & progression rules
- [ ] Build “event card” UI + choice system
- [ ] Add RNG system (rolls, probabilities, modifiers)
- [ ] First medieval event pack (10–20 events)
- [ ] Basic animations for transitions and outcomes
- [ ] Save/load (local storage)
- [ ] Expand paths (knight / lord / outlaw / monk / merchant…)

## 📌 Inspiration

Text-based life sims, roguelike runs, choice-driven narrative games — but optimized for mobile and built to be easily expandable with new settings later (zombies / sci-fi / modern life / etc.).

---

If you found this interesting — ⭐ the repo (when it’s public) and feel free to open an issue with ideas.
