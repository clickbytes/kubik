use kubik_server::{WorldConfig, router};

#[tokio::main(flavor = "current_thread")]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = WorldConfig::load()?;
    let bind = std::env::var("KUBIK_BIND").unwrap_or_else(|_| "127.0.0.1:3000".to_owned());
    let listener = tokio::net::TcpListener::bind(&bind).await?;
    println!("KUBIK server listening on {}", listener.local_addr()?);
    axum::serve(listener, router(config)).await?;
    Ok(())
}
