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
uniform mat4 normalMatrix;

uniform vec4 mSpecColor;
uniform float mSpecPower;

uniform vec3 lightDirection;
uniform vec4 lightPosition;
uniform vec4 lightColor;
uniform int lightType;

uniform vec4 ambientLightColor;
uniform float ambientLightInfluence;

float lightTargetDistance = 61.0;		// Target distance (g) for point light with decay and spot light.
float lightDecay = 0.0;                 // Decay (beta) for point light with decay and spot light.
float outerConeAngle = 120.0;           // Angle of the outer cone for spot light (in degrees).
float innerConeAngle = 90.0;            // Angle of the inner cone for spot light (in degrees).

vec4 lightModel(int lightType, vec3 objPos) {

    // The normalized light direction.
    vec3 nLightDir;

    // Float to store light dimension and cone length. Note that LDim is only useful for point light with decay
    // and spot light.
    float lDim, lCosIn, lCosOut, lCone;

    lDim = 1.0;

    if(lightType == 1) { 			// Directional light
        nLightDir = normalize(-lightDirection);
    } else if(lightType == 2) {		// Point light
        nLightDir = normalize(vec3(lightPosition) - objPos);
    } else if(lightType == 3) {		// Point light (decay)
        float lLen = length(vec3(lightPosition) - objPos);
        nLightDir = normalize(vec3(lightPosition) - objPos);
        lDim = pow((lightTargetDistance / length(vec3(lightPosition) - objPos)), lightDecay);
    } else if(lightType == 4) {		// Spot light //todo edit this
        nLightDir = normalize(vec3(lightPosition) - objPos);
        lCosIn = cos(radians(innerConeAngle / 2.0));
        lCosOut = cos(radians(outerConeAngle / 2.0));
        lCone = -dot(nLightDir, normalize(lightDirection));
        lDim = pow((lightTargetDistance / length(vec3(lightPosition) - objPos)), lightDecay) * clamp((lCone - lCosOut) / (lCosIn - lCosOut), 0.0, 1.0);
    }
    return vec4(nLightDir, lDim);
}


void main() {

    fsUVs = inUVs;
    gl_Position = wvpMatrix * vec4(inPosition, 1.0);

    vec3 vertexPos = (wvMatrix * vec4(inPosition, 1.0)).xyz;
    vec3 nEyeDirection = normalize(-vertexPos);
    vec3 nNormal = normalize(mat3(normalMatrix) * inNormal);

    // Instead of computing it as nlightDirection = - normalize(lightDirection),
    // we call a function to define light direction and size even for not-directional case.
    vec4 lm = lightModel(lightType, vertexPos);
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