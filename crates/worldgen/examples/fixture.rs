use worldgen::{generate_chunk, GENERATOR_VERSION};

fn main() {
    // All faces and two seeds, with additional neighboring tiles and corners.
    let mut cases = Vec::new();
    for seed in [17, 12345] {
        for face in 0..6 {
            cases.push((seed, face, 0, 0, 0, 4));
        }
    }
    cases.extend([(17, 0, 1, 0, 0, 8), (17, 0, 1, 1, 0, 8)]);
    for (seed, face, level, tile_x, tile_y, resolution) in cases {
        let values = generate_chunk(
            seed,
            GENERATOR_VERSION,
            face,
            level,
            tile_x,
            tile_y,
            resolution,
        )
        .expect("fixture chunk must be valid");
        let fields = values
            .iter()
            .map(i32::to_string)
            .collect::<Vec<_>>()
            .join(",");
        println!(
            "{seed},{GENERATOR_VERSION},{face},{level},{tile_x},{tile_y},{resolution}|{fields}"
        );
    }
}
