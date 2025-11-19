use axum::{
    extract::Query,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::borrow::Cow;

use crate::AppState;

/// Normalize user text for lightweight cue matching.
/// - Lowercases
/// - Replaces curly apostrophes (’ and ʻ) with ASCII ('), so “can’t” matches "can't" cues
/// - Collapses multiple whitespace to single spaces
fn normalize_text(input: &str) -> Cow<'_, str> {
    if input.is_empty() {
        return Cow::Borrowed("");
    }
    let mut out = String::with_capacity(input.len());
    let mut last_was_space = false;
    for ch in input.chars() {
        let ch = match ch {
            '\u{2019}' | '\u{02BB}' => '\'', // ’ or ʻ → '
            _ => ch,
        };
        let ch = ch.to_ascii_lowercase();
        if ch.is_whitespace() {
            if !last_was_space {
                out.push(' ');
                last_was_space = true;
            }
        } else {
            out.push(ch);
            last_was_space = false;
        }
    }
    Cow::Owned(out)
}

/// -------- Pattern detection (very lightweight heuristic) --------

#[derive(Deserialize)]
pub struct DetectRequest {
    pub text: String,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct DetectResponse {
    pub role: String,
    pub confidence: f32,
    pub cues: Vec<String>,
}

/// -------- Number signal vs anxiety-loop (Numbers module hook) --------

#[derive(Deserialize)]
pub struct NumberSignalRequest {
    /// e.g. "09:09", "111", "2025-11-19"
    pub label: String,
    /// Optional felt effect in the body, e.g. "calm", "relief", "tense", "tight"
    pub effect: Option<String>,
}

#[derive(Serialize, Clone, Copy)]
#[serde(rename_all = "snake_case")]
pub enum PatternCategory {
    Mirror,
    Repeat,
    Sequence,
    None,
}

#[derive(Serialize, Clone, Copy)]
#[serde(rename_all = "snake_case")]
pub enum SignalStrength {
    Low,
    Medium,
    High,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct NumberSignalResponse {
    /// "signal", "anxiety_loop", or "neutral"
    pub classification: &'static str,
    pub reasoning: &'static str,
    pub category: PatternCategory,
    pub strength: SignalStrength,
}

fn classify_label_pattern(label: &str) -> (PatternCategory, SignalStrength) {
    // Strip everything except ASCII digits so "11:11" and "11-11" both reduce to "1111"
    let digits: String = label.chars().filter(|c| c.is_ascii_digit()).collect();

    if digits.is_empty() {
        return (PatternCategory::None, SignalStrength::Low);
    }

    let bytes = digits.as_bytes();

    // All digits the same → Repeat
    let all_same = digits
        .chars()
        .all(|c| Some(c) == digits.chars().next());

    // Palindromic (but not trivially all-same) → Mirror
    let is_palindrome = digits.chars().eq(digits.chars().rev());

    // Simple ascending/descending sequence like 1234 or 4321 → Sequence
    let is_sequence = bytes.windows(2).all(|w| {
        let d0 = w[0];
        let d1 = w[1];
        d1 == d0 + 1 || d1 == d0 - 1
    });

    let category = if is_palindrome && !all_same {
        PatternCategory::Mirror
    } else if all_same {
        PatternCategory::Repeat
    } else if is_sequence {
        PatternCategory::Sequence
    } else {
        PatternCategory::None
    };

    let len = digits.len();
    let strength = match (category, len) {
        (PatternCategory::None, _) => SignalStrength::Low,
        (_, l) if l >= 4 => SignalStrength::High,
        _ => SignalStrength::Medium,
    };

    (category, strength)
}

fn classify_number_effect(
    effect: &str,
    category: PatternCategory,
    strength: SignalStrength,
) -> NumberSignalResponse {
    let e = effect.trim().to_ascii_lowercase();

    // Anything clearly in the "calm / relief / grounded" family → signal
    let calm_keywords = [
        "calm",
        "relief",
        "relieved",
        "grounded",
        "softer",
        "open",
        "ease",
        "eased",
    ];
    if calm_keywords.iter().any(|k| e.contains(k)) {
        return NumberSignalResponse {
            classification: "signal",
            reasoning: "effect described as calming/grounding → treat as signal",
            category,
            strength,
        };
    }

    // Anything clearly in the "tense / pressure / must guess" family → anxiety loop
    let tension_keywords = [
        "tense",
        "tension",
        "tight",
        "pressure",
        "obliged",
        "must",
        "panic",
        "urgency",
        "anxious",
        "anxiety",
    ];
    if tension_keywords.iter().any(|k| e.contains(k)) {
        return NumberSignalResponse {
            classification: "anxiety_loop",
            reasoning: "effect described as tense/pressured → treat as anxiety pattern",
            category,
            strength,
        };
    }

    // Otherwise, stay neutral; number alone is not decisive without a clear effect.
    NumberSignalResponse {
        classification: "neutral",
        reasoning: "no clear calming or tensing effect described → treat as neutral",
        category,
        strength,
    }
}

/// POST /patterns/number_signal
/// Minimal hook for the Numbers module:
/// we don't interpret the digits themselves for meaning,
/// only the *reported felt effect* plus simple emphasis patterns in the label.
pub async fn number_signal(Json(req): Json<NumberSignalRequest>) -> Json<NumberSignalResponse> {
    let label_trimmed = req.label.trim();

    if label_trimmed.is_empty() {
        return Json(NumberSignalResponse {
            classification: "neutral",
            reasoning: "no label provided → treat as neutral",
            category: PatternCategory::None,
            strength: SignalStrength::Low,
        });
    }

    // Always derive category/strength from the label, even if effect is present.
    let (category, strength) = classify_label_pattern(label_trimmed);

    // If an effect is provided, classification is driven by how it feels in the body.
    if let Some(effect) = req.effect.as_deref() {
        return Json(classify_number_effect(effect, category, strength));
    }

    // No felt effect → use label pattern as a light signal, if any.
    if let PatternCategory::None = category {
        Json(NumberSignalResponse {
            classification: "neutral",
            reasoning: "no felt effect and no strong pattern in label → treat as neutral",
            category,
            strength,
        })
    } else {
        Json(NumberSignalResponse {
            classification: "signal",
            reasoning: "label shows an emphasis pattern → treat as light signal",
            category,
            strength,
        })
    }
}

pub async fn detect_victim_aggressor(Json(req): Json<DetectRequest>) -> Json<DetectResponse> {
    let text = normalize_text(&req.text);

    // NOTE: totally naive cues; placeholders for future signal refinement.
    let victim_cues = ["always", "never", "can't", "can’t"];
    let aggressor_cues = ["must", "should", "control"];

    let mut victim_matches = Vec::new();
    let mut aggressor_matches = Vec::new();

    for cue in victim_cues.iter() {
        if text.contains(cue) {
            victim_matches.push(cue.to_string());
        }
    }
    for cue in aggressor_cues.iter() {
        if text.contains(cue) {
            aggressor_matches.push(cue.to_string());
        }
    }

    let victim_score = victim_matches.len() as f32 / victim_cues.len() as f32;
    let aggressor_score = aggressor_matches.len() as f32 / aggressor_cues.len() as f32;

    let (role, confidence, cues) = if victim_score > aggressor_score {
        ("Victim".to_string(), victim_score, victim_matches)
    } else if aggressor_score > victim_score {
        ("Aggressor".to_string(), aggressor_score, aggressor_matches)
    } else {
        ("Unclear".to_string(), 0.0, vec![])
    };

    Json(DetectResponse {
        role,
        confidence,
        cues,
    })
}

/// -------- Bridge suggestion (Emotion → micro-logic) --------

#[derive(Deserialize)]
pub struct BridgeQuery {
    /// e.g. "panic", "anxiety", "anger", "shame"
    pub kind: Option<String>,
    /// 0.0..=1.0; default 0.5 if omitted
    pub intensity: Option<f32>,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct BridgeSuggestion {
    pub pattern: &'static str, // high-level label
    pub hint: &'static str,    // compact micro-logic
    breath: &'static str,
    doorway: &'static str,
    anchor: &'static str,
}

fn bridge_table(kind: &str, intensity: f32) -> BridgeSuggestion {
    let k = kind.trim().to_ascii_lowercase();
    let i = intensity.clamp(0.0, 1.0);

    match k.as_str() {
        "panic" | "fear" | "anxiety" => {
            let high = i >= 0.6;
            BridgeSuggestion {
                pattern: "stabilize-first",
                hint: if high {
                    "Box breath, feet on floor, water sip"
                } else {
                    "Double exhale, orient to room"
                },
                breath: if high {
                    "box: in4-hold4-out6 × 4"
                } else {
                    "double_exhale × 6"
                },
                doorway: "sip water, feet on floor",
                anchor: "Name 3 objects you see.",
            }
        }
        "anger" => BridgeSuggestion {
            pattern: "decharge-then-name",
            hint: "Long exhale, shake arms 30s, soften jaw",
            breath: "in4-out8 × 6",
            doorway: "shake arms 30s, step outside",
            anchor: "Lower shoulders, soften jaw.",
        },
        "shame" => BridgeSuggestion {
            pattern: "worth-reminder",
            hint: "4–6 breath, hand to heart, 3 facts (no story)",
            breath: "4-6 breath × 6",
            doorway: "write 3 objective facts (no story)",
            anchor: "Hand over heart: 'still worthy'.",
        },
        "attachment_test" | "attachment-testing" | "attachment" => BridgeSuggestion {
            pattern: "ask-not-test",
            hint: "Name the fear plainly; ask for reassurance, not proof",
            breath: "in4-hold2-out6 × 3",
            doorway: "say: 'I feel scared of X. Can you reassure me?'",
            anchor: "One honest request, then pause.",
        },
        "sibling_trust" | "sibling-trust" | "sibling" => BridgeSuggestion {
            pattern: "boundary-then-bridge",
            hint: "State one boundary; decline forever-pact renewal",
            breath: "double_exhale × 6",
            doorway: "write a one-sentence boundary",
            anchor: "Love stays; pact ends.",
        },
        "parent_planted" | "parent-planted" | "parent" => BridgeSuggestion {
            pattern: "language-interrupt",
            hint: "Name the parental line; replace with a present-tense truth",
            breath: "4-6 breath × 6",
            doorway: "say: 'That’s mom’s line; my line is…'",
            anchor: "Author the present.",
        },
        "over_analysis" | "over-analysis" | "analysis" => BridgeSuggestion {
            pattern: "close-the-loop",
            hint: "Set 2‑min timer; one next step; archive and stop",
            breath: "in4-out6 × 6",
            doorway: "start a 2‑minute timer",
            anchor: "Clarity lands, then rest.",
        },
        "phantom_rival"
        | "phantom-rival"
        | "comparison_jealousy"
        | "comparison-jealousy"
        | "jealousy" => BridgeSuggestion {
            pattern: "reality-then-ask",
            hint: "In 3 / Out 6; list 3 facts vs 3 guesses; then ask, don’t accuse",
            breath: "in3-out6 × 6",
            doorway: "write 3 facts vs 3 guesses; one clear ask",
            anchor: "Presence over phantom.",
        },
        _ => BridgeSuggestion {
            pattern: "return-to-center",
            hint: "Stand up, shoulder roll, one true sentence",
            breath: "double_exhale × 6",
            doorway: "stand_up + shoulder_roll",
            anchor: "Return to center.",
        },
    }
}

/// Library helper: compute a bridge suggestion without going through HTTP.
/// Useful for other handlers (e.g., `/panic`) to reuse the same logic.
pub fn suggest_bridge(kind: &str, intensity: f32) -> BridgeSuggestion {
    bridge_table(kind, intensity)
}

/// GET /patterns/bridge_suggest?kind=panic&intensity=0.7
pub async fn bridge_suggest(Query(q): Query<BridgeQuery>) -> Json<serde_json::Value> {
    let kind = q.kind.as_deref().unwrap_or("panic");
    let intensity = q.intensity.filter(|v| v.is_finite()).unwrap_or(0.5);
    let out = bridge_table(kind, intensity);
    Json(json!({
        "pattern": out.pattern,
        "hint": out.hint,
        "breath": out.breath,
        "doorway": out.doorway,
        "anchor": out.anchor,
    }))
}

/// -------- Three-lane map (victim / aggressor / sovereign) --------
/// Name: we avoid "coin_map" to not center $; still acknowledge the
/// "two sides of a coin" metaphor. We expose it as `/patterns/lanes`.

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct LaneInfo {
    pub reflex: &'static str,
    pub fuel: &'static str,
    pub micro_hint: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "snake_case")]
pub struct LanesMap {
    pub victim: LaneInfo,
    pub aggressor: LaneInfo,
    pub sovereign: LaneInfo,
}

/// GET /patterns/lanes
pub async fn lanes() -> Json<LanesMap> {
    Json(LanesMap {
        victim: LaneInfo {
            reflex: "collapse / appease",
            fuel: "fear of loss, isolation",
            micro_hint: "name the need; one safe boundary",
        },
        aggressor: LaneInfo {
            reflex: "control / push",
            fuel: "fear of insignificance",
            micro_hint: "slow exhale; ask a real question",
        },
        sovereign: LaneInfo {
            reflex: "recenter / choose",
            fuel: "self-trust + relatedness",
            micro_hint: "breath, orient, speak one true line",
        },
    })
}

/// -------- Productivity patterns (rage→collapse; burnout cycle) --------
/// Mirrors docs/patterns/productivity-rage-collapse.md and
/// docs/patterns/productivity-burnout.md in a lightweight, structured way.
///
/// GET /patterns/productivity
pub async fn productivity_map() -> Json<serde_json::Value> {
    Json(json!({
        "rage_collapse": {
            "stages": [
                {
                    "stage": "drive / productive",
                    "signal": "hyper-focus, compulsive tidying, proving value",
                    "whisper": "I matter even if I pause.",
                    "bridge": {
                        "breath": "in4-out6 × 6",
                        "doorway": "set a 10‑min timer; sip water",
                        "anchor": "choose one helpful next step"
                    }
                },
                {
                    "stage": "rage",
                    "signal": "noise/throwing, demand to be seen",
                    "whisper": "Underneath is: please see my pain.",
                    "bridge": {
                        "breath": "in4-out8 × 6",
                        "doorway": "shake arms 30s; step outside",
                        "anchor": "name the need without blame"
                    }
                },
                {
                    "stage": "collapse",
                    "signal": "exhaustion; 'alone / no value'",
                    "whisper": "Rest is allowed.",
                    "bridge": {
                        "breath": "double_exhale × 6",
                        "doorway": "lie down 2 min, hand to heart",
                        "anchor": "say one true, kind line"
                    }
                }
            ],
            "loop_hint": "Close the loop with a tiny repair (a glass of water, a reset) and restart from center."
        },
        "burnout": {
            "stages": [
                {
                    "stage": "overdrive",
                    "signal": "chronic urgency, over‑giving",
                    "whisper": "Your worth is not your output.",
                    "micro_hint": "timebox; say no once"
                },
                {
                    "stage": "numb",
                    "signal": "flatness; joyless productivity",
                    "whisper": "Re‑orient to the body.",
                    "micro_hint": "stand up; shoulder roll"
                },
                {
                    "stage": "crash",
                    "signal": "can't start; self‑blame",
                    "whisper": "Protect sleep and basics.",
                    "micro_hint": "2‑minute tidy, then rest"
                }
            ],
            "team_tip": "Watch oscillations across a week; agree on yellow flags and a reset ritual.",
            "long_cycle_hint": "Watch for 4–6 month overdrive→crash cycles; plan a deload week each quarter; define early flags (sleep <6h, joyless grind, Sunday dread) and pre‑commit a reset ritual.",
            "personalization": {
                "example": "If your historical cycle is ~6 months, schedule a Month‑3 downshift: reduce commitments by ~20%, add restorative blocks, and run a quick systems audit."
            }
        }
    }))
}

/// Router to be mounted under `/patterns`
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/detect", post(detect_victim_aggressor))
        .route("/bridge_suggest", get(bridge_suggest))
        .route("/lanes", get(lanes))
        .route("/productivity", get(productivity_map))
        .route("/number_signal", post(number_signal))
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::Json;

