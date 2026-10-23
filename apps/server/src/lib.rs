use axum::{Json, Router, extract::State, routing::get};
use serde::{Deserialize, Serialize};

pub const DEFAULT_WORLD_CONFIG: &str = include_str!("../world-config.json");

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct PlanetConfig {
    pub radius_km: f64,
    pub sea_level_m: f64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
pub struct WorldConfig {
    pub seed: String,
    pub generator_version: u32,
    pub planet: PlanetConfig,
}

impl WorldConfig {
    pub fn from_json(json: &str) -> Result<Self, String> {
        let config: Self = serde_json::from_str(json).map_err(|error| error.to_string())?;
        config.validate()?;
        Ok(config)
    }

    pub fn load() -> Result<Self, Box<dyn std::error::Error>> {
        match std::env::var("KUBIK_CONFIG_PATH") {
            Ok(path) => {
                let json = std::fs::read_to_string(&path)?;
                Self::from_json(&json).map_err(Into::into)
            }
            Err(std::env::VarError::NotPresent) => {
                Self::from_json(DEFAULT_WORLD_CONFIG).map_err(Into::into)
            }
            Err(error) => Err(error.into()),
        }
    }

    fn validate(&self) -> Result<(), String> {
        self.seed
            .parse::<u32>()
            .map_err(|_| "seed must be a decimal u32 string".to_owned())?;
        if self.generator_version != 1 {
            return Err("generator_version must be 1 for Stage 1".to_owned());
        }
        if !self.planet.radius_km.is_finite() || self.planet.radius_km <= 0.0 {
            return Err("planet.radius_km must be a finite positive number".to_owned());
        }
        if !self.planet.sea_level_m.is_finite() {
            return Err("planet.sea_level_m must be finite".to_owned());
        }
        Ok(())
    }
}

#[derive(Serialize)]
struct Health {
    status: &'static str,
}

async fn health() -> Json<Health> {
    Json(Health { status: "ok" })
}

async fn world_config(State(config): State<WorldConfig>) -> Json<WorldConfig> {
    Json(config)
}

pub fn router(config: WorldConfig) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/world-config", get(world_config))
        .with_state(config)
}

#[cfg(test)]
mod tests {
    use super::{WorldConfig, router};
    use axum::{
        body::Body,
        http::{Request, StatusCode},
    };
    use tower::ServiceExt;

    #[tokio::test]
    async fn endpoints_expose_stable_health_and_world_configuration() {
        let config = WorldConfig::from_json(super::DEFAULT_WORLD_CONFIG).unwrap();
        let app = router(config.clone());

        let health = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(health.status(), StatusCode::OK);
        let health_body = axum::body::to_bytes(health.into_body(), 1024)
            .await
            .unwrap();
        assert_eq!(&health_body[..], br#"{"status":"ok"}"#);

        let world = app
            .oneshot(
                Request::builder()
                    .uri("/world-config")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(world.status(), StatusCode::OK);
        let world_body = axum::body::to_bytes(world.into_body(), 1024).await.unwrap();
        let observed: WorldConfig = serde_json::from_slice(&world_body).unwrap();
        assert_eq!(observed, config);
    }

    #[test]
    fn configuration_rejects_invalid_seed_and_radius() {
        let invalid_seed = r#"{"seed":"not-a-number","generator_version":1,"planet":{"radius_km":2014.6,"sea_level_m":0}}"#;
        assert!(WorldConfig::from_json(invalid_seed).is_err());

        let invalid_radius =
            r#"{"seed":"12345","generator_version":1,"planet":{"radius_km":0,"sea_level_m":0}}"#;
        assert!(WorldConfig::from_json(invalid_radius).is_err());
    }
}
