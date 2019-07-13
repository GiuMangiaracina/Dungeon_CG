#version 300 es
precision highp float;

in vec2 fsUVs;
in vec4 goureaudSpecular;
in vec4 goureaudDiffuseAndAmbient;

out vec4 outColor;

uniform float textureInfluence;
uniform sampler2D textureFile;

uniform vec4 mDiffColor;


void main() {

	//Computing the color contribution from the texture
	vec4 diffuseTextureColorMixture = mDiffColor * (1.0 - textureInfluence) + texture(textureFile, fsUVs) * textureInfluence ;
	outColor = min((diffuseTextureColorMixture * goureaudDiffuseAndAmbient) + goureaudSpecular, vec4(1.0, 1.0, 1.0, 1.0));
}