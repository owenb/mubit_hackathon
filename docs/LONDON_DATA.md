# London's offline OpenStreetMap database

`assets/maps/london.ael` is a derived OpenStreetMap database, © OpenStreetMap
contributors, distributed under the ODbL 1.0. Attribution and source metadata
travel with it in `assets/maps/README.txt`, also copied into Aether.app.
`docs/THIRD_PARTY.md` records the source and licence. The PBF and its published
MD5 live in ignored `vendor/osm/`; only the compact derived database is shipped.

The pinned source is Geofabrik's `greater-london-261012.osm.pbf`, last modified
2026-10-12 23:34:55 UTC, 129,504,221 bytes. It was downloaded through their
`greater-london-latest.osm.pbf` URL on 2026-10-14 in London (2026-10-13 UTC).
Its published and independently checked MD5 is
`cee0b50f1f4b7b19144749b56f844696`.

## Coverage and meaning

Central London has complete selected building footprints between longitude
−0.19 and −0.065, latitude 51.492 and 51.533: Hyde Park to Tower Bridge,
Westminster to Marylebone. Buildings crossing that boundary stay whole.
Beyond that complete centre, whole buildings and residential roads are retained
with a deterministic OSM-identity selection, tapering with a 400 m e-folding
distance, ending at 2.4 km from the centre's boundary. This avoids a rectangular
cliff in the architectural view without inventing geometry or changing heights.
Elsewhere in the extract, buildings with prominent place tags or heights of
at least 40 m (explicit heights or levels) remain. All water polygons,
railways, main roads and named green spaces remain across the extract.
Unlabelled green areas remain from 150 m² in the centre, 10,000 m² outside it.
Residential roads remain in the centre, as do named paths and bridge paths.
This is a city model for exploration, not a complete routing database.

Heights prefer the finite `height` tag (metres or `ft`), then
`building:levels` at 3.2 m per level, then defaults by building kind:
sheds/garages 3 m; houses 8.5 m; apartments 15 m; offices/shops 18 m;
churches 22 m; industrial buildings 9 m; unspecified buildings 10 m.
Measured, levels-derived and default heights have distinct flags. Impossible
heights above 600 m and malformed tags fall back to the next source.
`min_height` and `building:min_level` are retained for elevated parts.
These are footprints extruded to OSM's supplied heights, not surveyed roofs.

Building parts remain; outlines identified by building relations do not
create a second solid over their parts. Their notable names remain as place
points. Named river/canal centreline points supply labels for often unnamed
water polygons. Node places include districts, stations and notable amenities.
Names come from `name:en` or `name`, not from the model.

