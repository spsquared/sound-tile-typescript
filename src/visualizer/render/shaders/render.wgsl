struct VertexIn {
    @builtin(vertex_index) vertex_index: u32,
    @location(0) position: vec2<f32>
}

struct VertexOut {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) placeholder: f32
}

struct FragIn {
    @location(0) placeholder: f32
}

@vertex
fn vertex_main(vertex: VertexIn) -> VertexOut {
    var out: VertexOut;
    out.clip_position = vec4<f32>(f32(vertex.vertex_index), 0.0, 0.0, 1.0);
    return out;
}

@fragment
fn fragment_main(frag: FragIn) -> @location(0) vec4<f32> {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
}