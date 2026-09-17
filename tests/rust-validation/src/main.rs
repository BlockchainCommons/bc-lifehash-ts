//! Replays tests/vectors/vectors.json against the tracked bc-lifehash release.
//!
//!   cargo run --release -- ../vectors/vectors.json
//!
//! Every vector is `w×h:sha256(pixels)` or `throw:<code>`. Classes:
//!   match    — identical outcome on both sides
//!   E1       — both reject: the reference panics, the port throws a code
//!   js-only  — the recipe cannot be expressed with the reference's types
//!              (a non-integer module size, a `domain` row); counted, not compared
//!   MISMATCH — anything else; exit 1
use bc_lifehash::{make_from_data, make_from_digest, make_from_utf8, Version};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::panic::{catch_unwind, AssertUnwindSafe};

#[derive(Deserialize)]
struct File {
    count: usize,
    vectors: Vec<Vector>,
}
#[derive(Deserialize)]
struct Vector {
    name: String,
    recipe: Recipe,
    expect: String,
}
#[derive(Deserialize)]
struct Recipe {
    k: String,
    #[serde(default)]
    s: String,
    #[serde(default)]
    version: String,
    #[serde(rename = "moduleSize", default = "one")]
    module_size: f64,
    #[serde(rename = "hasAlpha", default)]
    has_alpha: bool,
}
fn one() -> f64 {
    1.0
}

enum Outcome {
    Value(String),
    JsOnly,
}

fn version(s: &str) -> Option<Version> {
    Some(match s {
        "version1" => Version::Version1,
        "version2" => Version::Version2,
        "detailed" => Version::Detailed,
        "fiducial" => Version::Fiducial,
        "grayscaleFiducial" => Version::GrayscaleFiducial,
        _ => return None,
    })
}

fn run(r: &Recipe) -> Outcome {
    if r.k == "domain" || r.module_size.fract() != 0.0 || r.module_size.is_nan() {
        return Outcome::JsOnly;
    }
    let Some(v) = version(&r.version) else {
        return Outcome::JsOnly;
    };
    // A negative size saturates to 0 and panics inside the reference, as 0 does.
    let m = if r.module_size < 0.0 { 0 } else { r.module_size as usize };
    let out = catch_unwind(AssertUnwindSafe(|| {
        let img = match r.k.as_str() {
            "utf8" => make_from_utf8(&r.s, v, m, r.has_alpha),
            "data" => make_from_data(&hex::decode(&r.s).unwrap(), v, m, r.has_alpha),
            "digest" => make_from_digest(&hex::decode(&r.s).unwrap(), v, m, r.has_alpha),
            other => panic!("unknown recipe kind {other}"),
        };
        format!(
            "{}x{}:{}",
            img.width,
            img.height,
            hex::encode(Sha256::digest(&img.colors))
        )
    }));
    Outcome::Value(out.unwrap_or_else(|_| "throw:panic".to_string()))
}

fn main() {
    // The reference's assertion messages are noise here; the outcome is the record.
    std::panic::set_hook(Box::new(|_| {}));
    let path = std::env::args().nth(1).expect("vectors.json");
    let file: File = serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
    assert_eq!(file.count, file.vectors.len());
    let (mut matched, mut e1, mut js_only, mut mismatches) = (0usize, 0usize, 0usize, 0usize);
    for v in &file.vectors {
        match run(&v.recipe) {
            Outcome::JsOnly => js_only += 1,
            Outcome::Value(got) if got == v.expect => matched += 1,
            Outcome::Value(got) if got == "throw:panic" && v.expect.starts_with("throw:") => e1 += 1,
            Outcome::Value(got) => {
                mismatches += 1;
                eprintln!("MISMATCH {}\n  rust: {}\n  ts:   {}", v.name, got, v.expect);
            }
        }
    }
    println!(
        "{} vectors - {} match, {} E1 (both reject), {} js-only, {} MISMATCH",
        file.vectors.len(),
        matched,
        e1,
        js_only,
        mismatches
    );
    if mismatches > 0 {
        std::process::exit(1);
    }
}
