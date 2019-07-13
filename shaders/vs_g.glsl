#version 300 es
in vec3 inPosition; 
in vec3 inNormal; 
in vec2 inUVs;

out vec2 fsUVs;

//We have to separate the components that require the texture from the others.
out vec4 goureaudSpecular;
out vec4 goureaudDiffuseAndAmbient;

uniform mat4 wvpMatrix;
uniform mat4 wvMatrix;
uniform mat3 normalMatrix;

uniform vec4 mSpecColor;            
uniform float mSpecPower;

uniform vec3 lightDirection;
uniform vec3 lightPosition;
uniform vec4 lightColor;
uniform int lightType;

uniform vec4 ambientLightColor;
uniform float ambientLightInfluence;

vec4 lightModel(int lType, vec3 objPos) {
	
	// The normalized light direction.
    vec3 nLightDir;
	
	// Float to store light dimension and cone length. Note that LDim is only useful for point light with decay
	// and spot light.
	float lDim, lCone;

	lDim = 1.0;
	
	if(lType == 1) { 			// Directional light
		nLightDir = normalize(-lightDirection);
	} else if(lType == 2) {		// Point light
		nLightDir = normalize(lightPosition - objPos);
	} else if(lType == 3) {		// Point light (decay)
		float lLen = length(lightPosition - objPos);
		nLightDir = normalize(lightPosition - objPos);
		lDim = 160.0 / (lLen * lLen);
	} else if(lType == 4) {		// Spot light //todo edit this
		nLightDir = normalize(lightPosition - objPos);
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

	fsUVs = inUVs;
	gl_Position = wvpMatrix * vec4(inPosition, 1.0);

	vec3 vertexPos = (wvMatrix * vec4(inPosition, 1.0)).xyz;
	vec3 nEyeDirection = normalize(-inPosition);
	//vec3 nEyeDirection = normalize(-vertexPos);
	vec3 nNormal = normalize(inNormal);
	//vec3 nNormal = normalize(normalMatrix * inNormal);

	// Instead of computing it as nlightDirection = - normalize(lightDirection),
	// we call a function to define light direction and size even for not-directional case.
	vec4 lm = lightModel(lightType, inPosition);
	//vec4 lm = lightModel(lightType, vertexPos);
	vec3 nLightDirection = lm.rgb;
	float lightDimension = lm.a;
	
	//Computing the ambient light contribution (without the texture contribution).
	vec4 ambLight = ambientLightColor * ambientLightInfluence;
	if(lightType == 5){
		goureaudSpecular = vec4(0.0, 0.0, 0.0, 0.0);
		goureaudDiffuseAndAmbient = vec4(1.0, 1.0, 1.0, 1.0);
	} else {
		// Computing the diffuse component of light (without the texture contribution).
		vec4 diffuse = lightColor * clamp(dot(nLightDirection, nNormal), 0.0, 1.0) * lightDimension;
		
		//Reflection vector for Phong model.
		vec3 reflection = -reflect(nLightDirection, nNormal);
		vec4 specular = mSpecColor * lightColor * pow(clamp(dot(reflection, nEyeDirection),0.0, 1.0), mSpecPower) * lightDimension;
			
		goureaudSpecular = specular;
		goureaudDiffuseAndAmbient = diffuse + ambLight;
	}
	
}