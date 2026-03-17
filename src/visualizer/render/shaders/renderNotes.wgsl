struct Viewport {
    time_offset: f32
}

struct Instrument {
    parallax: f32,
    colors: u32
}

@group(0) @binding(0)
var<uniform> viewport: Viewport;
@group(0) @binding(1)
var linear_sampler: sampler;

@group(1) @binding(0)
var<storage, read> instruments: array<Instrument>;
@group(1) @binding(1)
var instrument_textures: texture_2d_array<f32>;

struct VertexIn {
    @builtin(vertex_index) vertex_index: u32,
    @location(0) position: vec3<f32>,
    @location(1) instrument: u32
}

struct VertexOut {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) @interpolate(flat) instrument: u32,
    @location(1) u: f32
}

struct FragIn {
    @location(0) @interpolate(flat) instrument: u32,
    @location(1) u: f32
}

@vertex
fn vertex_main(vertex: VertexIn) -> VertexOut {
    var out: VertexOut;
    out.clip_position = vec4<f32>(f32(vertex.vertex_index), 0.0, 0.0, 1.0);
    out.instrument = vertex.instrument;
    out.u = f32(vertex.vertex_index % 2u);
    return out;
}

@fragment
fn fragment_main(frag: FragIn) -> @location(0) vec4<f32> {
    return textureSample(instrument_textures, linear_sampler, vec2<f32>(frag.u, 1.0), frag.instrument);
}