    // --- bridge_suggest / bridge_table ---

    #[test]
    fn bridge_anxiety_low_uses_double_exhale() {
        let b = super::bridge_table("anxiety", 0.3);
        assert_eq!(b.pattern, "stabilize-first");
        assert!(b.breath.contains("double_exhale"));
        assert_eq!(b.anchor, "Name 3 objects you see.");
    }

    #[test]
    fn bridge_panic_high_uses_box_breath() {
        let b = super::bridge_table("panic", 0.9);
        assert_eq!(b.pattern, "stabilize-first");
        assert!(b.breath.contains("box"));
        assert_eq!(b.doorway, "sip water, feet on floor");
    }

    #[test]
    fn bridge_anger_pattern() {
        let b = super::bridge_table("anger", 0.5);
        assert_eq!(b.pattern, "decharge-then-name");
        assert!(b.breath.contains("in4-out8"));
        assert_eq!(b.anchor, "Lower shoulders, soften jaw.");
    }

    #[test]
    fn bridge_shame_pattern() {
        let b = super::bridge_table("shame", 0.4);
        assert_eq!(b.pattern, "worth-reminder");
        assert!(b.hint.contains("facts"));
        assert!(b.anchor.contains("still worthy"));
    }

    #[test]
    fn bridge_default_fallback() {
        let b = super::bridge_table("unknown-kind", 0.4);
        assert_eq!(b.pattern, "return-to-center");
        assert!(b.breath.contains("double_exhale"));
        assert_eq!(b.doorway, "stand_up + shoulder_roll");
    }

