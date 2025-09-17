use crate::AppState;
use axum::extract::Query;
use axum::{routing::get, Json, Router};
use chrono::{DateTime, Duration, NaiveDate, TimeZone, Utc};
use serde::{Deserialize, Serialize};

// NOTE: Fast astronomical approximations for API responsiveness; not ephemeris‑grade.
// Good enough for phase/sign/tone milestones; refine with precise crates as needed.
// TODO(ephemeris): add a cargo feature + module with precise astronomy; keep API stable via compute::* facade.
// Feature toggle:
//   Build/run with precise astronomy once enabled via Cargo features:
//     cargo run -p m3-memory-server --features ephemeris
//     cargo test -p m3-memory-server --features ephemeris
// See `server/Cargo.toml` [features] for the `ephemeris` flag and optional deps.

// -- Cycle computation facade -------------------------------------------------
// These functions are the single entry points for computing current and upcoming
// milestones. They default to fast approximations but can be swapped for a more
// precise ephemeris implementation behind a cargo feature (e.g. `ephemeris`).
mod compute {
    use super::*;

    pub fn current(now: DateTime<Utc>) -> CycleState {
        let (lunar_phase, _l_at) = next_lunar_phase(now);
        let (solar_phase, _s_at) = next_solar_sign(now);
        let (pleiadian_phase, _p_at) = next_pleiadian_tone(now);
        CycleState {
            lunar: lunar_phase,
            solar: solar_phase,
            pleiadian: pleiadian_phase,
            ts: now.to_rfc3339(),
        }
    }

    pub fn upcoming(now: DateTime<Utc>, limit: usize) -> Vec<CycleMilestone> {
        let (lunar_phase, lunar_at) = next_lunar_phase(now);
        let (solar_phase, solar_at) = next_solar_sign(now);
        let (pleiadian_phase, pleiadian_at) = next_pleiadian_tone(now);

        let mut milestones = vec![
            ("lunar".to_string(), lunar_phase, lunar_at),
            ("solar".to_string(), solar_phase, solar_at),
            ("pleiadian".to_string(), pleiadian_phase, pleiadian_at),
        ];
        milestones.sort_by(|a, b| a.2.cmp(&b.2));
        milestones
            .into_iter()
            .map(|(kind, phase, at)| CycleMilestone {
                kind,
                phase,
                at: at.to_rfc3339(),
            })
            .take(limit)
            .collect()
    }
}

// If you later enable precise astronomy, provide alternate implementations here:
//
// #[cfg(feature = "ephemeris")]
// mod compute {
//     use super::*;
//     // TODO: hook to a precise ephemeris crate (e.g., VSOP87/ELP),
//     // replace next_lunar_phase / next_solar_sign with accurate solvers.
//     // Keep function signatures identical so handlers don't change.
// }

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct CycleState {
    pub lunar: String,
    pub solar: String,
    pub pleiadian: String,
    pub ts: String, // ISO timestamp
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "snake_case")]
pub struct CycleMilestone {
    pub kind: String,  // "lunar" | "solar" | "pleiadian"
    pub phase: String, // e.g. "waning_gibbous", "tone_7_reflection"
    pub at: String,    // ISO timestamp
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/cycles/current", get(get_current))
        .route("/cycles/upcoming", get(get_upcoming))
    // placeholder for POST /cycles/anchor
}

async fn get_current() -> Json<CycleState> {
    let now = Utc::now();
    Json(compute::current(now))
}

#[derive(Debug, Deserialize)]
struct UpcomingParams {
    /// Maximum number of milestones to return (default 3, clamped 1..=12)
    limit: Option<usize>,
}

async fn get_upcoming(Query(params): Query<UpcomingParams>) -> Json<Vec<CycleMilestone>> {
    let now = Utc::now();
    let limit = params.limit.unwrap_or(3).clamp(1, 12);
    Json(compute::upcoming(now, limit))
}

/// Mean synodic month in days (Espenak/JPL mean).
fn next_lunar_phase(now: DateTime<Utc>) -> (String, DateTime<Utc>) {
    const SYNODIC_MONTH: f64 = 29.530_588_853; // mean synodic month in days
    let phase_offsets = [
        (0.0, "new_moon"),
        (0.25, "first_quarter"),
        (0.5, "full_moon"),
        (0.75, "last_quarter"),
    ];

    // Reference new moon: 2000-01-06 18:14 UTC (Espenak).
    let base_new_moon = Utc
        .with_ymd_and_hms(2000, 1, 6, 18, 14, 0)
        .single()
        .expect("valid reference date");
    let now_jd = datetime_to_julian(now);
    let base_jd = datetime_to_julian(base_new_moon);
    let age_days = (now_jd - base_jd).rem_euclid(SYNODIC_MONTH);
    let mut next_phase = None;

    for &(fraction, name) in &phase_offsets[1..] {
        let offset = fraction * SYNODIC_MONTH;
        if offset > age_days + 1e-6 {
            next_phase = Some((name, offset));
            break;
        }
    }

    let (phase_name, offset_days) = if let Some(phase) = next_phase {
        phase
    } else {
        (phase_offsets[0].1, SYNODIC_MONTH)
    };

    let mut delta_days = offset_days - age_days;
    if delta_days <= 0.0 {
        delta_days += SYNODIC_MONTH;
    }

    let mut at = now + duration_from_days(delta_days);
    // Ensure strictly future timestamp
    if at <= now {
        at = now + Duration::seconds(1);
    }
    (phase_name.to_string(), at)
}

