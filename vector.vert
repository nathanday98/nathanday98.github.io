#version 300 es

in vec2 in_position;
in vec2 in_uv;
in vec4 in_color_data;

out vec2 vertex_out_uv;
out vec4 vertex_out_color_data;

uniform PerScene {
	mat4 u_projection;
	float u_gradient_count;
};

void main() {
	vertex_out_uv = in_uv;
	vertex_out_color_data = in_color_data;
	// #TODO: remove -y hack
	gl_Position = u_projection * vec4(in_position.x, in_position.y, 0.0, 1.0);
}