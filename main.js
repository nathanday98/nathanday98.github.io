// @ts-check


async function main() {

	const canvas = /** @type {HTMLCanvasElement!} */(document.getElementById("main-canvas"));
	const gl = /**  @type {WebGL2RenderingContext} */ canvas.getContext("webgl2", {
		antialias: false,
		premultipliedAlpha: false,
		alpha: true,
	});

	if (!gl) {
		return;
	}

	/**
	 * 
	 * @param {WebGL2RenderingContext} gl 
	 * @param {number} type 
	 * @param {string} source 
	 * @returns 
	 */
	function create_shader(gl, type, source) {
		// console.log(source);
		const shader = gl.createShader(type);
		if (!shader) {
			throw new Error("gl.createShader failed");
		}
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if (!success) {
			throw new Error(gl.getShaderInfoLog(shader) || "failed to compile shader");
			gl.deleteShader(shader);
		}

		return shader;
	}

	/**
	 * 
	 * @param {WebGL2RenderingContext} gl 
	 * @param {WebGLShader} vertex_shader 
	 * @param {WebGLShader} fragment_shader 
	 * @returns {WebGLShader}
	 */
	function create_program(gl, vertex_shader, fragment_shader) {
		const program = gl.createProgram();
		if (!program) {
			throw new Error("gl.createProgram failed");
		}
		gl.attachShader(program, vertex_shader);
		gl.attachShader(program, fragment_shader);
		gl.linkProgram(program);
		const success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if (!success) {
			const error = gl.getProgramInfoLog(program);
			throw new Error(error || "failed to link program");
			gl.deleteProgram(program);

		}


		return program;
	}

	const test_vertex_shader_response = await fetch("/test.vert");
	const test_vertex_shader_source = await test_vertex_shader_response.text();

	const test_vertex_shader = create_shader(gl, gl.VERTEX_SHADER, test_vertex_shader_source);

	const test_fragment_shader_response = await fetch("/test.frag");
	const test_fragment_shader_source = await test_fragment_shader_response.text();

	const test_fragment_shader = create_shader(gl, gl.FRAGMENT_SHADER, test_fragment_shader_source);

	const test_program = create_program(gl, test_vertex_shader, test_fragment_shader);


	const vector_vertex_shader_response = await fetch("/vector.vert");
	const vector_vertex_shader_source = await vector_vertex_shader_response.text();

	const vector_vertex_shader = create_shader(gl, gl.VERTEX_SHADER, vector_vertex_shader_source);

	const vector_fragment_shader_response = await fetch("/vector.frag");
	const vector_fragment_shader_source = await vector_fragment_shader_response.text();

	const vector_fragment_shader = create_shader(gl, gl.FRAGMENT_SHADER, vector_fragment_shader_source);

	const vector_program = create_program(gl, vector_vertex_shader, vector_fragment_shader);

	const vector_position_attribute_loc = gl.getAttribLocation(vector_program, "in_position");
	const vector_uv_attribute_loc = gl.getAttribLocation(vector_program, "in_uv");
	const vector_color_data_attribute_loc = gl.getAttribLocation(vector_program, "in_color_data");


	const vertices = await (await fetch("/vertices.bin")).arrayBuffer();
	const indices = await (await fetch("/indices.bin")).arrayBuffer();
	const gradients = await (await fetch("/gradients.bin")).arrayBuffer();
	const shapes = await (await fetch("/shapes.bin")).arrayBuffer();
	const shapes_view = new DataView(shapes);
	const shapes_stride = 28;
	const shape_count = shapes.byteLength / shapes_stride;

	for (let i = 0; i < shape_count; i++) {
		const view_offset = i * shapes_stride;
		const index_offset = shapes_view.getUint32(view_offset + 0, true);
		const index_count = shapes_view.getUint32(view_offset + 4, true);
		const vertex_offset = shapes_view.getUint32(view_offset + 8, true);
		const min_x = shapes_view.getFloat32(view_offset + 12, true);
		const min_y = shapes_view.getFloat32(view_offset + 16, true);
		const max_x = shapes_view.getFloat32(view_offset + 20, true);
		const max_y = shapes_view.getFloat32(view_offset + 24, true);
		console.log(`Shape ${i}: index offset: ${index_offset}, index count: ${index_count}`);
	}

	const gradients_values_raw = new Uint32Array(gradients);

	const gradient_count = gradients_values_raw[2];
	const gradient_atlas_width = gradients_values_raw[0];
	const gradient_atlas_height = gradients_values_raw[1];

	const uniform_block_index = gl.getUniformBlockIndex(vector_program, "PerScene");
	const uniform_block_size_bytes = gl.getActiveUniformBlockParameter(vector_program, uniform_block_index, gl.UNIFORM_BLOCK_DATA_SIZE);

	const uniform_buffer = gl.createBuffer();
	gl.bindBuffer(gl.UNIFORM_BUFFER, uniform_buffer);
	gl.bufferData(gl.UNIFORM_BUFFER, uniform_block_size_bytes, gl.DYNAMIC_DRAW);
	gl.bindBuffer(gl.UNIFORM_BUFFER, null);
	gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uniform_buffer);

	console.log(vertices);

	const vertex_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	const vertex_size_bytes = 2 * 4 + 2 * 4 + 4 * 4;

	const vao = gl.createVertexArray();
	gl.bindVertexArray(vao);
	gl.enableVertexAttribArray(vector_position_attribute_loc);
	gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
	gl.vertexAttribPointer(vector_position_attribute_loc, 2, gl.FLOAT, false, vertex_size_bytes, 0);
	gl.enableVertexAttribArray(vector_uv_attribute_loc);
	gl.vertexAttribPointer(vector_uv_attribute_loc, 2, gl.FLOAT, false, vertex_size_bytes, 2 * 4);
	gl.enableVertexAttribArray(vector_color_data_attribute_loc);
	gl.vertexAttribPointer(vector_color_data_attribute_loc, 4, gl.FLOAT, false, vertex_size_bytes, 2 * 4 + 2 * 4);
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	const vertex_arr = new Float32Array(vertices);
	const mul = 8;
	for (let i = 0; i < vertex_arr.length / mul; i++) {

		const pos_x = vertex_arr[i * mul + 0];
		const pos_y = vertex_arr[i * mul + 1];
		const uv_x = vertex_arr[i * mul + 2];
		const uv_y = vertex_arr[i * mul + 3];

		const data_x = vertex_arr[i * mul + 4];
		const data_y = vertex_arr[i * mul + 5];
		const data_z = vertex_arr[i * mul + 6];
		const data_w = vertex_arr[i * mul + 7];
		// console.log(`Pos: ${pos_x}, ${pos_y}, UV: ${uv_x}, ${uv_y}, Data: ${data_x}, ${data_y}, ${data_z}, ${data_w}`);
	}

	const index_buffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

	const gradient_atlas = gl.createTexture();
	gl.activeTexture(gl.TEXTURE0 + 0);
	gl.bindTexture(gl.TEXTURE_2D, gradient_atlas);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gradient_atlas_width, gradient_atlas_height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(gradients, 3 * 4, gradients.byteLength - 3 * 4));
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.bindTexture(gl.TEXTURE_2D, null);


	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	// gl.enable(gl.SAMPLE_COVERAGE);
	// gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
	console.log(gl.drawingBufferColorSpace);

	if (gl) {

		const import_object = {
			env: {
				glClear: (buffers) => gl.clear(buffers),
				glClearColor: (r, g, b, a) => gl.clearColor(r, g, b, a),
				glCreateBuffer: () => gl.createBuffer(),
				doThing: () => console.log("diong thing"),
				is_js_obj_null: (obj) => obj === null,
				debug_break: () => { throw new Error("debug break"); },
				log_num: (num) => console.log(num),
			},
		};

		WebAssembly.instantiateStreaming(fetch("/main.wasm"), import_object).then((obj /** @type {WebAssembly.Instance} */) => {
			const exports = obj.instance.exports;

			// @ts-ignore
			exports.init();

			// @ts-ignore
			// console.log(exports.get_memory_size());
			// console.log(exports.get_heap_base());
			// console.log(exports.get_heap_end());
			// exports.memory_grow(1);
			// console.log("grow");
			// console.log(exports.get_memory_size());
			// console.log(exports.get_heap_base());
			// console.log(exports.get_heap_end());

			let scale = 4;

			function tick(time /** @type {number} */) {
				if (gl === null) {
					return;
				}

				gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

				gl.clearColor(0.99, 0.96, 0.89, 1.0);
				gl.clear(gl.COLOR_BUFFER_BIT);

				const half_canvas_width = gl.canvas.width / scale / window.devicePixelRatio;
				const half_canvas_height = gl.canvas.height / scale / window.devicePixelRatio;
				const mat = new Float32Array([
					1 / half_canvas_width, 0, 0, 0,
					0, 1 / -half_canvas_height, 0, 0,
					0, 0, 1, 0,
					-0.25 * scale / 4, 0.1 * scale / 4, 0, 1,
					gradient_count,
				]);

				gl.bindBuffer(gl.UNIFORM_BUFFER, uniform_buffer);
				gl.bufferSubData(gl.UNIFORM_BUFFER, 0, mat);
				gl.bindBuffer(gl.UNIFORM_BUFFER, null);

				gl.bindTexture(gl.TEXTURE_2D, gradient_atlas);

				// @ts-ignore
				// obj.instance.exports.tick(time / 1000);
				gl.useProgram(vector_program);
				gl.bindVertexArray(vao);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
				// gl.drawArrays(gl.TRIANGLES, 0, 3);

				for (let i = 0; i < shape_count; i++) {
					const view_offset = i * shapes_stride;
					const index_offset = shapes_view.getUint32(view_offset + 0, true);
					const index_count = shapes_view.getUint32(view_offset + 4, true);
					const vertex_offset = shapes_view.getUint32(view_offset + 8, true);
					const min_x = shapes_view.getFloat32(view_offset + 12, true);
					const min_y = shapes_view.getFloat32(view_offset + 16, true);
					const max_x = shapes_view.getFloat32(view_offset + 20, true);
					const max_y = shapes_view.getFloat32(view_offset + 24, true);
					gl.drawElements(gl.TRIANGLES, index_count, gl.UNSIGNED_INT, index_offset * 4);
				}


				gl.useProgram(test_program);
				// gl.drawArrays(gl.TRIANGLES, 0, 3);

				requestAnimationFrame(tick);
			}

			const observer = new ResizeObserver(resize_the_canvas_to_display_size)

			/**
			 * From https://www.khronos.org/webgl/wiki/HandlingHighDPI
			 * @param {ResizeObserverEntry[]} entries 
			 */
			function resize_the_canvas_to_display_size(entries) {
				const entry = entries[0];
				console.log(entry)
				let width = 0;
				let height = 0;
				if (entry.devicePixelContentBoxSize) {
					width = entry.devicePixelContentBoxSize[0].inlineSize;
					height = entry.devicePixelContentBoxSize[0].blockSize;
				} else if (entry.contentBoxSize) {
					// fallback for Safari that will not always be correct
					width = Math.round(entry.contentBoxSize[0].inlineSize * window.devicePixelRatio);
					height = Math.round(entry.contentBoxSize[0].blockSize * window.devicePixelRatio);
				}
				canvas.width = width;
				canvas.height = height;
				console.log(`Set canvas size to ${width}, ${height}. DPI Scale: ${window.devicePixelRatio}`);
			}

			observer.observe(canvas);

			canvas.addEventListener("mousemove", (e /** @type {MouseEvent} */) => {
				const canvas_x = e.offsetX * canvas.width / canvas.offsetWidth;
				const canvas_y = e.offsetY * canvas.height / canvas.offsetHeight;
				// console.log(`${canvas_x}, ${canvas_y} - raw: ${e.offsetX}, ${e.offsetY}`);
			});

			canvas.addEventListener("wheel", function (event /** @type {WheelEvent} */) {
				event.preventDefault();
				scale += event.deltaY * -0.01;
			});

			requestAnimationFrame(tick);

		})
	} else {
		console.error("WebGL2 not supported");
	}
}

main();