#version 300 es
in vec3 inPosition; 
in vec3 inNormal; 
in vec2 inUVs;

out vec3 fsNormal; 
out vec3 fsPosition; 
out vec2 fsUVs;
out vec2 fsUV2s;

uniform mat4 wvpMatrix; 


void main() { 
	fsNormal = inNormal; 
	fsPosition =  inPosition;
	fsUVs = inUVs;
	gl_Position = wvpMatrix * vec4(inPosition, 1.0);
}
	