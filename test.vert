#version 300 es

in vec2 in_position;

void main() {
	const vec2 positions[3] = vec2[3](
		vec2(-1.0, 1.0),
		vec2(1.0, 1.0),
		vec2(0.0, -1.0)
	);

	gl_Position = vec4(positions[gl_VertexID], 0.0, 1.0);
}