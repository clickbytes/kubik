//! Seeded spherical terrain fields shared by the native server and browser WASM.
//!
//! All public terrain values are quantized integers. A chunk is sampled directly
//! from its spherical coordinates, so traversal order and chunk resolution do
//! not change the underlying world.

use std::fmt;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

pub const GENERATOR_VERSION: u32 = 1;
pub const DEFAULT_RADIUS_KM: f64 = 2014.6;
pub const SAMPLE_STRIDE: usize = 4;
pub const MAX_LEVEL: u8 = 20;
pub const MAX_RESOLUTION: u32 = 128;

/// Face IDs and local orientation are part of the version-1 generator contract.
/// Local `u` increases to the right and `v` increases upward in [-1, 1].
/// +X=(1,v,-u), -X=(-1,v,u), +Y=(u,1,-v), -Y=(u,-1,v),
/// +Z=(u,v,1), -Z=(-u,v,-1), then normalize to a unit vector.
pub const FACE_POS_X: u8 = 0;
pub const FACE_NEG_X: u8 = 1;
pub const FACE_POS_Y: u8 = 2;
pub const FACE_NEG_Y: u8 = 3;
pub const FACE_POS_Z: u8 = 4;
pub const FACE_NEG_Z: u8 = 5;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct WorldConfig {
    pub seed: u32,
    pub generator_version: u32,
    pub radius_km: f64,
    pub sea_level_m: i32,
}

impl Default for WorldConfig {
    fn default() -> Self {
        Self {
            seed: 12345,
            generator_version: GENERATOR_VERSION,
            radius_km: DEFAULT_RADIUS_KM,
            sea_level_m: 0,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum WorldgenError {
    UnsupportedVersion(u32),
    InvalidFace(u8),
    InvalidCoordinate,
    InvalidChunk,
    InvalidResolution(u32),
}

impl fmt::Display for WorldgenError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::UnsupportedVersion(v) => write!(f, "unsupported generator version: {v}"),
            Self::InvalidFace(face) => write!(f, "invalid cube face: {face}"),
            Self::InvalidCoordinate => write!(f, "non-finite or zero spherical coordinate"),
            Self::InvalidChunk => write!(f, "invalid quadtree level or tile coordinate"),
            Self::InvalidResolution(n) => write!(f, "invalid chunk resolution: {n}"),
        }
    }
}

impl std::error::Error for WorldgenError {}

#[repr(i32)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Biome {
    Ocean = 0,
    Coast = 1,
    Desert = 2,
    Grassland = 3,
    Forest = 4,
    Tundra = 5,
    Mountain = 6,
    Snow = 7,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Sample {
    pub height_m: i32,
    /// Quantized to [0, 1000]. This is a relative climate field, not degrees C.
    pub temperature_q: u16,
    /// Quantized to [0, 1000].
    pub moisture_q: u16,
    pub biome: Biome,
}

impl Sample {
    pub fn packed(self) -> [i32; SAMPLE_STRIDE] {
        [
            self.height_m,
            i32::from(self.temperature_q),
            i32::from(self.moisture_q),
            self.biome as i32,
        ]
    }
}

/// Map a cube face and local coordinates to a normalized spherical direction.
pub fn face_direction(face: u8, u: f64, v: f64) -> Result<[f64; 3], WorldgenError> {
    if !u.is_finite() || !v.is_finite() || !(-1.0..=1.0).contains(&u) || !(-1.0..=1.0).contains(&v)
    {
        return Err(WorldgenError::InvalidCoordinate);
    }
    let p = match face {
        FACE_POS_X => [1.0, v, -u],
        FACE_NEG_X => [-1.0, v, u],
        FACE_POS_Y => [u, 1.0, -v],
        FACE_NEG_Y => [u, -1.0, v],
        FACE_POS_Z => [u, v, 1.0],
        FACE_NEG_Z => [-u, v, -1.0],
        _ => return Err(WorldgenError::InvalidFace(face)),
    };
    let length = (p[0] * p[0] + p[1] * p[1] + p[2] * p[2]).sqrt();
    Ok([p[0] / length, p[1] / length, p[2] / length])
}