    #[test]
    fn bridge_attachment_test_kind() {
        let b = super::bridge_table("attachment_test", 0.5);
        assert_eq!(b.pattern, "ask-not-test");
        assert!(b.hint.contains("reassurance"));
        assert!(b.breath.contains("out6"));
    }

    #[test]
    fn bridge_sibling_trust_kind() {
        let b = super::bridge_table("sibling_trust", 0.7);
        assert_eq!(b.pattern, "boundary-then-bridge");
        assert!(b.hint.contains("boundary"));
        assert!(b.anchor.contains("Love stays"));
    }

    #[test]
    fn bridge_parent_planted_kind() {
        let b = super::bridge_table("parent_planted", 0.4);
        assert_eq!(b.pattern, "language-interrupt");
        assert!(b.hint.contains("parental line"));
        assert!(b.anchor.contains("Author"));
    }

    #[test]
    fn bridge_over_analysis_kind() {
        let b = super::bridge_table("over_analysis", 0.3);
        assert_eq!(b.pattern, "close-the-loop");
        assert!(b.hint.contains("2‑min") || b.hint.contains("2-min"));
        assert!(b.anchor.to_lowercase().contains("rest"));
    }

    #[test]
    fn bridge_phantom_rival_kind() {
        let b = super::bridge_table("phantom_rival", 0.5);
        assert_eq!(b.pattern, "reality-then-ask");
        assert!(b.hint.to_lowercase().contains("facts"));
        assert!(b.hint.to_lowercase().contains("ask"));
        assert!(b.anchor.to_lowercase().contains("phantom"));
    }

