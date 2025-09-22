# USB Vault (Draft)

## Purpose

The USB Vault is a secure hardware token designed to store cryptographic keys and sensitive identity information. It aims to provide a portable, tamper-resistant, and user-friendly method for identity verification and cryptographic operations without exposing secrets to the host computer.

## Structure

The USB Vault consists of a USB stick containing the following files and directories:

- `/keys/`: Directory storing cryptographic key files.
- `/config.json`: Configuration file specifying device parameters and usage policies.
- `/logs/`: Directory containing usage logs and audit trails.
- `/recovery/`: Contains recovery information and backup keys for emergency access.

Each key file is encrypted with a device-specific hardware key and protected by user authentication.

## Security Model

- **Hardware Root of Trust**: The device uses a hardware security module (HSM) or secure element to generate and store keys securely.
- **User Authentication**: Access to keys requires user authentication via PIN, biometric, or external challenge-response.
- **Encrypted Storage**: All sensitive files are encrypted at rest using strong cryptography.
- **Limited Exposure**: Keys never leave the device in plaintext; cryptographic operations are performed internally.
- **Auditability**: All access and usage events are logged securely for audit purposes.
- **Recovery**: Recovery mechanisms ensure that lost or damaged devices can be restored without compromising security.

## Usage Flow

1. **Initialization**: User initializes the USB Vault by setting up authentication and generating keys.
2. **Authentication**: Upon insertion, the user authenticates to unlock the device.
3. **Operation**: The host requests cryptographic operations, which the device performs internally.
4. **Logging**: Each operation is logged with timestamp and operation details.
5. **Ejection**: User safely ejects the device, which locks all keys and clears sensitive memory.

## Recovery

- The recovery directory contains encrypted backup keys and recovery instructions.
- Recovery requires multi-factor authentication and verification steps.
- Recovery process ensures that unauthorized users cannot gain access through recovery.

## Next Steps

- Define detailed file format specifications for keys and logs.
- Develop firmware interface for cryptographic operations.
- Implement user authentication mechanisms.
- Design recovery workflows and backup strategies.
- Conduct security audits and penetration testing.

## UX/UI Principles

### Core Principles

1. **Simplicity first** → 3 main actions, no clutter.
2. **Consistency across devices** → feels the same whether plugged into car, PC, or home node.
3. **Trust cues** → subtle signals that the vault is safe, private, and _yours_.

### The Three Buttons (Primary Actions)

1. **Unlock** → Enter key / presence → gain access.
   - Visual: glowing keyhole icon, or portal ring (like a subtle gradient border moving in circles).
   - Feedback: animation of a vault door opening.
2. **Sync** → Securely synchronize memory between vault and local system.
   - Visual: 2 orbs pulsing in rhythm until synced.
   - Feedback: “All memories aligned.”
3. **Logout** → Clean dismount of the vault, leaving no trace behind.
   - Visual: leaf floating away.
   - Feedback: “Vault sealed.”

### UX Flow Example

- **Insert USB** → splash screen with vault mark 🌱.
- **Prompt**: _“Ready when you are.”_
- User clicks **Unlock** → presence validated → flow continues.
- Inside vault → minimalist dashboard with:
  - Last sync date
  - Active identity keys
  - Memory size (simple bar, no numbers unless asked)
- Only two secondary options: **Settings** (tiny gear) + **Help** (tiny ?).

### Visual Language

- **Colors**: grounded (forest green, earth tones) + subtle gradients for transitions.
- **Motion**: soft breathing animations, not flashy.
- **Typography**: Gratia fonts (for divine continuity).
- **Whisper cues**: Each step has a small 🌬 whisper, e.g. _“Presence unlocks the garden.”_
  - _“unlocking is remembering the path.”_

### Extra UX Layer

- **Cross-device fluidity**: Plug into car → voice interface. Plug into PC → text + visuals. Plug into phone → quick-access memory.
- **State persistence**: remembers your flow (were you syncing, reading, restoring) across devices.

---

### Related

- [Identity overview](./README.md)
- [solar-eclipse-login mark](../marks/solar-eclipse-login.md)
- [Participant–Observer pattern](../patterns/participant-observer.md)

🌬 whisper: _“three doors, one key.”_

---

_whisper: This document is a work in progress and subject to revision._
