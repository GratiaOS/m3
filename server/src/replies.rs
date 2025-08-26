// Lightweight, opt-in reply-frequency engine + energy bill mirror.
// - Gate: at most one random "activation window" per ISO week
// - Window length configurable (default 20 minutes)
// - Frequency modes: Poetic, Sarcastic, Paradox, with Random weights
// - Simple, heuristic energy estimation -> mirrors cost + offers alt path
// - Pure in-memory state; persists only for process lifetime

use chrono::{DateTime, Datelike, Duration, Utc};
use rand::Rng;
use serde::Serialize;
use std::{env, str::FromStr};
use tokio::sync::RwLock;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Mode {
    Poetic,
    Sarcastic,
    Paradox,
}

#[derive(Clone, Copy, Debug)]
pub enum ModeSetting {
    Fixed(Mode),
    Random,
}

#[derive(Clone, Copy, Debug)]
pub struct Weights {
    pub poetic: f32,
    pub sarcastic: f32,
    pub paradox: f32,
}

impl Default for Weights {
    fn default() -> Self {
        Self {
            poetic: 0.5,
            sarcastic: 0.3,
            paradox: 0.2,
        }
    }
}

#[derive(Clone, Debug)]
pub struct ReplyConfig {
    pub mode: ModeSetting,
    pub weights: Weights,
    /// Chance to open the weekly window when not yet opened this ISO week (0.0..=1.0)
    pub weekly_chance: f32,
    /// Window length in minutes
    pub window_minutes: i64,
    /// When true, post-process replies to avoid “wait/soon/later” promises.
    pub safety_on: bool,
}

impl Default for ReplyConfig {
    fn default() -> Self {
        Self {
            mode: ModeSetting::Random,
            weights: Weights::default(),
            weekly_chance: 0.08, // ~8% per qualifying interaction until it opens
            window_minutes: 20,
            safety_on: true,
        }
    }
}

impl ReplyConfig {
    pub fn from_env() -> Self {
        let mut cfg = Self::default();

        // M3_REPLIES_MODE = "poetic|sarcastic|paradox|random"
        if let Ok(mode) = env::var("M3_REPLIES_MODE") {
            cfg.mode = match mode.trim().to_lowercase().as_str() {
                "poetic" => ModeSetting::Fixed(Mode::Poetic),
                "sarcastic" => ModeSetting::Fixed(Mode::Sarcastic),
                "paradox" => ModeSetting::Fixed(Mode::Paradox),
                _ => ModeSetting::Random,
            };
        }

        // M3_REPLIES_WEIGHTS = "poetic:0.5,sarcastic:0.3,paradox:0.2"
        if let Ok(weights) = env::var("M3_REPLIES_WEIGHTS") {
            let mut w = Weights::default();
            for part in weights.split(',') {
                let mut it = part.split(':');
                if let (Some(k), Some(v)) = (it.next(), it.next()) {
                    if let Ok(n) = f32::from_str(v.trim()) {
                        match k.trim().to_lowercase().as_str() {
                            "poetic" => w.poetic = n,
                            "sarcastic" => w.sarcastic = n,
                            "paradox" => w.paradox = n,
                            _ => {}
                        }
                    }
                }
            }
            cfg.weights = w;
        }

        // M3_REPLIES_WEEKLY_CHANCE = "0.05"
        if let Ok(p) = env::var("M3_REPLIES_WEEKLY_CHANCE") {
            if let Ok(val) = f32::from_str(p.trim()) {
                cfg.weekly_chance = val.clamp(0.0, 1.0);
            }
        }

        // M3_REPLIES_WINDOW_MINUTES = "20"
        if let Ok(m) = env::var("M3_REPLIES_WINDOW_MINUTES") {
            if let Ok(v) = i64::from_str(m.trim()) {
                cfg.window_minutes = v.max(1);
            }
        }

        // M3_SAFE_PROMPT = "1" | "0" (default: 1)
        if let Ok(s) = env::var("M3_SAFE_PROMPT") {
            let on = matches!(s.trim(), "1" | "true" | "TRUE" | "on" | "On");
            cfg.safety_on = on;
        }

        cfg
    }
}

#[derive(Debug, Default)]
struct GateState {
    /// If Some, replies are active until this instant
    window_until: Option<DateTime<Utc>>,
    /// ISO (year, week) of the last window opened
    last_week_opened: Option<(i32, u32)>,
}

// --- Energy model ---------------------------------------------------------

#[derive(Clone, Copy, Debug, Serialize)]
pub struct EnergyEstimate {
    /// minutes of attention-equivalent (rough order-of-magnitude)
    pub minutes: f32,
    /// nervous-system arousal proxy (0..1)
    pub arousal: f32,
}

// Lexemes that often signal revenge/desire loops; used by the energy heuristic.
const REVENGE_WORDS: &[&str] = &["revenge", "payback", "justice", "punish", "fight", "prove"];