/// Sample the versioned planet at any nonzero 3D direction.
pub fn sample_direction(
    seed: u32,
    generator_version: u32,
    direction: [f64; 3],
) -> Result<Sample, WorldgenError> {
    if generator_version != GENERATOR_VERSION {
        return Err(WorldgenError::UnsupportedVersion(generator_version));
    }
    if direction.iter().any(|v| !v.is_finite()) {
        return Err(WorldgenError::InvalidCoordinate);
    }
    let length_sq = direction.iter().map(|v| v * v).sum::<f64>();
    if length_sq == 0.0 || !length_sq.is_finite() {
        return Err(WorldgenError::InvalidCoordinate);
    }
    let length = length_sq.sqrt();
    // Snap before noise evaluation. Equivalent face-edge directions and nearby
    // floating-point paths resolve to the same integer input lattice.
    let d = direction.map(|v| ((v / length) * 1_000_000_000.0).round() / 1_000_000_000.0);

    let continents = fbm(seed, d, 1.75, 5);
    let detail = fbm(seed ^ 0x9e37_79b9, d, 6.0, 3);
    let land_field = continents * 0.84 + detail * 0.16 - 0.035;
    let ridge = 1.0 - fbm(seed ^ 0x7f4a_7c15, d, 10.0, 4).abs();
    let height = if land_field < 0.0 {
        (-160.0 + land_field * 15_000.0).max(-9_000.0)
    } else {
        (70.0 + land_field * 7_500.0 + ridge.powi(3) * land_field.min(0.38) * 10_000.0).min(8_500.0)
    };
    let height_m = height.round() as i32;

    let latitude_warmth = 1.0 - d[1].abs();
    let climate = fbm(seed ^ 0xa24b_aed4, d, 4.2, 3);
    let temperature = (0.12 + latitude_warmth * 0.78 + climate * 0.13
        - (height_m.max(0) as f64 / 8_500.0) * 0.36)
        .clamp(0.0, 1.0);
    let moisture = (0.52 + fbm(seed ^ 0x72e3_6b11, d, 5.3, 4) * 0.48
        - (height_m.max(0) as f64 / 8_500.0) * 0.08)
        .clamp(0.0, 1.0);
    let temperature_q = (temperature * 1_000.0).round() as u16;
    let moisture_q = (moisture * 1_000.0).round() as u16;
    let biome = classify_biome(height_m, temperature_q, moisture_q);
    Ok(Sample {
        height_m,
        temperature_q,
        moisture_q,
        biome,
    })
}

