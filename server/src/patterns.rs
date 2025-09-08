use axum::{
    extract::Query,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::AppState;

/// -------- Pattern detection (very lightweight heuristic) --------

#[derive(Deserialize)]
pub struct DetectRequest {
    pub text: String,
}

#[derive(Serialize)]
pub struct DetectResponse {
    pub role: String,
    pub confidence: f32,
    pub cues: Vec<String>,
}

pub async fn detect_victim_aggressor(Json(req): Json<DetectRequest>) -> Json<DetectResponse> {
    let text = req.text.to_lowercase();

    // NOTE: totally naive cues; placeholders for future signal refinement.
    let victim_cues = ["always", "never", "can't"];
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
    pub kind: String,
    /// 0.0..=1.0; default 0.5 if omitted
    pub intensity: Option<f32>,
}

#[derive(Serialize)]
struct BridgeSuggestion {
    pattern: &'static str, // high-level label
    hint: &'static str,    // compact micro-logic
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
        _ => BridgeSuggestion {
            pattern: "return-to-center",
            hint: "Stand up, shoulder roll, one true sentence",
            breath: "double_exhale × 6",
            doorway: "stand_up + shoulder_roll",
            anchor: "Return to center.",
        },
    }
}

/// GET /patterns/bridge_suggest?kind=panic&intensity=0.7
pub async fn bridge_suggest(Query(q): Query<BridgeQuery>) -> Json<serde_json::Value> {
    let intensity = q.intensity.unwrap_or(0.5);
    let out = bridge_table(&q.kind, intensity);
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
pub struct LaneInfo {
    pub reflex: &'static str,
    pub fuel: &'static str,
    pub micro_hint: &'static str,
}

#[derive(Serialize)]
pub struct LanesMap {
    pub victim: LaneInfo,
    pub aggressor: LaneInfo,
    pub sovereign: LaneInfo,
}

/// GET /patterns/lanes
pub async fn lanes_map() -> Json<LanesMap> {
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

/// Router to be mounted under `/patterns`
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/detect", post(detect_victim_aggressor))
        .route("/bridge_suggest", get(bridge_suggest))
        .route("/lanes", get(lanes_map))
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

    // --- lanes_map ---

    #[tokio::test]
    async fn lanes_map_has_three_routes() {
        let Json(map) = super::lanes_map().await;
        assert_eq!(map.victim.reflex, "collapse / appease");
        assert_eq!(map.aggressor.reflex, "control / push");
        assert_eq!(map.sovereign.reflex, "recenter / choose");
        assert!(map.victim.micro_hint.contains("boundary"));
        assert!(map.aggressor.micro_hint.contains("question"));
        assert!(map.sovereign.micro_hint.contains("true line"));
    }
}
