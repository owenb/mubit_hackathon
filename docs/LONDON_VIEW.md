# London as an architectural model

London maps draw from the bundled OSM database in Aether's own Metal. Buildings
stand at their supplied or documented default heights, including elevated
parts and courtyards. Water and park polygons retain islands and holes.
Roads have widths by class; bridges stand six metres above the base plane
(an illustrative clearance where OSM supplies no height). Tunnel roads/rails
and their captions are omitted from the surface view; station places remain
named. See LONDON_DATA.md for source and licence.

A map alone fills its window. Maps embedded in other content use the same
native city in their block. Places outside the London bounds retain raster
tiles. Original map/pin histories remain compatible. Camera changes are
transient view state, independent for each block, and never write a fact.
Rendering, gestures, commands and descriptions share one map-view transition.
Panning raster tiles into London starts the city at that current place; its
original map source is kept separately, so editing that source can reset the
view without losing a pan when unrelated facts change. City pans stay native.

Drag to orbit, right or Shift-drag to pan, middle-drag vertically to approach.
Wheel/pinch approach in Focus; on the Zoom plane they remain the plane's.
Arrow keys orbit, Shift-arrows pan, +/- approach and 0 resets, only when no
text field or timeline owns the keys. Closing, replacing, resizing the viewport,
losing focus or leaving a usable view cancels a held gesture. Pans map both screen
points through the current f64 surface inverse, so moving a window cannot cause
an unintended pan.

Say "show me London" or "a map of Soho". The router's london command opens
a named place; london_view names the map window and left/right/up/down,
pan_left/pan_right/pan_up/pan_down, in/out/all, or place=<name> from OSM.
The same camera functions serve hand and words. Offline camera phrases
include "orbit London left", "pan London right", "approach London",
"retreat from London", "reset London view" and "london view place=Soho".
Script london_view uses these action arguments on the front map.

The empty ask bar exposes Places, Look (Night, Dusk, Chalk) and View for a London window.
View offers Closer, Further, Turn, Pan and Reset view; the direction groups
label each action explicitly and stay open for repeated clicks. These use
the same camera operations as words, without changing the map's history.
`view controls`, `orbit controls` and `pan controls` open those groups too.
In Zoom, Window actions visits the map in Focus to give its choices room;
Put back restores the saved Zoom view and retains the changed map camera.