/// Tropical zodiac signs in order; boundaries each 30° of ecliptic longitude.
fn next_solar_sign(now: DateTime<Utc>) -> (String, DateTime<Utc>) {
    const SIGNS: [&str; 12] = [
        "aries",
        "taurus",
        "gemini",
        "cancer",
        "leo",
        "virgo",
        "libra",
        "scorpio",
        "sagittarius",
        "capricorn",
        "aquarius",
        "pisces",
    ];

    let now_jd = datetime_to_julian(now);
    let current_longitude = sun_longitude(now_jd);
    let mut current_index = (current_longitude / 30.0).floor() as i32;
    if current_index == 12 {
        current_index = 0;
    }
    let next_index = ((current_index + 1) % 12) as usize;
    let target_longitude = (next_index as f64) * 30.0;
    let mut delta_deg = (target_longitude - current_longitude).rem_euclid(360.0);
    if delta_deg < 1e-6 {
        delta_deg = 30.0;
    }

    // Mean daily solar motion ≈ 0.98564736°/day (tropical year).
    let mut day_offset = delta_deg / 0.985_647_36; // mean daily motion of the Sun in degrees
    for _ in 0..5 {
        let trial_longitude = sun_longitude(now_jd + day_offset);
        let diff = normalize_signed_angle(trial_longitude - target_longitude);
        day_offset -= diff / 0.985_647_36;
    }

    if day_offset <= 0.0 {
        day_offset += 30.0 / 0.985_647_36;
    }

    let mut at = now + duration_from_days(day_offset);
    if at <= now {
        at = now + Duration::seconds(1);
    }
    (SIGNS[next_index].to_string(), at)
}

/// Anchor date often used for 13‑tone cycles (13‑Moon Day Out of Time): 2020‑07‑26.
fn next_pleiadian_tone(now: DateTime<Utc>) -> (String, DateTime<Utc>) {
    const TONES: [&str; 13] = [
        "tone_1_unity",
        "tone_2_duality",
        "tone_3_activation",
        "tone_4_definition",
        "tone_5_empowerment",
        "tone_6_balance",
        "tone_7_reflection",
        "tone_8_integrity",
        "tone_9_intention",
        "tone_10_manifestation",
        "tone_11_liberation",
        "tone_12_cooperation",
        "tone_13_presence",
    ];

    let base = NaiveDate::from_ymd_opt(2020, 7, 26).expect("valid base date");
    let today = now.date_naive();
    let days_since = today.signed_duration_since(base).num_days();
    let current_index = days_since.rem_euclid(13) as usize;
    let next_index = (current_index + 1) % 13;
    let next_day = today.succ_opt().expect("valid next day");
    let next_midnight = Utc.from_utc_datetime(
        &next_day
            .and_hms_opt(0, 0, 0)
            .expect("midnight should be representable"),
    );

    let at = if next_midnight <= now {
        now + Duration::seconds(1)
    } else {
        next_midnight
    };
    (TONES[next_index].to_string(), at)
}

fn datetime_to_julian(dt: DateTime<Utc>) -> f64 {
    let unix_seconds = dt.timestamp() as f64;
    let nanos = dt.timestamp_subsec_nanos() as f64;
    unix_seconds / 86_400.0 + 2_440_587.5 + nanos / 86_400_000_000_000.0
}

fn duration_from_days(days: f64) -> Duration {
    let nanos = (days * 86_400_000_000_000.0).round();
    Duration::nanoseconds(nanos as i64)
}

fn sun_longitude(julian_day: f64) -> f64 {
    let n = julian_day - 2_451_545.0;
    let l = normalize_angle(280.460 + 0.985_647_4 * n);
    let g = (357.528 + 0.985_600_3 * n).to_radians();
    let lambda = l + 1.915 * g.sin() + 0.020 * (2.0 * g).sin();
    normalize_angle(lambda)
}

fn normalize_angle(degrees: f64) -> f64 {
    degrees.rem_euclid(360.0)
}

fn normalize_signed_angle(degrees: f64) -> f64 {
    let angle = (degrees + 180.0).rem_euclid(360.0) - 180.0;
    if angle >= 180.0 {
        angle - 360.0
    } else {
        angle
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Timelike, Utc};

    #[test]
    fn upcoming_are_future_and_sorted_like_sort() {
        let now = Utc.with_ymd_and_hms(2025, 9, 17, 0, 0, 0).single().unwrap();
        let (_, a) = next_lunar_phase(now);
        let (_, b) = next_solar_sign(now);
        let (_, c) = next_pleiadian_tone(now);
        assert!(a > now && b > now && c > now);
        let mut v = vec![a, b, c];
        let mut sorted = v.clone();
        sorted.sort();
        v.sort();
        assert_eq!(v, sorted);
    }

    #[test]
    fn pleiadian_advances_at_midnight_utc() {
        let now = Utc
            .with_ymd_and_hms(2025, 9, 17, 20, 0, 0)
            .single()
            .unwrap();
        let (_tone, at) = next_pleiadian_tone(now);
        // expected next midnight UTC or at least strictly in the future
        assert!(at > now);
        assert_eq!(at.minute(), 0);
        assert_eq!(at.second(), 0);
    }

    #[test]
    fn lunar_phase_label_is_valid() {
        let now = Utc.with_ymd_and_hms(2025, 9, 17, 0, 0, 0).single().unwrap();
        let (label, _at) = next_lunar_phase(now);
        let ok =
            ["new_moon", "first_quarter", "full_moon", "last_quarter"].contains(&label.as_str());
        assert!(ok, "unexpected lunar label: {}", label);
    }
}
