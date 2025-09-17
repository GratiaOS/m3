#[allow(dead_code)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Band {
    /// Survival band (~ <200)
    Survival,
    /// Integrity band (~ 200–400)
    Integrity,
    /// Coherence band (~ 400+)
    Coherence,
}

#[allow(dead_code)]
pub fn band_from_emotion(kind: &str, intensity: f32) -> Band {
    let k = kind.to_ascii_lowercase();
    // crude heuristic; refine with patterns/detect later
    match k.as_str() {
        "shame" | "guilt" | "apathy" | "grief" | "fear" | "desire" | "anger" | "pride" => {
            Band::Survival
        }
        "courage" | "neutrality" | "willingness" | "acceptance" | "reason" => Band::Integrity,
        "love" | "joy" | "peace" => Band::Coherence,
        _ => {
            // fallback by intensity
            if intensity < 0.2 {
                Band::Survival
            } else if intensity < 0.6 {
                Band::Integrity
            } else {
                Band::Coherence
            }
        }
    }
}

#[allow(dead_code)]
pub struct BandAdvice {
    pub approach: &'static str,
    pub hints: Vec<&'static str>,
    pub ui_color_hint: &'static str,
}

#[allow(dead_code)]
pub fn advice_for(kind: &str, intensity: f32) -> BandAdvice {
    match band_from_emotion(kind, intensity) {
        Band::Survival => BandAdvice {
            approach: "body-first",
            ui_color_hint: "red/orange",
            hints: vec!["breath → doorway → anchor"],
        },
        Band::Integrity => BandAdvice {
            approach: "choice-first",
            ui_color_hint: "green/cyan",
            hints: vec!["small action", "boundary", "reframe"],
        },
        Band::Coherence => BandAdvice {
            approach: "stabilize-coherence",
            ui_color_hint: "blue/violet",
            hints: vec!["gratitude ritual", "sharing", "stillness"],
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_survival_emotion() {
        let kind = "fear";
        let intensity = 0.5;
        let band = band_from_emotion(kind, intensity);
        assert_eq!(band, Band::Survival);

        let advice = advice_for(kind, intensity);
        assert_eq!(advice.approach, "body-first");
        assert_eq!(advice.ui_color_hint, "red/orange");
        assert!(advice.hints.contains(&"breath → doorway → anchor"));
    }

    #[test]
    fn test_integrity_emotion() {
        let kind = "acceptance";
        let intensity = 0.5;
        let band = band_from_emotion(kind, intensity);
        assert_eq!(band, Band::Integrity);

        let advice = advice_for(kind, intensity);
        assert_eq!(advice.approach, "choice-first");
        assert_eq!(advice.ui_color_hint, "green/cyan");
        assert!(advice.hints.contains(&"small action"));
        assert!(advice.hints.contains(&"boundary"));
        assert!(advice.hints.contains(&"reframe"));
    }

    #[test]
    fn test_coherence_emotion() {
        let kind = "joy";
        let intensity = 0.8;
        let band = band_from_emotion(kind, intensity);
        assert_eq!(band, Band::Coherence);

        let advice = advice_for(kind, intensity);
        assert_eq!(advice.approach, "stabilize-coherence");
        assert_eq!(advice.ui_color_hint, "blue/violet");
        assert!(advice.hints.contains(&"gratitude ritual"));
        assert!(advice.hints.contains(&"sharing"));
        assert!(advice.hints.contains(&"stillness"));
    }

    #[test]
    fn test_unknown_emotion_low_intensity() {
        let kind = "unknown_emotion";
        let intensity = 0.1;
        let band = band_from_emotion(kind, intensity);
        assert_eq!(band, Band::Survival);

        let advice = advice_for(kind, intensity);
        assert_eq!(advice.approach, "body-first");
        assert_eq!(advice.ui_color_hint, "red/orange");
    }

    #[test]
    fn test_unknown_emotion_mid_intensity() {
        let kind = "unknown_emotion";
        let intensity = 0.3;
        let band = band_from_emotion(kind, intensity);
        assert_eq!(band, Band::Integrity);

        let advice = advice_for(kind, intensity);
        assert_eq!(advice.approach, "choice-first");
        assert_eq!(advice.ui_color_hint, "green/cyan");
    }

    #[test]
    fn test_unknown_emotion_high_intensity() {
        let kind = "unknown_emotion";
        let intensity = 0.9;
        let band = band_from_emotion(kind, intensity);
        assert_eq!(band, Band::Coherence);

        let advice = advice_for(kind, intensity);
        assert_eq!(advice.approach, "stabilize-coherence");
        assert_eq!(advice.ui_color_hint, "blue/violet");
    }
}