    #[test]
    fn intensity_is_clamped() {
        let hi = super::bridge_table("panic", 100.0);
        let lo = super::bridge_table("panic", -5.0);
        // one of them must end up using a branch without panic
        assert!(hi.breath.contains("box"));
        assert!(lo.breath.contains("double_exhale"));
    }

    // --- detect_victim_aggressor ---

    #[tokio::test]
    async fn detect_marks_aggressor_on_control_language() {
        let resp = super::detect_victim_aggressor(Json(DetectRequest {
            text: "I must control this or else".into(),
        }))
        .await;
        let out = resp.0;
        assert_eq!(out.role, "Aggressor");
        assert!(out.cues.contains(&"must".to_string()));
        assert!(out.cues.contains(&"control".to_string()));
        assert!(out.confidence > 0.0);
    }

    #[tokio::test]
    async fn detect_marks_victim_on_cant_never_language() {
        let resp = super::detect_victim_aggressor(Json(DetectRequest {
            text: "I can’t, I never succeed".into(),
        }))
        .await;
        let out = resp.0;
        assert_eq!(out.role, "Victim");
        assert!(out.cues.iter().any(|c| c == "never" || c == "can't"));
    }

    #[tokio::test]
    async fn detect_handles_curly_apostrophe() {
        let resp = super::detect_victim_aggressor(Json(DetectRequest {
            text: "I can’t do this".into(),
        }))
        .await;
        let out = resp.0;
        assert_eq!(out.role, "Victim");
        assert!(out.cues.iter().any(|c| c == "can't" || c == "can’t"));
    }

