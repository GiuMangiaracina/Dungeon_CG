#version 300 es
precision highp float;

in vec3 fsNormal;
in vec3 fsPosition;
in vec2 fsUVs;

out vec4 outColor;

uniform vec4 mDiffColor;
uniform vec4 mSpecColor;            
uniform float mSpecPower;

uniform float textureInfluence;
uniform sampler2D textureFile;

uniform float ambientLightInfluence;
uniform vec4 ambientLightColor;

uniform vec3 lightDirection;
uniform vec4 lightPosition;
uniform vec4 lightColor;
uniform int lightType;

//Function to create different lights types
//int lt = the selected light source type
//vec3 pos = the surface position

vec4 lightModel(int lightType, vec3 objPos) {
	
	// The normalized light direction.
    vec3 nLightDir;
	
	// Float to store light dimension and cone length.
	float lDim, lCone;

	lDim = 1.0;
	
	if(lightType == 1) { 			//Directional light
		nLightDir = normalize(-lightDirection);
	} else if(lightType == 2) {	//Point light
		nLightDir = normalize(lightPosition.xyz - objPos);
	} else if(lightType == 3) {	//Point light (decay)
		float lLen = length(lightPosition.xyz - objPos);
		nLightDir = normalize(lightPosition.xyz - objPos);
		lDim = 160.0 / (lLen * lLen);
	} else if(lightType == 4) {	//Spot light
		nLightDir = normalize(lightPosition.xyz - objPos);
		lCone = -dot(nLightDir, normalize(lightDirection));
		if(lCone < 0.5) {
			lDim = 0.0;
		} else if(lCone > 0.7) {
			lDim = 1.0;
		} else {
			lDim = (lCone - 0.5) / 0.2;
		}
	}
	return vec4(nLightDir, lDim);
}

void main() { 

	vec3 nEyeDirection = normalize(-fsPosition);
	vec3 nNormal = normalize(fsNormal);
	
	// Instead of computing it as nlightDirection = - normalize(lightDirection),
	// we call a function to define light direction and size even for not-directional case.
	vec4 lm = lightModel(lightType, fsPosition);
	vec3 nlightDirection = lm.rgb;
	float lightDimension = lm.a;
	
	// Computing the color contribution from the texture.
	vec4 diffuseTextureColorMixture = texture(textureFile, fsUVs) * textureInfluence + mDiffColor * (1.0 - textureInfluence) ;

	// Computing the ambient light contribution.
	// We assume that the ambient color of the object is identical to it diffuse color
	// (excluding its texture contribution).
	vec4 phongAmbLight = ambientLightColor * ambientLightInfluence;
	
	if(lightType == 5){
		outColor = diffuseTextureColorMixture;
	} else {
		// Computing the diffuse component of light (excluding its texture contribution).
		vec4 phongDiffuse = lightColor * clamp(dot(nlightDirection, nNormal), 0.0, 1.0) * lightDimension;
		
		// Reflection vector for Phong model
		vec3 reflection = -reflect(nlightDirection, nNormal);	
		vec4 phongSpecular = mSpecColor * lightColor * pow(clamp(dot(reflection, nEyeDirection),0.0, 1.0), mSpecPower) * lightDimension;
		outColor = min((diffuseTextureColorMixture * (phongAmbLight + phongDiffuse)) + phongSpecular, vec4(1.0, 1.0, 1.0, 1.0));
	}
	

}