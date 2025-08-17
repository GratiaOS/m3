use axum::{http::StatusCode, response::IntoResponse};
use axum::extract::{FromRef, FromRequestParts};
use axum::http::request::Parts;

#[allow(dead_code)]            // silence "never constructed"
#[derive(Clone)]
pub struct Bearer(Option<String>);

impl FromRef<crate::AppState> for Bearer {
    fn from_ref(state: &crate::AppState) -> Self {
        Bearer(state.config.bearer.clone())
    }
}

#[allow(dead_code)]            // silence "never constructed"
pub struct WriteGuard;

#[axum::async_trait]
impl<S> FromRequestParts<S> for WriteGuard
where
    Bearer: FromRef<S>,
    S: Send + Sync,
{
    type Rejection = axum::response::Response;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let Bearer(maybe) = Bearer::from_ref(state);

        // if no bearer configured, allow (dev mode)
        let Some(secret) = maybe else { return Ok(WriteGuard); };

        let Some(h) = parts.headers.get(axum::http::header::AUTHORIZATION) else {
            return Err((StatusCode::UNAUTHORIZED, "missing Authorization header").into_response());
        };
        let Ok(hs) = h.to_str() else {
            return Err((StatusCode::UNAUTHORIZED, "bad Authorization header").into_response());
        };
        if hs.strip_prefix("Bearer ").is_some_and(|t| t == secret) {
            Ok(WriteGuard)
        } else {
            Err((StatusCode::UNAUTHORIZED, "invalid bearer").into_response())
        }
    }
}