#version 300 es
in vec3 inPosition; 
in vec3 inNormal; 
in vec2 inUVs;

out vec3 fsNormal; 
out vec3 fsPosition; 
out vec2 fsUVs;
out vec2 fsUV2s;

uniform mat4 wvpMatrix;
uniform mat4 wvMatrix;
uniform mat4 normalMatrix;

void main() {
	//fsNormal = normalize(inNormal);
	fsNormal = normalize(mat3(normalMatrix) * inNormal);
	fsPosition = (wvMatrix * vec4(inPosition, 1.0)).xyz;
	fsUVs = inUVs;

	// Position of the vertex, on which clipping, normalized and pixel coordinates are computed by WebGL.
	gl_Position = wvpMatrix * vec4(inPosition, 1.0);
}
	