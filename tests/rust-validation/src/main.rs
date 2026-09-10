//! Replays tests/vectors/vectors.json against bc-lifehash 0.1.0.
//!
//!   cargo run --release -- ../vectors/vectors.json
use bc_lifehash::{make_from_data, make_from_digest, make_from_utf8, Version};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::panic::{catch_unwind, AssertUnwindSafe};

#[derive(Deserialize)]
struct File { count: usize, vectors: Vec<Vector> }
#[derive(Deserialize)]
struct Vector { name: String, recipe: Recipe, expect: String }
#[derive(Deserialize)]
struct Recipe { k: String, s: String, version: String, #[serde(rename = "moduleSize")] module_size: f64, alpha: bool }

fn version(s: &str) -> Version {
    match s {
        "version1" => Version::Version1,
        "version2" => Version::Version2,
        "detailed" => Version::Detailed,
        "fiducial" => Version::Fiducial,
        "grayscaleFiducial" => Version::GrayscaleFiducial,
        _ => panic!("version"),
    }
}

fn run(r: &Recipe) -> String {
    if r.module_size < 1.0 || r.module_size.fract() != 0.0 {
        return "throw:InvalidModuleSize".into();
    }
    let m = r.module_size as usize;
    let out = catch_unwind(AssertUnwindSafe(|| {
        let img = match r.k.as_str() {
            "utf8" => make_from_utf8(&r.s, version(&r.version), m, r.alpha),
            "data" => make_from_data(&hex::decode(&r.s).unwrap(), version(&r.version), m, r.alpha),
            "digest" => {
                let d = hex::decode(&r.s).unwrap();
                if d.len() != 32 { return "throw:InvalidDigestLength".to_string(); }
                make_from_digest(&d, version(&r.version), m, r.alpha)
            }
            _ => panic!("k"),
        };
        format!("{}x{}:{}", img.width, img.height, hex::encode(Sha256::digest(&img.colors)))
    }));
    out.unwrap_or_else(|_| "throw:panic".to_string())
}

fn main() {
    let path = std::env::args().nth(1).expect("vectors.json");
    let file: File = serde_json::from_str(&std::fs::read_to_string(&path).unwrap()).unwrap();
    assert_eq!(file.count, file.vectors.len());
    let mut mismatches = 0;
    let mut expected = 0;
    for v in &file.vectors {
        let got = run(&v.recipe);
        if got == v.expect { continue; }
        // The TypeScript rejections carry a code; the reference panics or rejects
        // differently for invalid module sizes and digests. Both reject: E1.
        if got.starts_with("throw:") && v.expect.starts_with("throw:") { expected += 1; continue; }
        mismatches += 1;
        eprintln!("MISMATCH {}\n  rust: {}\n  ts:   {}", v.name, got, v.expect);
    }
    println!("{} vectors - {} match, {} expected-divergence [E1], {} MISMATCH", file.vectors.len(), file.vectors.len() - mismatches - expected, expected, mismatches);
    if mismatches > 0 { std::process::exit(1); }
}