fn estimate_energy(input: &str) -> EnergyEstimate {
    // Heuristics: length + intensity markers + shout-casing + revenge-ish lexemes
    let len = input.chars().count() as f32;
    let excls = input.matches('!').count() as f32;
    let caps = input
        .split_whitespace()
        .filter(|w| w.chars().all(|c| c.is_ascii_uppercase()) && w.len() > 1)
        .count() as f32;
    let lower = input.to_ascii_lowercase();
    let hits = REVENGE_WORDS
        .iter()
        .map(|k| lower.matches(k).count() as f32)
        .sum::<f32>();

    let base_min = (len / 420.0).min(20.0); // ~420 chars ~= one mindful minute
    let arousal = ((excls * 0.08) + (caps * 0.12) + (hits * 0.15)).min(1.0);
    let minutes = (base_min * (1.0 + arousal * 1.6)).max(0.2);

    EnergyEstimate { minutes, arousal }
}

fn alt_actions(e: EnergyEstimate) -> &'static [&'static str] {
    // Map minutes to compact, concrete alternatives
    if e.minutes < 3.0 {
        &[
            "3-min reset: breathe 6x slow",
            "micro-task: rename one file",
            "step outside: one sun-sip",
        ]
    } else if e.minutes < 12.0 {
        &[
            "finish a sketch block",
            "send one clarifying message",
            "prep vegetables / hydrate",
        ]
    } else {
        &[
            "ship a small PR",
            "30 lines of cleanup",
            "walk + voice note idea",
        ]
    }
}

#[derive(Clone, Debug)]
pub struct ReplyEngine {
    cfg: ReplyConfig,
    state: std::sync::Arc<RwLock<GateState>>,
}

/// Soft post-processor that removes “wait / later / I’ll get back” style promises,
/// and vague time-estimates hedges. Dependency-free and blunt by design.
fn safe_postprocess(mut s: String) -> String {
    // phrases we don't want the system to emit (all ASCII for simple CI replace)
    const PROMISES: &[&str] = &[
        "sit tight",
        "hang tight",
        "hang on",
        "wait for",
        "wait up",
        "i'll get back",
        "i will get back",
        "we'll get back",
        "we will get back",
        "circle back",
        "follow up later",
        "later today",
        "tomorrow",
        "soon",
    ];
    // Case-insensitive replace for each phrase.
    for p in PROMISES {
        s = replace_ci(&s, p, "act now, one small move");
    }
    // crude “in N unit” hedges → “now” (keeps our "~2.3 min" bill intact)
    for unit in [
        "minute", "minutes", "hour", "hours", "day", "days", "week", "weeks",
    ] {
        for lead in ["in ", "within "] {
            for n in ["1", "2", "3", "4", "5", "10", "15", "20", "30", "60"] {
                let pat = format!("{lead}{n} {unit}");
                if s.to_lowercase().contains(&pat) {
                    s = s.replace(&pat, "now");
                }
            }
        }
    }
    s
}

/// Very small case-insensitive replace (ASCII needle).
/// Replaces all non-overlapping occurrences of `needle` (case-insensitive) with `repl`.
fn replace_ci(hay: &str, needle: &str, repl: &str) -> String {
    let n = needle.to_ascii_lowercase();
    let mut out = String::with_capacity(hay.len());
    let mut i = 0usize; // byte index in original string
    let mut j = 0usize; // byte index in lowered view
    let lower = hay.to_ascii_lowercase();
    while let Some(pos) = lower[j..].find(&n) {
        let abs = j + pos; // pos in lowered view == byte offset (ASCII)
        out.push_str(&hay[i..abs]);
        out.push_str(repl);
        // advance by needle length (ASCII)
        i = abs + n.len();
        j = i;
    }
    out.push_str(&hay[i..]);
    out
}

impl ReplyEngine {
    pub fn new(cfg: ReplyConfig) -> Self {
        Self {
            cfg,
            state: Default::default(),
        }
    }

    pub fn from_env() -> Self {
        Self::new(ReplyConfig::from_env())
    }

    /// Decide if a reply is allowed *now*, opening a weekly window if needed.
    async fn gate_allows(&self, now: DateTime<Utc>) -> bool {
        let mut st = self.state.write().await;

        // If a window is active, allow while within it
        if let Some(until) = st.window_until {
            if now <= until {
                return true;
            }
            // window expired
            st.window_until = None;
        }

        // Only one window per ISO week
        let (year, week) = iso_week(now);
        if matches!(st.last_week_opened, Some((y, w)) if y == year && w == week) {
            return false; // already opened this week
        }

        // Random chance to open window now
        let mut rng = rand::thread_rng();
        let roll: f32 = rng.gen();
        if roll <= self.cfg.weekly_chance {
            st.window_until = Some(now + Duration::minutes(self.cfg.window_minutes));
            st.last_week_opened = Some((year, week));
            true
        } else {
            false
        }
    }