Multipolygon member ways are joined by OSM node identity, even in reversed
order. Every selected exterior remains separate. Inner rings become holes in the
smallest containing exterior; islands and courtyards are not filled. Size/detail
selection is per exterior including its holes: filtering one leaves selected
exteriors and their holes intact. A fully filtered valid relation suppresses
its same-kind member ways too, rather than restoring them through a fallback. Missing
members, ambiguous continuations and triangulations that disagree with polygon
area are omitted and counted. An invalid relation falls back to its tagged
individual ways. Members with a different feature kind stay available (an
island's green space can remain inside a water relation). Quantization is
0.25 m; only repeated points and exactly collinear forward points are removed.
No invented bridge, bank, height measurement or landmark is added.

## Rebuild

The converter is a standalone Rust crate with its own `[workspace]` and
lockfile. `osmpbfreader` decodes the PBF; `earcutr` triangulates polygons with
holes. Neither crate is linked into Aether, and Aether's Cargo.lock is unchanged.
All codec and loader code is shared from `src/london_data.rs` (standard Rust
only). Run from the repository root:

```sh
mkdir -p vendor/osm
curl -fL --retry 3 -o vendor/osm/greater-london-latest.osm.pbf \
  https://download.geofabrik.de/europe/united-kingdom/england/greater-london-261012.osm.pbf
curl -fL --retry 3 -o vendor/osm/greater-london-latest.osm.pbf.md5 \
  https://download.geofabrik.de/europe/united-kingdom/england/greater-london-261012.osm.pbf.md5
md5 -r vendor/osm/greater-london-latest.osm.pbf
cat vendor/osm/greater-london-latest.osm.pbf.md5
# Both must match the checksum recorded above before converting.
CARGO_HOME=$PWD/target/cargo-home CARGO_TARGET_DIR=$PWD/target/london-tool \
  cargo build --locked --release --manifest-path tools/london/Cargo.toml
target/london-tool/release/aether-london \
  vendor/osm/greater-london-latest.osm.pbf assets/maps/london.ael \
  2026-10-12 cee0b50f1f4b7b19144749b56f844696
CARGO_HOME=$PWD/target/cargo-home CARGO_TARGET_DIR=$PWD/target/london-tool \
  cargo test --locked --offline --release --manifest-path tools/london/Cargo.toml
```

The first tool build fetches its locked crates; subsequent builds support
`--offline`. The converter streams three passes: relevant relations, nodes,
then ways; it does not retain the complete OSM tag database. Output order is
deterministic (OSM order, with sorted node lookup). It round-trips the strict
host decoder and checks the 24 MiB limit before replacing the output via a
temporary file. Rebuilding the same snapshot should reproduce every byte.
`--inspect assets/maps/london.ael Soho` examines derived records;
`--osm-tags vendor/osm/greater-london-latest.osm.pbf 'The Shard'` examines the
original tags of an exact name.

## AELON001

All fixed-width numbers are little-endian. No native struct bytes or platform
alignment appear on disk. Counts and byte ranges are checked before allocating.

The 114-byte header contains, in order:

| Field | Bytes |
|---|---:|
| `AELON001` magic and version | 8 |
| Snapshot date, ASCII `YYYY-MM-DD` | 10 |
| PBF MD5, ASCII hex | 32 |
| Counts: features, points, ring starts, triangle indices, name bytes, cell members | 6 × u32 |
| Encoded coordinate bytes, encoded triangle bytes | 2 × u32 |
| Grid minimum column/row | 2 × i32 |
| Grid columns/rows | 2 × u32 |
| Overall bounds: minimum east/north, maximum east/north | 4 × i32 |

The sections follow: 64-byte feature records; delta-encoded coordinates;
u32 ring starts; varint triangle indices; UTF-8 names; u32 cell offsets
(columns × rows + 1); u32 cell members. A final u64 FNV-1a checksum covers
all preceding bytes. This is corruption detection, not authentication.

A feature record contains: signed i64 OSM id (negative for a relation);
u8 kind (building, water, green, road, rail, place); u8 class; u16 flags;
u16 height and base in decimetres; u32 point start/count; u32 ring start;
u16 ring count and label rank; u32 triangle start/count; u32 name start;
u16 name byte count; a zero reserved u16; four i32 bounds. Each feature owns
contiguous, non-overlapping ranges of all four pools. Different exterior
polygons from one OSM relation may have separate records with the same id.
Place records may derive from nodes or ways; ids are source references, not
unique database keys. Feature index is the database key.

Points are integer quarter-metres in a local equirectangular projection at
51.5074°N, −0.1278°E, Earth radius 6,378,137 m. East and north increase right
and up. Projection and inverse are f64. Each coordinate is a delta from the
preceding point (initially zero), zigzag-coded to an unsigned base-128 varint.
Triangle indices are unsigned base-128 varints, relative to the feature's first
point. Varints are canonical, at most five bytes, with checked overflow.

Ring starts are relative to the feature's first point; the first is zero.
The first ring is exterior, later rings are holes. Each has at least three
points, with no duplicated closing point. Its end is the next start or the
feature's point count. Lines have no rings/triangles; places have one point.
Road classes are motorway/trunk (0), primary (1), secondary (2), tertiary (3),
residential (4), paths/service (5). Green class 1 is wooded; rail class 1 is
subway; place class 1 is a river/canal label. Flags are bridge (1), tunnel (2),
explicit height (4), levels-derived height (8), building part (16).

The spatial index uses 512 m cells (2,048 coordinate units), flooring negative
coordinates too. Features occur once, in sorted order, in every cell intersected
by their bounds. Admission checks exact membership, not just index ranges.
Drawing can deduplicate nearby cells' candidates using reusable feature stamps;
it never needs to scan the entire city for each frame.

## Host loading

`london_data::Loader` starts one worker for the immutable city, resolves the
bundle/repository path on that worker, reads at most 24 MiB + 1 byte, decodes,
and validates the database whole. Decoded pools are charged against 64 MiB
before allocation; geometry stays within 100 km of the origin. A frame only
requests or polls, without waiting or doing I/O. Ready views share an `Arc`.
Failure or a disconnected worker retires pending state. A loader is retained
by the host for the shared city rather than created for each window.

`bundle.sh` copies `assets/maps/` to `Contents/Resources/maps/`. A bundled copy
wins; running from `target/` falls back to the repository asset. The native
architectural view draws and navigates this checked data; see LONDON_VIEW.md.
The UI shows the supplied OpenStreetMap attribution at every map size.

## Committed snapshot

The derived file is 21,910,636 bytes (20.90 MiB), below both the 24 MB and
24 MiB bounds. It contains 183,550 features: 71,653 buildings, 3,447 water
polygons, 10,952 green polygons, 76,380 roads, 15,668 railway segments and
5,450 named place points. Its 1,605,531 points and 923,179 roof/ground
triangles are indexed by 11,132 cells with 240,794 memberships. The conversion
accepted 3,685 multipolygon relations (including wholly filtered relations);
it counted 20 incomplete geometries and 77 degenerate/area-disagreeing geometries.
Small/outside-detail features are omitted by the selection described above.

SHA-256 of `london.ael`:
`b6739ab69cad7b75b5a3f8341519c60dcf8640babf8380da57e54749ba3b2719`.