/// Return (resolution+1)^2 samples, row-major in v then u. Every sample has
/// four i32 values: height metres, temperature 0..1000, moisture 0..1000,
/// and biome ID. `tile_x` and `tile_y` are quadtree coordinates at `level`.
pub fn generate_chunk(
    seed: u32,
    generator_version: u32,
    face: u8,
    level: u8,
    tile_x: u32,
    tile_y: u32,
    resolution: u32,
) -> Result<Vec<i32>, WorldgenError> {
    if generator_version != GENERATOR_VERSION {
        return Err(WorldgenError::UnsupportedVersion(generator_version));
    }
    if face > FACE_NEG_Z {
        return Err(WorldgenError::InvalidFace(face));
    }
    if level > MAX_LEVEL {
        return Err(WorldgenError::InvalidChunk);
    }
    let tiles = 1_u32 << level;
    if tile_x >= tiles || tile_y >= tiles {
        return Err(WorldgenError::InvalidChunk);
    }
    if resolution == 0 || resolution > MAX_RESOLUTION {
        return Err(WorldgenError::InvalidResolution(resolution));
    }
    let side = resolution as usize + 1;
    let mut packed = Vec::with_capacity(side * side * SAMPLE_STRIDE);
    let denominator = f64::from(tiles) * f64::from(resolution);
    for y in 0..=resolution {
        for x in 0..=resolution {
            // Integer numerator makes shared edges identical even when chunks
            // are visited in different orders.
            let global_x = u64::from(tile_x) * u64::from(resolution) + u64::from(x);
            let global_y = u64::from(tile_y) * u64::from(resolution) + u64::from(y);
            let u = -1.0 + 2.0 * global_x as f64 / denominator;
            let v = -1.0 + 2.0 * global_y as f64 / denominator;
            let direction = face_direction(face, u, v)?;
            packed
                .extend_from_slice(&sample_direction(seed, generator_version, direction)?.packed());
        }
    }
    Ok(packed)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn sample_chunk(
    seed: u32,
    generator_version: u32,
    face: u8,
    level: u8,
    tile_x: u32,
    tile_y: u32,
    resolution: u32,
) -> Result<Vec<i32>, JsValue> {
    generate_chunk(
        seed,
        generator_version,
        face,
        level,
        tile_x,
        tile_y,
        resolution,
    )
    .map_err(|error| JsValue::from_str(&error.to_string()))
}

fn classify_biome(height_m: i32, temperature_q: u16, moisture_q: u16) -> Biome {
    if height_m < -100 {
        Biome::Ocean
    } else if height_m <= 80 {
        Biome::Coast
    } else if height_m >= 4_000 && temperature_q < 460 {
        Biome::Snow
    } else if height_m >= 2_500 {
        Biome::Mountain
    } else if temperature_q < 270 {
        Biome::Tundra
    } else if moisture_q < 340 && temperature_q > 480 {
        Biome::Desert
    } else if moisture_q >= 555 {
        Biome::Forest
    } else {
        Biome::Grassland
    }
}

fn fbm(seed: u32, direction: [f64; 3], frequency: f64, octaves: u8) -> f64 {
    let mut amplitude = 1.0;
    let mut amplitude_sum = 0.0;
    let mut sum = 0.0;
    let mut scale = frequency;
    for octave in 0..octaves {
        sum += amplitude
            * value_noise(
                seed.wrapping_add(u32::from(octave) * 0x9e37),
                direction.map(|v| v * scale),
            );
        amplitude_sum += amplitude;
        amplitude *= 0.5;
        scale *= 2.0;
    }
    sum / amplitude_sum
}

fn value_noise(seed: u32, p: [f64; 3]) -> f64 {
    let ix = p[0].floor() as i64;
    let iy = p[1].floor() as i64;
    let iz = p[2].floor() as i64;
    let tx = fade(p[0] - ix as f64);
    let ty = fade(p[1] - iy as f64);
    let tz = fade(p[2] - iz as f64);
    let mut values = [[[0.0; 2]; 2]; 2];
    for (dx, yz) in values.iter_mut().enumerate() {
        for (dy, z) in yz.iter_mut().enumerate() {
            for (dz, slot) in z.iter_mut().enumerate() {
                *slot = lattice(seed, ix + dx as i64, iy + dy as i64, iz + dz as i64);
            }
        }
    }
    let c00 = lerp(values[0][0][0], values[1][0][0], tx);
    let c10 = lerp(values[0][1][0], values[1][1][0], tx);
    let c01 = lerp(values[0][0][1], values[1][0][1], tx);
    let c11 = lerp(values[0][1][1], values[1][1][1], tx);
    lerp(lerp(c00, c10, ty), lerp(c01, c11, ty), tz)
}

fn fade(t: f64) -> f64 {
    t * t * (3.0 - 2.0 * t)
}

fn lerp(a: f64, b: f64, t: f64) -> f64 {
    a + (b - a) * t
}

fn lattice(seed: u32, x: i64, y: i64, z: i64) -> f64 {
    let mixed = (seed as u64)
        ^ (x as u64).wrapping_mul(0x9e37_79b9_7f4a_7c15)
        ^ (y as u64).wrapping_mul(0xbf58_476d_1ce4_e5b9)
        ^ (z as u64).wrapping_mul(0x94d0_49bb_1331_11eb);
    let h = splitmix64(mixed);
    (h >> 11) as f64 * (2.0 / ((1_u64 << 53) as f64)) - 1.0
}

fn splitmix64(mut x: u64) -> u64 {
    x = x.wrapping_add(0x9e37_79b9_7f4a_7c15);
    x = (x ^ (x >> 30)).wrapping_mul(0xbf58_476d_1ce4_e5b9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94d0_49bb_1331_11eb);
    x ^ (x >> 31)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vertex(chunk: &[i32], resolution: u32, x: u32, y: u32) -> [i32; SAMPLE_STRIDE] {
        let index = ((y * (resolution + 1) + x) as usize) * SAMPLE_STRIDE;
        chunk[index..index + SAMPLE_STRIDE].try_into().unwrap()
    }

    #[test]
    fn same_seed_and_version_are_order_independent() {
        let a = generate_chunk(42, 1, FACE_POS_Z, 2, 1, 2, 8).unwrap();
        let other = generate_chunk(42, 1, FACE_NEG_X, 0, 0, 0, 8).unwrap();
        assert_ne!(a, other);
        assert_eq!(a, generate_chunk(42, 1, FACE_POS_Z, 2, 1, 2, 8).unwrap());
        assert_ne!(a, generate_chunk(43, 1, FACE_POS_Z, 2, 1, 2, 8).unwrap());
    }

    #[test]
    fn version_one_golden_samples_remain_stable() {
        // A change to these packed fields needs a new generator version; the
        // same seed/version must never silently produce a different world.
        const CENTERS: [[i32; SAMPLE_STRIDE]; 6] = [
            [-3887, 882, 351, 0],
            [-2029, 923, 629, 0],
            [1999, 91, 297, 5],
            [-987, 147, 392, 0],
            [-1513, 822, 284, 0],
            [-2877, 837, 593, 0],
        ];
        for (face, expected) in CENTERS.into_iter().enumerate() {
            let chunk = generate_chunk(12345, GENERATOR_VERSION, face as u8, 0, 0, 0, 4).unwrap();
            assert_eq!(vertex(&chunk, 4, 2, 2), expected, "face {face} center");
            if face == usize::from(FACE_POS_Z) {
                assert_eq!(vertex(&chunk, 4, 0, 0), [3628, 297, 115, 6]);
            }
        }
    }

    #[test]
    fn rejects_unknown_version_and_invalid_chunk() {
        assert_eq!(
            generate_chunk(1, 99, 0, 0, 0, 0, 1),
            Err(WorldgenError::UnsupportedVersion(99))
        );
        assert_eq!(
            generate_chunk(1, 1, 6, 0, 0, 0, 1),
            Err(WorldgenError::InvalidFace(6))
        );
        assert_eq!(
            generate_chunk(1, 1, 0, 2, 4, 0, 1),
            Err(WorldgenError::InvalidChunk)
        );
        assert_eq!(
            generate_chunk(1, 1, 0, 0, 0, 0, 0),
            Err(WorldgenError::InvalidResolution(0))
        );
    }

    #[test]
    fn same_face_neighbor_edges_and_lod_samples_match() {
        let left = generate_chunk(77, 1, FACE_POS_X, 1, 0, 0, 8).unwrap();
        let right = generate_chunk(77, 1, FACE_POS_X, 1, 1, 0, 8).unwrap();
        for y in 0..=8 {
            assert_eq!(vertex(&left, 8, 8, y), vertex(&right, 8, 0, y));
        }
        let coarse = generate_chunk(77, 1, FACE_POS_X, 0, 0, 0, 8).unwrap();
        for y in (0..=8).step_by(2) {
            for x in (0..=8).step_by(2) {
                assert_eq!(vertex(&left, 8, x, y), vertex(&coarse, 8, x / 2, y / 2));
            }
        }
    }

    #[test]
    fn every_cube_edge_matches_in_both_directions() {
        // L/R/B/T are u=-1/u=1/v=-1/v=1. The last field says whether the
        // adjacent face traverses its edge in the opposite direction.
        const PAIRS: [((u8, char), (u8, char), bool); 12] = [
            ((0, 'L'), (4, 'R'), false),
            ((0, 'R'), (5, 'L'), false),
            ((0, 'B'), (3, 'R'), true),
            ((0, 'T'), (2, 'R'), false),
            ((1, 'L'), (5, 'R'), false),
            ((1, 'R'), (4, 'L'), false),
            ((1, 'B'), (3, 'L'), false),
            ((1, 'T'), (2, 'L'), true),
            ((2, 'B'), (4, 'T'), false),
            ((2, 'T'), (5, 'T'), true),
            ((3, 'B'), (5, 'B'), true),
            ((3, 'T'), (4, 'B'), false),
        ];

        fn coordinates(edge: char, t: f64) -> (f64, f64) {
            match edge {
                'L' => (-1.0, t),
                'R' => (1.0, t),
                'B' => (t, -1.0),
                'T' => (t, 1.0),
                _ => unreachable!(),
            }
        }

        for &((face_a, edge_a), (face_b, edge_b), reversed) in &PAIRS {
            for ((source_face, source_edge), (target_face, target_edge)) in [
                ((face_a, edge_a), (face_b, edge_b)),
                ((face_b, edge_b), (face_a, edge_a)),
            ] {
                for step in -4..=4 {
                    let t = f64::from(step) / 4.0;
                    let (u1, v1) = coordinates(source_edge, t);
                    let (u2, v2) = coordinates(target_edge, if reversed { -t } else { t });
                    let direction_a = face_direction(source_face, u1, v1).unwrap();
                    let direction_b = face_direction(target_face, u2, v2).unwrap();
                    let quantize =
                        |d: [f64; 3]| d.map(|axis| (axis * 1_000_000_000.0).round() as i64);
                    assert_eq!(
                        quantize(direction_a),
                        quantize(direction_b),
                        "faces {source_face}/{target_face} at t={t}"
                    );
                    for seed in [17, 12345] {
                        assert_eq!(
                            sample_direction(seed, 1, direction_a).unwrap(),
                            sample_direction(seed, 1, direction_b).unwrap(),
                            "seed {seed}, faces {source_face}/{target_face} at t={t}"
                        );
                    }
                }
            }
        }
    }

    #[test]
    fn all_eight_cube_corners_agree_across_three_faces() {
        for sx in [-1.0, 1.0] {
            for sy in [-1.0, 1.0] {
                for sz in [-1.0, 1.0] {
                    let x_face = if sx > 0.0 { FACE_POS_X } else { FACE_NEG_X };
                    let y_face = if sy > 0.0 { FACE_POS_Y } else { FACE_NEG_Y };
                    let z_face = if sz > 0.0 { FACE_POS_Z } else { FACE_NEG_Z };
                    let directions = [
                        face_direction(x_face, -sx * sz, sy).unwrap(),
                        face_direction(y_face, sx, -sy * sz).unwrap(),
                        face_direction(z_face, sz * sx, sy).unwrap(),
                    ];
                    for first in 0..3 {
                        for second in 0..3 {
                            assert_eq!(directions[first], directions[second]);
                            assert_eq!(
                                sample_direction(17, 1, directions[first]).unwrap(),
                                sample_direction(17, 1, directions[second]).unwrap()
                            );
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn fields_are_bounded_and_planet_has_both_land_and_ocean() {
        let mut land = 0;
        let mut ocean = 0;
        for face in 0..6 {
            let chunk = generate_chunk(12345, 1, face, 0, 0, 0, 24).unwrap();
            for sample in chunk.chunks_exact(SAMPLE_STRIDE) {
                assert!((-9_000..=8_500).contains(&sample[0]));
                assert!((0..=1_000).contains(&sample[1]));
                assert!((0..=1_000).contains(&sample[2]));
                assert!((0..=7).contains(&sample[3]));
                if sample[0] >= 0 {
                    land += 1;
                } else {
                    ocean += 1;
                }
            }
        }
        assert!(land > 0 && ocean > 0, "land={land}, ocean={ocean}");
    }
}
