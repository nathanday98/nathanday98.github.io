#version 300 es

precision highp float;

in vec2 vertex_out_uv;
in vec4 vertex_out_color_data;

out vec4 out_color;

uniform PerScene {
	mat4 u_projection;
	float u_gradient_count;
};

uniform sampler2D u_gradient_atlas;

float linearFromSRGB (float srgb) {
  return srgb <= 0.04045f
       ? srgb / 12.92f
       : pow((srgb + 0.055f) / 1.055f, 2.4f);
}

vec4 linearFromSRGB(vec4 srgb) {
	return vec4(linearFromSRGB(srgb.r), linearFromSRGB(srgb.g), linearFromSRGB(srgb.b), srgb.a);
}

void main() {
	float inv = sign(vertex_out_uv.x);
	vec2 p = vec2(abs(vertex_out_uv.x - inv), vertex_out_uv.y);

	vec4 frag_data = vertex_out_color_data;
	vec2 frag_uv = frag_data.xy;
	float solid_or_gradient = sign(frag_data.w) * 0.5f + 0.5f; // -1 = gradient, 1 = solid
	vec4 gradient_color = vec4(0.0f, 0.0f, 0.0f, 0.0f);
	float grad_debug = 0.0;
	
		
		float grad_inc = 1.0 / u_gradient_count;
		float grad_index = abs(frag_data.z) * grad_inc + (grad_inc * 0.5f);
		float grad_type_weight = sign(frag_data.z) * 0.5f + 0.5f;
		vec2 focal_point = vec2(abs(frag_data.w)-1.0, 0.0f);

		float grad_x_linear = frag_uv.x + 0.5f; // linear
		
		vec2 d = focal_point - (frag_uv * 2.0f);
		float l = length(d);
		d /= l;
		float t = l / (sqrt(1.0 - focal_point.x*focal_point.x*d.y*d.y) + focal_point.x*d.x);

		float grad_x = mix(grad_x_linear, t, grad_type_weight);
		// float grad_x = 1.0 - t;
		grad_debug = grad_index;
		gradient_color = texture(u_gradient_atlas, vec2(grad_x, grad_index));
	

	

	vec4 final_color = linearFromSRGB(mix(gradient_color, frag_data, solid_or_gradient));

	// gradients
	vec2 px = dFdx(p);
	vec2 py = dFdy(p);

	// chain rule
	float fx = (2.0 * p.x) * px.x - px.y;   
	float fy = (2.0 * p.x) * py.x - py.y;   

	// signed distance
	float sd = inv * (((p.x * p.x - p.y) / sqrt(fx * fx + fy * fy)));

	// linear alpha
	float alpha = 0.5 - sd;
	// if(alpha > 1.0) {
	// 	final_color.a = 1.0;
	// } else if(alpha < 0.0) {
	// 	final_color.a = 0.0;
	// 	discard;
	// } else {
	// 	// final_color.rgb = vec3(alpha, alpha, alpha);
	// 	final_color.a = alpha;
	// }

	if(alpha < 0.5) {
		discard;
	}

	// out_color = final_color;
	out_color = vec4(pow(final_color.r, 1.0 / 2.2), pow(final_color.g, 1.0 / 2.2), pow(final_color.b, 1.0 / 2.2), final_color.a);
	// out_color = vec4(grad_debug, 0.0, 0.0, 1.0);
	// out_color = vec4(vertex_out_uv, 0.0, 1.0);
	// out_color = vec4(vertex_out_uv,  0.0, 1.0);
}