    #[tokio::test]
    async fn detect_unclear_on_neutral_text() {
        let resp = super::detect_victim_aggressor(Json(DetectRequest {
            text: "The sky is blue today".into(),
        }))
        .await;
        let out = resp.0;
        assert_eq!(out.role, "Unclear");
        assert_eq!(out.cues.len(), 0);
        assert_eq!(out.confidence, 0.0);
    }

    // --- number_signal ---

    #[tokio::test]
    async fn number_signal_classifies_calm_as_signal() {
        let resp = super::number_signal(Json(super::NumberSignalRequest {
            label: "09:09".into(),
            effect: Some("I feel more calm and relieved".into()),
        }))
        .await;
        let out = resp.0;
        assert_eq!(out.classification, "signal");
    }

    #[tokio::test]
    async fn number_signal_classifies_tense_as_anxiety_loop() {
        let resp = super::number_signal(Json(super::NumberSignalRequest {
            label: "11:11".into(),
            effect: Some("I feel tense and pressured to decode it".into()),
        }))
        .await;
        let out = resp.0;
        assert_eq!(out.classification, "anxiety_loop");
    }

    #[tokio::test]
    async fn number_signal_without_effect_uses_label_pattern_as_signal() {
        let resp = super::number_signal(Json(super::NumberSignalRequest {
            label: "22:22".into(),
            effect: None,
        }))
        .await;
        let out = resp.0;
        assert_eq!(out.classification, "signal");
    }

