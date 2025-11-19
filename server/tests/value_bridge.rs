use std::env;
use std::path::PathBuf;

use m3_memory_server::db::{
    account_balance_minor, get_or_create_account_id, init_db, insert_value_entry, ValueEntryParams,
};

// Basic roundtrip test for value account + entry insertion.
// Ensures schema init, account creation, minor unit conversion, and balance aggregation.
#[tokio::test]
async fn value_entry_roundtrip() {
    // Unique temp path (no external crate dependency)
    let millis = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis();
    let db_file = PathBuf::from(env::temp_dir()).join(format!(
        "m3_test_{}_{}.db",
        millis,
        std::process::id()
    ));
    env::set_var("M3_DB_PATH", &db_file);

    let db = init_db().await.expect("init_db");

    let account_id = get_or_create_account_id(&db, "wallet/eu", None, Some("EUR"))
        .await
        .expect("account id");
    assert!(account_id > 0, "account id should be positive");

    let rowid = insert_value_entry(
        &db,
        ValueEntryParams {
            account: "wallet/eu",
            account_kind: None,
            ts: None, // now
            direction: "in",
            amount_major: 21.25, // €21.25 -> 2125 minor
            currency: Some("EUR"),
            memo: Some("seed"),
            tags: None,
            counterparty: None,
            reference: None,
        },
    )
    .await
    .expect("insert row");
    assert!(rowid > 0, "row id should be > 0");

    let bal_minor = account_balance_minor(&db, Some("wallet/eu"), Some("EUR"))
        .await
        .expect("balance");
    assert_eq!(bal_minor, 2125, "expected minor unit balance 2125");
}