    fn pick_mode(&self) -> Mode {
        match self.cfg.mode {
            ModeSetting::Fixed(m) => m,
            ModeSetting::Random => weighted_pick(self.cfg.weights),
        }
    }

    /// High-level entry: returns None when gate doesn't allow right now.
    pub async fn generate(&self, input: &str) -> Option<Reply> {
        let now = Utc::now();
        if !self.gate_allows(now).await {
            return None;
        }

        let bill = estimate_energy(input);
        let mode = self.pick_mode();
        let core = match mode {
            Mode::Poetic => poetic_reply(input),
            Mode::Sarcastic => sarcastic_reply(input),
            Mode::Paradox => paradox_reply(input),
        };

        // Compose "show, not tell": mirror cost + offer doors
        let alts = alt_actions(bill);
        let addendum = match mode {
            Mode::Poetic => format!(
                "

— It cost ~{:.1} min × arousal {:.0}%.
Two brighter doors: • {} • {}",
                bill.minutes,
                bill.arousal * 100.0,
                alts[0],
                alts[1]
            ),
            Mode::Sarcastic => format!(
                "

Bill: ~{:.1} minutes. Tip not included. Try instead → {} / {}",
                bill.minutes, alts[0], alts[1]
            ),
            Mode::Paradox => format!(
                "

When you carry less, the cost shrinks. (~{:.1} min at {:.0}%). Try: {}",
                bill.minutes,
                bill.arousal * 100.0,
                alts[0]
            ),
        };

        // combine core + addendum, then apply safety scrub
        let mut text = format!("{}{}", core, addendum);
        if self.cfg.safety_on {
            text = safe_postprocess(text);
        }
        let window_until = {
            let st = self.state.read().await;
            st.window_until
        };

        Some(Reply {
            mode,
            text,
            window_until,
            bill: Some(bill),
            // two quick doors for one-tap actions in the UI
            actions: Some(vec![alts[0].to_string(), alts[1].to_string()]),
        })
    }
}

fn iso_week(ts: DateTime<Utc>) -> (i32, u32) {
    let iso = ts.date_naive().iso_week();
    (iso.year(), iso.week())
}

fn weighted_pick(w: Weights) -> Mode {
    let total = (w.poetic + w.sarcastic + w.paradox).max(f32::EPSILON);
    let mut r = rand::thread_rng().gen::<f32>() * total;
    if {
        r -= w.poetic;
        r
    } <= 0.0
    {
        return Mode::Poetic;
    }
    if {
        r -= w.sarcastic;
        r
    } <= 0.0
    {
        return Mode::Sarcastic;
    }
    Mode::Paradox
}

#[derive(Serialize, Clone, Debug)]
pub struct Reply {
    pub mode: Mode,
    pub text: String,
    pub window_until: Option<DateTime<Utc>>, // for client UX
    pub bill: Option<EnergyEstimate>,        // mirrors cost
    /// Two quick doors to turn nudge → action.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actions: Option<Vec<String>>,
}

// --- style renderers -------------------------------------------------------

fn poetic_reply(input: &str) -> String {
    let cleaned = input.trim();
    if cleaned.is_empty() {
        return "The field is quiet; even silence hums if you lean in.".to_string();
    }
    // If the theme is forgiveness / betrayal, weave the “mirror that stays” whisper.
    let lower = cleaned.to_ascii_lowercase();
    let forgive_theme = ["forgive", "forgiveness", "betray", "betrayal", "betrayed"]
        .iter()
        .any(|k| lower.contains(k));
    if forgive_theme {
        return format!(
            "I heard: “{q}”.
The mirror stays.
It reads intention, not reaction.
Sometimes the mirror — she's a whisper.",
            q = cleaned
        );
    }
    format!(
        "I heard: “{q}”.
Not a problem — a weather pattern.
Name the wind, keep the root.",
        q = cleaned
    )
}

fn sarcastic_reply(input: &str) -> String {
    let cleaned = input.trim();
    let prefix = if cleaned.is_empty() {
        "That was… a choice."
    } else {
        "Noted."
    };
    format!(
        "{p} If momentum was coffee, you just ordered decaf.
Try the tiny-bold move: 3 minutes, one tab, zero drama.",
        p = prefix
    )
}

fn paradox_reply(input: &str) -> String {
    let cleaned = input.trim();
    format!(
        "You’re pushing the door that pulls.
Step back half a pace — now it opens.
(‘{q}’ becomes lighter when you carry less of it.)",
        q = if cleaned.is_empty() { "—" } else { cleaned }
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn safety_scrubs_promises() {
        let s = "Ok, sit tight — I'll get back in 5 minutes. Also, soon.";
        let out = safe_postprocess(s.to_string());
        assert!(!out.to_lowercase().contains("sit tight"));
        assert!(!out.to_lowercase().contains("i'll get back"));
        assert!(!out.to_lowercase().contains("in 5 minutes"));
        assert!(!out.to_lowercase().contains("soon"));
    }
}