The material studies are night (the default: lit windows, neon rooflines and
glowing streets, in half-float views that the frame's bloom makes glow), dusk
and chalk. Choose them through look london.palette or London's Look › choices.
Both have a fixed key light, a calm unsimulated river and no pointer lighting.
Labels come from OSM, are projected with the camera and fitted into non-
overlapping boxes. Districts, parks and notable landmarks lead the overview;
listed house addresses become available only on approach. Their count follows
the screen area. Named outline/node duplicates share one prominent caption;
the largest significant footprint leads it. Measured widths keep a small
rounding allowance so short names are shown whole. Attribution has a quiet
contrasting backplate, fitted at the bottom of every view. Small captions,
attribution and the gesture hint share ink and plates checked for contrast
over both material palettes. The gesture hint disappears after exploration.
Custom named pins retain their meaning: their fitted captions lead the optional
OSM place labels, use the same collision plan, and stay inside the view near its
edges. Nearby pins try captions below or beside the marker before yielding to
a collision, with quiet leaders tying each name to its spot. Pins are also
named on the released ground.

The host's shared database loader reads/checks on a worker. One mesh worker
builds roofs, walls, roads and labels, with a 256 MiB geometry bound. The
committed city produces 5,121,079 vertices and 2,937,770 triangles in 6,673
spatial batches, using 199,127,768 geometry bytes. Central full detail gives way
through a short selection band of whole OSM buildings and residential roads,
instead of a rectangular detail cliff; see LONDON_DATA.md.
Geometry is charged before allocation, with exact pool capacities rather than
amortized growth. Labels move from the worker without frame-loop string copies.
The worker makes every triangle face its material normal, including courtyard
walls and roof/ground polygons whose source rings run either way. Metal culls
back faces. The mesh regression checks every triangle's orientation.
The GPU receives immutable
staging chunks at most 4 MiB per encoded frame, including any outstanding
staging from frames built without encoding; this allowance is separate from the
published models' 4 MiB total. Nothing draws before upload is complete.

Each native colour view follows its projected screen footprint, including
embedded maps and their scrolling/content scale, with four-sample antialiasing
and depth. A view is capped at four million colour pixels, preserving its
aspect, with labels and attribution drawn at display resolution. At most eight million active colour pixels
are retained across all London views. The allowance is shared across all visible
requests, reducing large textures proportionally when needed. A later map is
never left waiting for pixels held by its visible neighbours. Unseen caches keep
only spare room and yield under pressure; otherwise they release their slots after
90 frames, using the renderer's normal delayed image retirement. Static
cameras reuse the rendered image; movement culls spatial batches against
the frustum. Minor buildings and roads leave off beyond 26 km.
The camera uses reversed GPU depth, formed in double precision, so sub-metre
ground layers remain distinct even at the widest city view. A regression checks
their actual f32 clip depths at distances from 120 m to 80 km.
Drawing requests belong to each built frame, including its inspection/capture
plan. Frames that are built without GPU encoding do not accumulate older poses.
Screen-to-card rays, the current surface inverse and both pan endpoints remain
f64 through the city ground intersection. A dispatch scenario checks the App
mapping against an independently composed double-precision inverse in all five
layouts, rather than testing the city camera in isolation.

Headless captures wait for requested CPU preparation and encode every upload
frame; real-time frames only poll. A cold-capture integration regression needs
Metal, and checks the actual picture for city geometry. Geometry, camera,
upload budgeting and dispatch scenario tests need no GPU.
Opaque city images and ordinary window glass supply at most eight conservative
screen interiors to the compositor, one useful interior per opaque surface.
Ordinary glass samples the sky and outputs full coverage inside its edges;
its tint alpha controls colour mixing. Liquid glass stays excluded.
Covered world materials and reflections stop before expensive shading;
painter order retains the cities and their own labels.
The plan excludes fading windows and the released ground, and leaves corners,
clips, scroll fades, defocus and two drawable pixels around every edge drawing
normally. A Metal regression compares the actual pixels with this optimization
enabled and disabled, including tilt and fading clips.
Whole planar quads inside a later cover also leave the normal-world draw
stream. Their analytic shadow/glow/blur and clip bounds must fit completely;
partly visible quads, camera-facing spheres and liquid unions keep drawing.
The reflected stream remains independent. Benchmark logs count the omitted
world instances alongside actual draw calls.
Broad shadow, ordinary-glass, native map-image, line and triangle quads keep only disjoint visible screen
strips before rasterization, using conservative integer scissors inside the
opaque covers. Their original geometry and materials stay unchanged. Thirty-two
strips bound the work; unsafe projection or overflow retains ordinary drawing.
Reflections and liquid glass keep their normal path. The Metal equivalence
regression includes partly covered shadows, panes, a fading ground image,
diagonal lines and filled triangles across clipped/fading/tilted
views, and the scissors reset before subsequent weather or chrome drawing.
Diagonal presentation strokes also calculate their existing coverage before
the shared clip and cover work. Exactly zero coverage leaves early; the
analytic distance, round caps, gradient, AA, defocus and geometry are unchanged.
The Metal equivalence test compares that order with the former one, including
reflections, clipped/tilted strokes and zero-length segments.
See reviews/2026-10-14-london-view-first-shots.md for the visual iterations and
the measured 3200×2000 frame budget.

The release button and its words lay London on the existing floor as a north-up
survey from the native city. Its saved window camera is kept separately.
Release uses that camera even when the map started outside London and was
panned into the city. The original source coordinates stay in its history.
"Map back" restores that view and the same history, and brings its window forward
through the same go-to path. An offline dispatch scenario covers returning from
Orbit as well as the routed ground-window flow. The ground's attribution is in
its own contained footer beneath the ask bar, legible independently of the floor's
perspective, fade and other windows. Raster ground maps retain their tiles and
gain the same attribution footer. The release/return scenario uses App::dispatch.

Dusk is the default: warm roofs, distinct walls, a dark calm river and deep
green parks. Chalk remains a transient material study with ivory roofs and
slate green ground. Focus, Grid, Orbit, Stack, Zoom and the released ground
have been inspected with the actual city and contained attribution. Soho at
2× and daytime chrome have also passed inspection. Culling preserves complete
roofs, walls, courtyards, bridges and ground in every layout; the return shot
shows the saved Soho camera in front.

## Validation and performance acceptance

Claude accepted the London view after testing the current merged tree outside
this sandbox. Both renderer pixel comparisons pass:
empty_line_fragments_leave_without_changing_their_visible_pixels and
opaque_city_covers_preserve_the_pixels_of_fades_curves_and_tilt. Both London
integration tests pass too: cold preparation/upload completes before capture,
and settled ordinary profiling keeps its native image without geometry redraws.
All five layouts, both palettes, close Soho, day, ground release/return, custom
pins and multiple large maps have been inspected through --check captures.
The merged presentation and its exposed strokes, floor, triangle seams and
reflections remain complete.

Frame budgets were judged against same-run controls on a shared GPU. Claude
paused his other jobs for the alternating shots-quiet2 batch, while other
applications still shared the GPU. The city-free cascade itself costs about
7 to 8.5 ms p50. The final 3200×2000 measurements each cover 120 warm frames:

| Scene | GPU p50 / p99 | GPU mean | p50 relative to corresponding cascade control | GPU / CPU misses |
|---|---|---|---|---|
| Grid A | 5.201 / 10.407 ms | 5.647 ms | -3.333 ms | 5 / 0 |
| Moving city A | 8.328 / 16.053 ms | 8.993 ms | -0.206 ms | 59 / 1 |
| Still city A | 9.144 / 17.505 ms | 9.623 ms | +0.610 ms | 81 / 25 |
| Cascade control A | 8.534 / 11.503 ms | 8.591 ms | 0 | 66 / 0 |
| Cascade control B | 7.077 / 11.524 ms | 7.263 ms | 0 | 9 / 1 |
| Still city B | 6.892 / 17.038 ms | 7.741 ms | -0.185 ms | 22 / 2 |
| Moving city B | 7.312 / 15.254 ms | 7.789 ms | +0.235 ms | 22 / 0 |
| Grid B | 6.851 / 12.759 ms | 7.149 ms | -0.226 ms | 23 / 0 |

These compare whole scenes with different content, not additive component
costs. The still and moving differences lie within variation between runs.
This is relative feature acceptance; the shared controls' missed frames do not
establish an absolute 120 Hz guarantee. The general control cost remains a
separate performance issue. The absolute target remains 8.33 ms per frame.

Each moving capture redraws only the changing view on 86 of 120 frames and
reuses the other three. Both still captures have zero city redraws. Ordinary
profiling already confirms a cached city stage of 0.000 ms; a cache hit opens
no city render pass. No city detail or internal resolution was reduced for
acceptance. Empty diagonal-line fragments leave early with unchanged analytic
coverage; the observed isolated line median fell from 2.870 to 0.734 ms in
preceding captures.

Script profile requests diagnostic stages after the ordinary benchmark, retaining
the normal cache. profile city_redraw explicitly forces geometry measurements
only during profiling, with actual redraws counted separately. Each stage uses
its GPU interval; command submissions change scheduling and pass boundaries,
so the sum is not an ordinary frame time or an additive breakdown. Per-material
profiles likewise use a disposable target and do not change the picture or run
in live frames. The complete iteration record, earlier measurements and
fail-before regressions are in reviews/2026-10-14-london-view-first-shots.md.