    // --- Lanes ---

    #[tokio::test]
    async fn lanes_has_three_routes() {
        let Json(map) = super::lanes().await;
        assert_eq!(map.victim.reflex, "collapse / appease");
        assert_eq!(map.aggressor.reflex, "control / push");
        assert_eq!(map.sovereign.reflex, "recenter / choose");
        assert!(map.victim.micro_hint.contains("boundary"));
        assert!(map.aggressor.micro_hint.contains("question"));
        assert!(map.sovereign.micro_hint.contains("true line"));
    }

    #[tokio::test]
    async fn productivity_map_has_both_groups() {
        let Json(val) = super::productivity_map().await;
        // Ensure top-level keys exist
        assert!(val.get("rage_collapse").is_some());
        assert!(val.get("burnout").is_some());

        // Basic shape checks
        let rc = val.get("rage_collapse").unwrap();
        let stages = rc.get("stages").and_then(|s| s.as_array()).unwrap();
        assert!(stages.len() >= 3);
        assert!(stages
            .iter()
            .any(|s| s.get("stage").and_then(|x| x.as_str()) == Some("rage")));

        let bo = val.get("burnout").unwrap();
        let bo_stages = bo.get("stages").and_then(|s| s.as_array()).unwrap();
        assert!(bo_stages.len() >= 3);
        assert!(bo_stages
            .iter()
            .any(|s| s.get("stage").and_then(|x| x.as_str()) == Some("overdrive")));
    }
}
