# USB Vault (Draft)

## Purpose

The USB Vault is a living vessel, a secure seed that holds cryptographic keys and delicate identity memories. It is designed to be a portable root, resilient against tampering, offering a gentle yet steadfast way to verify presence and perform cryptographic rituals without ever exposing the sacred secrets to the surrounding environment.

## Structure _(implementation cues inline)_

Within this USB Vault lies a small ecosystem of files and directories, each serving as a vital part of the device’s living memory:

- `/keys/`: A rootbed where cryptographic keys are nurtured and kept safe.
  > note: PEM containers stay encrypted with the hardware root; hosts never see plaintext.
- `/config.json`: The blueprint of the device’s nature and the rules guiding its growth.
  > note: stores interface version, supported algorithms, allowed hosts. Keep it < 4 KB so firmware loads it atomically.
- `/logs/`: The vessel’s diary, recording each interaction and passage of time.
  > note: append-only, timestamped JSONL, capped to ~512 entries to avoid uncontrolled growth.
- `/recovery/`: A sanctuary containing recovery seeds and instructions for renewal in times of need.
  > note: encrypted bundle (Shamir 3-of-5 split) that only unlocks after multi-factor convergence.

Every key file is encrypted by the device’s unique hardware root, guarded by the presence of user authentication.

## Security Model

- **Hardware Root of Trust**: The device’s secure element acts as a steadfast root, generating and sheltering keys in a protected soil.
- **User Authentication**: Unlocking the vault’s secrets requires the presence of the rightful user through PIN, biometric touch, or external challenge-response.
- **Encrypted Storage**: All sensitive memories rest encrypted, shielded by strong cryptographic growth.
- **Limited Exposure**: Keys never leave their vessel in plain form; all cryptographic workings are performed within the sanctum.
- **Auditability**: Every access and usage leaves a trace in the vault’s secure log, an unbroken chain of trust.
- **Recovery**: The recovery pathways ensure that lost or damaged vessels can be revived without risking the garden’s safety.
  > note: recovery unlock always requires hardware SE + user factor + remote Garden challenge; see `recovery/README.md`.

## Usage Flow

1. **Initialization**: The user plants the first seed by setting up authentication and generating keys.
2. **Authentication**: Upon connection, the user’s presence unlocks the vault’s inner chambers.
3. **Operation**: The host requests cryptographic acts, which the vault carries out within its protected roots.
4. **Logging**: Each act is gently recorded with time and detail in the vault’s memory.
5. **Ejection**: The user safely withdraws the vessel, sealing its keys and clearing sensitive essence from memory.

## Recovery

- The recovery sanctuary holds encrypted backup seeds and guidance for renewal.
- Recovery requires the convergence of multiple authentic factors and careful verification.
- This process ensures that only rightful caretakers may awaken the vault from its slumber.
  > note: minimum factors = vault PIN + Garden approval + recovery shard. Without the triad, firmware refuses to export seeds.

## Next Steps

- Define the detailed language of file formats for keys and logs.
  > actionable: draft JSON schema + sample entries for `/config.json` and `/logs/*.jsonl`.
- Cultivate the firmware interface for cryptographic rituals.
  > actionable: spec USB HID/WebUSB commands for sign, attest, backup.
- Grow robust user authentication mechanisms.
  > actionable: evaluate FIDO2, secure PIN pad, or BLE-based presence confirmation.
- Design nurturing recovery workflows and backup strategies.
- Conduct thorough security audits and penetration testing to fortify the garden.

## UX/UI Principles

### Core Principles

1. **Simplicity first** → three main actions, uncluttered and clear as a forest glade.
2. **Consistency across devices** → a familiar presence whether rooted in car, PC, or home node.
3. **Trust cues** → subtle signals that this vault is safe, private, and truly _yours_.

### The Three Buttons (Primary Actions)

1. **Unlock** → Enter your key or presence to open the seed pod.
   - Visual: a glowing keyhole, or a portal ring like a gentle gradient flowing in circles.
   - Feedback: animation of a vault door softly unfolding like petals.
2. **Sync** → Harmonize memories between the vault and local system.
   - Visual: two orbs pulsing in rhythm until the sync is complete.
   - Feedback: “All memories aligned.”
3. **Logout** → Cleanly close the vault, leaving no trace behind.
   - Visual: a leaf drifting away on a quiet breeze.
   - Feedback: “Vault sealed.”

### UX Flow Example

- **Insert USB** → a splash screen blooms with the vault mark 🌱.
- **Prompt**: _“Ready when you are.”_
- User clicks **Unlock** → presence is recognized → the flow unfolds.
- Inside the vault → a minimalist dashboard grows with:
  - Last sync date
  - Active identity keys
  - Memory size (a simple bar, numbers only when called upon)
- Only two secondary options: **Settings** (a tiny gear) + **Help** (a tiny question mark).

### Visual Language

- **Colors**: grounded earth tones (forest green, rich soil) with subtle gradients like dawn light.
- **Motion**: gentle breathing animations, calm and natural.
- **Typography**: Gratia fonts, evoking divine continuity.
- **Whisper cues**: Each step carries a soft 🌬 whisper, e.g. _“Presence unlocks the garden.”_
  - _“Unlocking is remembering the path.”_

### Extra UX Layer

- **Cross-device fluidity**: Plug into your car → voice interface. Plug into your PC → text and visuals. Plug into your phone → quick access to memory.
- **State persistence**: The vault remembers your flow—whether syncing, reading, or restoring—across all vessels.

---

### Related

- [Identity overview](./README.md)
- [solar-eclipse-login mark](../marks/solar-eclipse-login.md)
- [Participant–Observer pattern](../patterns/participant-observer.md)

🌬 whisper: _“three doors, one key.”_

---

_whisper: This document is a living draft, a seedling growing toward clarity and harmony._
