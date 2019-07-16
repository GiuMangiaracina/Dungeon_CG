var canvas, checkbox;
var gl = null;

// Two handles, one for each shaders' couple. 0 = goureaud; 1 = phong.
var	shaderProgram = new Array(2);

// Directory location of shaders and models.
var shaderDir = "http://127.0.0.1:8887/shaders/";
var modelsDir = "http://127.0.0.1:8887/models/";

var perspectiveMatrix,
    viewMatrix;
var vertexNormalHandle = new Array(2);
var vertexPositionHandle = new Array(2);
var vertexUVHandle = new Array(2);
var textureFileHandle = new Array(2);
var textureInfluenceHandle = new Array(2);			// Slider for texture.
var ambientLightColorHandle = new Array(2);
var ambientLightInfluenceHandle = new Array(2);		// Slider for light.

// Handle for the world - view matrix.
var matrixWVHandle = new Array(2);

// Handle for the world - view - projection final matrix.
var matrixWVPHandle=new Array(2);

// Handle for the normals of vertices.
var normalMatrixPositionHandle = new Array(2);

var	materialDiffColorHandle = new Array(2);
var lightDirectionHandle = new Array(2);
var lightPositionHandle = new Array(2);
var lightColorHandle  = new Array(2);
var lightTypeHandle = new Array(2);
var materialSpecColorHandle = new Array(2);
var materialSpecPowerHandle  = new Array(2);			// It's the handle for the exponent used to tune the specular reflection.
var objectSpecularPower = 20.0;									// Actual exponent used.
var lightDecayFactorHandle = new Array(2);           // It's the handle for the exponent used to tune the light decay.
var lightDecayFactor = 1.0;                                     // Actual decay used.

// Parameters for light definition (directional light).
var dirLightAlpha  = - utils.degToRad(90);
var dirLightBeta = - utils.degToRad(120);

// Computation of direct light direction vector.
var lightDirection = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
    Math.sin(dirLightBeta),
    Math.cos(dirLightBeta) * Math.sin(dirLightAlpha),
];
var lightPosition = [0.0, 10.0, 0.0, 1.0];
var lightColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);	// White light.

var moveLightHandle = new Array(2);
var moveLight = 0;                                                      //0 : move the camera - 1 : Move the lights

// Transformed light direction and position for the scene. We need a matrix for each object.
var lightDirectionTransformed = [];
var lightPositionTransformed = [];

var currentLightType = 1;         		// 1 -> Direct, 2 -> Point, 3 -> Point with decay, 4 -> Spot.

var sceneObjects; // Total number of objects in the scene.

// The following arrays have sceneObjects as dimension.	
var vertexBufferObjectId = [];					// Matrix containing vertices of all the objects in the scene.
var indexBufferObjectId = [];					// Matrix containing indices used to display the objects in the scene.
var objectWorldMatrix = [];					    // Matrix containing the transform of each object.
var worldViewMatrix = [];						// Matrix containing the product of the world matrix with the view matrix.
var worldViewProjectionMatrix = [];				// Matrix containing the product of the world-view matrix with the perspective matrix.
var normalsTransformMatrix = [];				// Matrix containing the transform of the normals for each object (inverse-transpose of world-view matrix).
var facesNumber		= [];						// Used to establish the right order of indices to respect back face culling.
var diffuseColor 	= [];						// Diffuse material colors of objects.
var specularColor   = [];						// Specular material colors of the objects.
var diffuseTextureObj = [];					    // Texture material.
var nTexture 		= [];						// Number of textures per object.

// Parameters for Camera: look-in camera (first person).
// N.B.: the camera points toward negative z axis at the beginning.
var cx = 7;
var cy = 0.5;
var cz = 8;
var elevation = 0.0;
var angle = 0.0;

// Delta for movement.
var delta = 1;

// Last update for the animation of each door.
var lastUpdateTime1;
var lastUpdateTime2;
var lastUpdateTime3;

// Accumulators of the time passed, used in the animations of the doors.
var accumulator1 = 0.0;
var accumulator2 = 0.0;
var accumulator3 = 0.0;

var currentShader = 0;                			// Defines the current shader in use (0 -> Gouraud, 1 -> Phong).
var textureInfluence = 1.0;						// Slider value for texture influence.
var ambientLightInfluence = 0.3;				// Slider value for light influence.
var ambientLightColor = [1.0, 1.0, 1.0, 1.0];	// Starting light color is white.

var dungeonMap = [];				            // Matrix containing the map that states where the can or cannot go.

// Boolean used to check whether doors are open or not.
var door1Open = false;
var door3Open = false;
var door5Open = false;

// Booleans used to check whether the player is in the position of the levers.
var lever1PositionReached = false;
var lever3PositionReached = false;
var lever5PositionReached = false;

// Booleans used to check levers status.
var lever1Down = false;
var lever3Down = false;
var lever5Down = false;

// Previous values used for the translation along the y axis of the various doors.
var previousYDoor1 = 0.0;
var previousYDoor3 = 0.0;
var previousYDoor5 = 0.0;

var mouseSensitivity = 0.05;

function main() {

    canvas = document.getElementById("my-canvas");
    checkbox = document.getElementById("chbx");

    try {
        gl = canvas.getContext("webgl2", {alpha: false});
    } catch(e) {
        console.log(e);
    }
    if(gl) {

        // Setting the size for the canvas equal to half the browser window and other useful parameters.
        var w = canvas.clientWidth;
        var h = canvas.clientHeight;
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.viewport(0.0, 0.0, w, h);
        gl.enable(gl.DEPTH_TEST);

        // Computation of the perspective matrix, done only once.
        perspectiveMatrix = utils.MakePerspective(85, w/h, 0.1, 100.0);

        // Loads the map containing the "cells" the player can or cannot go.
        loadMap("Mapasterix.json");

        // Opens the json file containing the 3D model to load, parses it to retrieve objects' data
        // and creates the VBO and IBO from them.
        // The vertex format is (x,y,z,nx,ny,nz,u,v).
        loadModel("Dungeon.diff2.json");

        // Load shaders' code, compile them and retrieve the handles.
        loadShaders();

        //Setting up the interaction using keys and mouse.
        initInteraction();

        //Rendering cycle
        drawScene();

    } else {
        alert( "Error: Your browser does not appear to support WebGL.");
    }

}

/**
 * Called when the slider for texture influence is changed.
 * @param val Coefficient to multiply to the color given by the texture.
 */
function updateTextureInfluence(val) {
    textureInfluence = val;
}

/**
 * Called when the type of the light is changed.
 * @param val Integer value representing the type of light chosen by the player.
 */
function updateLightType(val) {
    currentLightType = parseInt(val);
}

/**
 * Called when the player checks the "Move Lights" box, enabling or disabling the movement of the light along with him.
 */
function updateLightMovement() {
    if (checkbox.checked === true) {
        moveLight = 1;
    } else {
        moveLight = 0;
        resetLights();
    }
}

/**
 * Called when the type of the shader is changed.
 * @param val Integer value representing the type of shader chosen by the player.
 */
function updateShader(val) {
    currentShader = parseInt(val);
}

/**
 * Called when the slider for ambient light influence is changed.
 * @param val Coefficient to multiply to the color given by the ambient light.
 */
function updateAmbientLightInfluence(val) {
    ambientLightInfluence = val;
}

/**
 * Called when the colour of the ambient light is changed. A conversion from hex to standard RGBA is performed.
 * @param val Value representing the colour of the ambient light chosen by the player.
 */
function updateAmbientLightColor(val) {
    val = val.replace('#','');
    ambientLightColor[0] = parseInt(val.substring(0,2), 16) / 255;      // R
    ambientLightColor[1] = parseInt(val.substring(2,4), 16) / 255;      // G
    ambientLightColor[2] = parseInt(val.substring(4,6), 16) / 255;      // B
    ambientLightColor[3] = 1.0;                                               // Alpha
}

function updateLightDecayFactor(val) {
    lightDecayFactor = val;
}

/**
 * This function loads the file containing the shaders (both Gouraud and Phong), gets their source, compiles them and
 * links them to the program.
 * After that, retrieves all the handles to the attributes and the uniforms of the shaders.
 */
function loadShaders(){
    //*** Shaders loading using external files

    utils.loadFiles([shaderDir + 'vs_p.glsl',
            shaderDir + 'fs_p.glsl',
            shaderDir + 'vs_g.glsl',
            shaderDir + 'fs_g.glsl'
        ],
        function(shaderText){
            // Even numbers are VSs, odd numbers are FSs.
            var numShader = 0;
            for(let i = 0; i < shaderText.length; i+=2){
                var vertexShader = gl.createShader(gl.VERTEX_SHADER);
                gl.shaderSource(vertexShader, shaderText[i]);
                gl.compileShader(vertexShader);
                if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)){
                    alert("ERROR IN VS SHADER : "+gl.getShaderInfoLog(vertexShader));
                }
                var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
                gl.shaderSource(fragmentShader, shaderText[i+1]);
                gl.compileShader(fragmentShader);
                if(!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)){
                    alert("ERROR IN FS SHADER : "+gl.getShaderInfoLog(fragmentShader));
                }
                shaderProgram[numShader] = gl.createProgram();
                gl.attachShader(shaderProgram[numShader], vertexShader);
                gl.attachShader(shaderProgram[numShader], fragmentShader);
                gl.linkProgram(shaderProgram[numShader]);
                if(!gl.getProgramParameter(shaderProgram[numShader], gl.LINK_STATUS)){
                    alert("Unable to initialize the shader program...");
                }
                numShader++;
            }

        });

    // Getting the handles to the shaders' vars.
    for(let i = 0; i < 2; i++){

        // Get attribute locations.
        vertexPositionHandle[i] = gl.getAttribLocation(shaderProgram[i],'inPosition');
        vertexNormalHandle[i] = gl.getAttribLocation(shaderProgram[i],'inNormal');
        vertexUVHandle[i] = gl.getAttribLocation(shaderProgram[i], 'inUVs');

        // Get uniform locations.
        matrixWVHandle[i] = gl.getUniformLocation(shaderProgram[i], 'wvMatrix');
        matrixWVPHandle[i] = gl.getUniformLocation(shaderProgram[i], 'wvpMatrix');
        normalMatrixPositionHandle[i] = gl.getUniformLocation(shaderProgram[i],'normalMatrix');

        materialDiffColorHandle[i] = gl.getUniformLocation(shaderProgram[i], 'mDiffColor');
        materialSpecColorHandle[i] = gl.getUniformLocation(shaderProgram[i], 'mSpecColor');
        materialSpecPowerHandle[i] = gl.getUniformLocation(shaderProgram[i], 'mSpecPower');
        textureFileHandle[i] = gl.getUniformLocation(shaderProgram[i], 'textureFile');

        textureInfluenceHandle[i] = gl.getUniformLocation(shaderProgram[i], 'textureInfluence');
        ambientLightInfluenceHandle[i] = gl.getUniformLocation(shaderProgram[i], 'ambientLightInfluence');
        ambientLightColorHandle[i] = gl.getUniformLocation(shaderProgram[i], 'ambientLightColor');

        lightDirectionHandle[i] = gl.getUniformLocation(shaderProgram[i], 'lightDirection');
        lightPositionHandle[i] = gl.getUniformLocation(shaderProgram[i], 'lightPosition');
        lightColorHandle[i] = gl.getUniformLocation(shaderProgram[i], 'lightColor');
        lightTypeHandle[i] = gl.getUniformLocation(shaderProgram[i],'lightType');
        lightDecayFactorHandle[i] = gl.getUniformLocation(shaderProgram[i], 'lightDecay');
        moveLightHandle[i] = gl.getUniformLocation(shaderProgram[i], 'moveLight');
    }
}

/**
 * Loads the map containing the "cells" where the player can go (corridors and open doors, 0 and 2(open)) or
 * cannot go (walls or other space, and closed doors, 1 and 2(closed)).
 * @param mapName Name of the file containing the map.
 */
function loadMap(mapName){
    utils.get_json(modelsDir + mapName, function(loadedMap){
        dungeonMap = loadedMap;
        console.log(dungeonMap);
        console.log("carattere :"+ dungeonMap[11][6]);
        //punto iniziale [11,6], 5 passi.
    });
}

/**
 * This function load every parameter needed to display the model: vertices, normals, textures, indices,
 * diffuse and specular colours of each material and also puts the indices in a way that respects back face culling.
 * @param modelName Name of the model to load.
 */
function loadModel(modelName){

    utils.get_json(modelsDir + modelName, function(loadedModel){

        sceneObjects = loadedModel.meshes.length ;

        console.log("Found " + sceneObjects + " objects...");

        // Preparing to store objects' world matrix & the lights & material properties per object.
        for (let i = 0; i < sceneObjects; i++) {
            objectWorldMatrix[i] = new utils.identityMatrix();
            worldViewProjectionMatrix[i] =  new utils.identityMatrix();
            diffuseColor[i] = [1.0, 1.0, 1.0, 1.0];
            specularColor[i] = [1.0, 1.0, 1.0, 1.0];
            lightDirectionTransformed[i] = new Array(3);
            lightPositionTransformed[i]	= new Array(4);
        }

        for (let i = 0; i < sceneObjects ; i++) {

            // Creating the vertex data.
            console.log("Object[" + i + "]:");
            console.log("MeshName: " + loadedModel.rootnode.children[i].name);
            console.log("Vertices: " + loadedModel.meshes[i].vertices.length);
            console.log("Normals: " + loadedModel.meshes[i].normals.length);
            if (loadedModel.meshes[i].texturecoords){
                console.log("UVss: " + loadedModel.meshes[i].texturecoords[0].length);
            } else {
                console.log("No UVs for this mesh!" );
            }

            var meshMatIndex = loadedModel.meshes[i].materialindex;

            var UVFileNamePropertyIndex = -1;
            var diffuseColorPropertyIndex = -1;
            var specularColorPropertyIndex = -1;
            for (n = 0; n < loadedModel.materials[meshMatIndex].properties.length; n++){
                if(loadedModel.materials[meshMatIndex].properties[n].key === "$tex.file") UVFileNamePropertyIndex = n;
                if(loadedModel.materials[meshMatIndex].properties[n].key === "$clr.diffuse") diffuseColorPropertyIndex = n;
                if(loadedModel.materials[meshMatIndex].properties[n].key === "$clr.specular") specularColorPropertyIndex = n;
            }

            // Getting vertices and normals.
            var objVertex = [];
            for (let n = 0; n < loadedModel.meshes[i].vertices.length/3; n++){
                objVertex.push(loadedModel.meshes[i].vertices[n*3],
                    loadedModel.meshes[i].vertices[n*3+1],
                    loadedModel.meshes[i].vertices[n*3+2]);
                objVertex.push(loadedModel.meshes[i].normals[n*3],
                    loadedModel.meshes[i].normals[n*3+1],
                    loadedModel.meshes[i].normals[n*3+2]);
                if(UVFileNamePropertyIndex >= 0){
                    objVertex.push( loadedModel.meshes[i].texturecoords[0][n*2],
                        loadedModel.meshes[i].texturecoords[0][n*2+1]);

                } else {
                    objVertex.push(0.0, 0.0);
                }
            }

            facesNumber[i] = loadedModel.meshes[i].faces.length;
            console.log("Face Number: " + facesNumber[i]);

            if(UVFileNamePropertyIndex >= 0){

                nTexture[i]=true;

                console.log(loadedModel.materials[meshMatIndex].properties[UVFileNamePropertyIndex].value);
                var imageName = loadedModel.materials[meshMatIndex].properties[UVFileNamePropertyIndex].value;

                var getTexture = function(image_URL){

                    var image=new Image();
                    image.webglTexture=false;

                    image.onload=function() {

                        var texture=gl.createTexture();

                        gl.bindTexture(gl.TEXTURE_2D, texture);

                        console.log("Image w=" + image.width + " Image h=" + image.height);

                        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        gl.generateMipmap(gl.TEXTURE_2D);

                        gl.bindTexture(gl.TEXTURE_2D, null);
                        image.webglTexture=texture;
                    };

                    image.src=image_URL;

                    return image;
                };

                diffuseTextureObj[i] = getTexture(modelsDir + imageName);

                console.log("TXT filename: " +diffuseTextureObj[i]);
                console.log("TXT src: " +diffuseTextureObj[i].src);
                console.log("TXT loaded?: " +diffuseTextureObj[i].webglTexture);

            } else {
                nTexture[i] = false;
            }

            // Mesh color.
            diffuseColor[i] = loadedModel.materials[meshMatIndex].properties[diffuseColorPropertyIndex].value; 		// Diffuse value
            diffuseColor[i].push(1.0);																				// Alpha value added
            specularColor[i] = loadedModel.materials[meshMatIndex].properties[specularColorPropertyIndex].value;	// Specular color
            console.log("Specular: "+ specularColor[i]);

            // Vertices, normals and UV set 1.
            vertexBufferObjectId[i] = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObjectId[i]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(objVertex), gl.STATIC_DRAW);

            // Creating index buffer. Faces in the model state the correct order of vertices in order to
            // respect the back face culling.
            facesData = [];
            for (let n = 0; n < loadedModel.meshes[i].faces.length; n++){

                facesData.push( loadedModel.meshes[i].faces[n][0],
                    loadedModel.meshes[i].faces[n][1],
                    loadedModel.meshes[i].faces[n][2]
                );
            }

            indexBufferObjectId[i]=gl.createBuffer ();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObjectId[i]);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(facesData),gl.STATIC_DRAW);

            // Creating the objects' world matrix
            objectWorldMatrix[i] = loadedModel.rootnode.children[i].transformation;
        }
    });
}

/**
 * This function enables the interaction with the player. He can use W, A, S, D key to move and use the mouse to
 * rotate the camera. Moreover, he can press Q in front of a lever to activate a lever, thus opening the respective
 * door.
 * All the different situations regarding the relative position and rotation of the camera with respect to player
 * movement are handled here.
 */
function initInteraction(){

    canvas.requestPointerLock = canvas.requestPointerLock ||
        canvas.mozRequestPointerLock;

    document.exitPointerLock = document.exitPointerLock ||
        document.mozExitPointerLock;

    canvas.onclick = function() {
        canvas.requestPointerLock();
    };

    let keyFunction = function(e) {
        let mapStartingPointX = 6;
        let mapStartingPointZ = 9;

        // Condition regarding the position in front of or behind an open door.
        let doorIsOpen = ((((cx === 3 || cx === 5) && cz === 3) && door1Open === true) ||
                             ((cx === 9 && (cz === 2 || cz === 4)) && door3Open === true) ||
                             ((cx === 4 && (cz === -3 || cz === -1)) && door5Open === true));

        if (e.keyCode === 38) {	// Arrow up
            cy += delta;
        }

        //to get the actual position
        if (e.keyCode === 40) {	// Arrow down
            cy -=delta;

            console.log(" actual position:(cx:"+(cx) + "/" + "cy: "+ cy + "/" +"cz: "+ (cz) + ") - "+ elevation + "." + angle);
            console.log(" map position:(cx:"+(cx+6) + "/" + "cy: "+ cy + "/" +"cz: "+ (cz+9) + ") - "+ elevation + "." + angle);
            console.log(" camera angle: " + angle);
        }

        if (e.keyCode === 87) {	// W

            if(angle > -45.0 && angle <= 45.0) {                                // Looking forward, going forward.
                // The conditions are about the absence (0) of a wall or of a open (2) door (from both sides).
                if ((dungeonMap[cz + mapStartingPointZ - delta][cx + mapStartingPointX] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ - delta][cx + mapStartingPointX] === 2)) {

                    cz -= delta;
                }
            }
            else if(angle > 45.0 && angle <= 135.0) {                           // Looking left, going left.
                if ((dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX - delta] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX - delta] === 2)) {

                    cx -= delta;
                }
            }
            else if((angle > 135.0 && angle <= 180.0) || (angle > -180.0 && angle <= -135.0)) {                 // Looking backward, going backward.
                if ((dungeonMap[cz + mapStartingPointZ + delta][cx + mapStartingPointX] !== 1) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ + delta][cx + mapStartingPointX] === 2)) {

                    cz += delta;
                }
            }
            else if(angle > -135.0 && angle <= -45.0) {                         // Looking right, going right.
                if ((dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX + delta] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX + delta] === 2)) {

                    cx += delta;
                }
            }
        }

        if (e.keyCode === 65) {	// A
            if(angle > -45.0 && angle <= 45.0) {                                // Looking forward, going left.
                // The conditions are about the absence (0) of a wall or of a open (2) door (from both sides).
                if ((dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX - delta] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX - delta] === 2)) {

                    cx -= delta;
                }
            }
            else if(angle > 45.0 && angle <= 135.0) {                           // Looking left, going backward.
                if ((dungeonMap[cz + mapStartingPointZ + delta][cx + mapStartingPointX] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ + delta][cx + mapStartingPointX] === 2)) {

                    cz += delta;
                }
            }
            else if((angle > 135.0 && angle <= 180.0) || (angle > -180.0 && angle <= -135.0)) {                 // Looking backward, going right.
                if ((dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX + delta] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX + delta] === 2)) {

                    cx += delta;
                }
            }
            else if(angle > -135.0 && angle <= -45.0) {                         // Looking right, going forward.
                if ((dungeonMap[cz + mapStartingPointZ - delta][cx + mapStartingPointX] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ - delta][cx + mapStartingPointX] === 2)) {

                    cz -= delta;
                }
            }
        }

        if (e.keyCode === 83) {	// S

            if(angle > -45.0 && angle <= 45.0) {                                // Looking forward, going backward.
                // The conditions are about the absence (0) of a wall or of a open (2) door (from both sides).
                if ((dungeonMap[cz + mapStartingPointZ + delta][cx + mapStartingPointX] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ + delta][cx + mapStartingPointX] === 2)) {

                    cz += delta;
                }
            }
            else if(angle > 45.0 && angle <= 135.0) {                           // Looking left, going right.
                if ((dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX + delta] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX + delta] === 2)) {

                    cx += delta;
                }
            }
            else if((angle > 135.0 && angle <= 180.0) || (angle > -180.0 && angle <= -135.0)) {                 // Looking backward, going forward.
                if ((dungeonMap[cz + mapStartingPointZ - delta][cx + mapStartingPointX] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ - delta][cx + mapStartingPointX] === 2)) {

                    cz -= delta;
                }
            }
            else if(angle > -135.0 && angle <= -45.0) {                         // Looking right, going left.
                if ((dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX - delta] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX - delta] === 2)) {

                    cx -= delta;
                }
            }

        }

        if (e.keyCode === 68) {	// D

            if(angle > -45.0 && angle <= 45.0) {                                // Looking forward, going right.
                // The conditions are about the absence (0) of a wall or of a open (2) door (from both sides).
                if ((dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX + delta] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX + delta] === 2)) {

                    cx += delta;
                }
            }
            else if(angle > 45.0 && angle <= 135.0) {                           // Looking left, going forward.
                if ((dungeonMap[cz + mapStartingPointZ - delta][cx + mapStartingPointX] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ - delta][cx + mapStartingPointX] === 2)) {

                    cz -= delta;
                }
            }
            else if((angle > 135.0 && angle <= 180.0) || (angle > -180.0 && angle <= -135.0)) {                 // Looking backward, going left.
                if ((dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX - delta] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ][cx + mapStartingPointX - delta] === 2)) {

                    cx -= delta;
                }
            }
            else if(angle > -135.0 && angle <= -45.0) {                         // Looking right, going backward.
                if ((dungeonMap[cz + mapStartingPointZ + delta][cx + mapStartingPointX] === 0) ||
                    (doorIsOpen && dungeonMap[cz + mapStartingPointZ + delta][cx + mapStartingPointX] === 2)) {

                    cz += delta;
                }
            }
        }

        if (e.keyCode === 81 ) {  // Q
            // The angles represent the angle the camera should have to look at the lever.
            if(lever5PositionReached === true && door5Open === false && angle > -60 && angle < 0) {
                door5Open = true;
            }
            else if(lever3PositionReached === true && door3Open === false && angle > -60 && angle < 0) {
                door3Open = true;
            }
            else if(lever1PositionReached === true && door1Open === false && angle > -150 && angle < -90) {
                door1Open = true;
            }
        }
    };

    /**
     * This function checks the pointLockElement property to see if it is in our canvas.
     * If so, it attaches an event listener to handle the mouse movements with the updatePosition() function.
     * If not, it removes the event listener again.
     */
    function lockChangeAlert() {
        if (document.pointerLockElement === canvas ||
            document.mozPointerLockElement === canvas) {
            console.log('The pointer lock status is now locked');
            document.addEventListener("mousemove", updatePosition, false);
        } else {
            console.log('The pointer lock status is now unlocked');
            document.removeEventListener("mousemove", updatePosition, false);
        }
    }

    /**
     * This functions updates the angle and the elevation of the camera with respect to the movement of the mouse.
     * @param e Event representing the movement of the mouse.
     */
    function updatePosition(e) {
        let angleTemp = angle - e.movementX * mouseSensitivity;
        (angleTemp <= -360.0 || angleTemp >= 360.0) ? angleTemp = 0.0 : angleTemp; // Reset the angle if it goes beyond its limits.
        let elevationTemp = elevation - e.movementY * mouseSensitivity;

        // Angle goes from 0 to 180 counter-clockwise and from 0 to -180 clockwise.
        if(angleTemp > 180) {
            angle = angleTemp - 360.0;
        }
        else if(angleTemp <= -180) {
            angle = angleTemp + 360.0;
        }
        else {
            angle = angleTemp;
        }

        // Vertical movement is limited.
        if(elevationTemp >= 90) {
            elevation = 90;
        }
        else if(elevationTemp <= -90) {
            elevation = -90;
        }
        else {
            elevation = elevationTemp;
        }
    }

    window.addEventListener("keyup", keyFunction, false);

    //activate to have resize

    // Pointer lock event listener.
    // Hook pointer lock state change events for different browsers
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
}

var lightNameChanged = false;
/**
 * This function computes matrices used elsewhere in the code. These matrices include the view matrix,
 * the transformed light position and direction for each object (done once here since Camera Space coordinates
 * are used), world-view matrix and projection matrix for each object, to be sent to the Vertex Shader
 * for further computation.
 */
function computeMatrices() {

    // Computation of the view matrix, done once for the whole scene.
    viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

    if(moveLight === 1) {
        lightPosition = [cx, cy, cz, 1];
        let tempAlpha = utils.degToRad(angle + 90.0);  // The adjustment is due to the fact that the camera points
                                                             // towards the negative z-axis.
        let tempBeta = utils.degToRad(elevation);

        lightDirection = [Math.cos(-tempAlpha) * Math.cos(-tempBeta),
            Math.sin(tempBeta),
            Math.cos(-tempBeta) * Math.sin(-tempAlpha)
        ];

        // Change the names of the lights on the HTML file.
        if(!lightNameChanged) {
            document.getElementById("direct").innerHTML = " God's Blessing";
            document.getElementById("point").innerHTML = " Lantern";
            document.getElementById("pointDecay").innerHTML = " Adjustable Lantern";
            document.getElementById("spot").innerHTML = " Flashlight";

            lightNameChanged = true;
        }

    }

    // Computation of light position for the whole scene, done once in the CPU.
    lightPositionTransformed = utils.multiplyMatrixVector(viewMatrix, lightPosition);

    // Computation of light direction for the whole the scene, done once in the CPU.
    lightDirectionTransformed = utils.multiplyMatrix3Vector3(utils.sub3x3from4x4(viewMatrix), lightDirection);

    for(let i = 0; i < sceneObjects; i++) {
        // Computation of world-view, projection and normal matrices for each object of the scene.
        worldViewMatrix[i] = utils.multiplyMatrices(viewMatrix, objectWorldMatrix[i]);
        worldViewProjectionMatrix[i] = utils.multiplyMatrices(perspectiveMatrix, worldViewMatrix[i]);
        normalsTransformMatrix[i] = utils.invertMatrix(utils.transposeMatrix(worldViewMatrix[i]));
    }
}

/**
 * Function used to reset the lights after passing from moveLights === 1 to moveLights === 0.
 */
function resetLights() {
    lightDirection = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
        Math.sin(dirLightBeta),
        Math.cos(dirLightBeta) * Math.sin(dirLightAlpha),
    ];
    lightPosition = [0.0, 10.0, 0.0, 1.0];

    document.getElementById("direct").innerHTML = " Directional";
    document.getElementById("point").innerHTML = " Point";
    document.getElementById("pointDecay").innerHTML = " Point w. Decay";
    document.getElementById("spot").innerHTML = " Spot";

    lightNameChanged = false;
}

function doResize() {
    // set canvas dimensions
    var canvas = document.getElementById("my-canvas");



    if((window.innerWidth > 40) && (window.innerHeight > 240)) {




        canvas.width  = window.innerWidth-16;

        canvas.height = window.innerHeight-200;
        var w=canvas.clientWidth;
        var h=canvas.clientHeight;

        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.viewport(0.0, 0.0, w, h);

        aspectRatio = w/h;
    }


}

/**
 * Function used to animate a door; it is an implementation of Bezier interpolation.
 * @param accumulatedTime Value representing the incrementing time during the animation.
 * @param previousYDoor Value of the previous translation performed along the y axis on the door during the animation.
 * @param doorIndex Index of the door inside the matrix containing the world matrices of all the objects in the scene.
 * @return The updated value of previousYDoor relative to the door which is opening.
 */
function animateDoor(accumulatedTime, previousYDoor, doorIndex) {
    let alpha = accumulatedTime;

    let uma = 1 - alpha;
    if (alpha >= 0 && alpha <= 1) {
        let c0 = uma * uma * uma;
        let c1 = 3 * uma * uma * alpha;
        let c2 = 3 * uma * alpha * alpha;
        let c3 = alpha * alpha * alpha;
        let doorTranslationControlPoints = [0, -0.33, -0.66, -1.0];
        //translation matrix
        let MT = utils.MakeTranslateMatrix(0,(doorTranslationControlPoints[0] * c0 +
                                                        doorTranslationControlPoints[1] * c1 +
                                                        doorTranslationControlPoints[2] * c2 +
                                                        doorTranslationControlPoints[3] * c3) - previousYDoor, 0);
        previousYDoor = doorTranslationControlPoints[0] * c0 +
                         doorTranslationControlPoints[1] * c1 +
                         doorTranslationControlPoints[2] * c2 +
                         doorTranslationControlPoints[3] * c3;
        objectWorldMatrix[doorIndex] = utils.multiplyMatrices(MT, objectWorldMatrix[doorIndex]);
    }

    return previousYDoor;
}

/**
 * This function is used to turn a lever down.
 * @param leverToCheckIsDown Boolean that states if the specified lever has been activated or not.
 * @param leverIndex Index of the lever inside the matrix containing the world matrices of all the objects in the scene.
 * @return The updated value of the boolean passed in input, relative to the lever which is being activated.
 */
function turnDownLever(leverToCheckIsDown, leverIndex) {
    if(!leverToCheckIsDown) {
        leverToCheckIsDown = true;
        let planarMirrorMatrix = utils.multiplyMatrices(utils.MakeTranslateMatrix(0.0, 0.5, 0.0),
                utils.multiplyMatrices(utils.MakeScaleNuMatrix(1.0, -1.0, 1.0),
                utils.MakeTranslateMatrix(0.0, -0.5, 0.0)));
        objectWorldMatrix[leverIndex] = utils.multiplyMatrices(planarMirrorMatrix, objectWorldMatrix[leverIndex]);
    }

    return leverToCheckIsDown;
}

/**
 * Function that performs the rendering cycle.
 * It uses the handles acquired previously to store different values on shaders' uniforms and attributes (using an
 * ARRAY_BUFFER to store vertices (x, y, z, nx, ny, nz, u, v) and an ELEMENT_ARRAY_BUFFER to store indices (indexed
 * triangle list technique is used).
 * The activation of levers and doors is also checked here.
 */
function drawScene() {
//canvas.onresize = doResize();
    computeMatrices();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Load the desired shader program: 0 -> Gouraud shading, 1 -> Phong shading.
    gl.useProgram(shaderProgram[currentShader]);

    for (let i = 0; i < sceneObjects; i++) {

        /***** UNIFORMS *****/
        gl.uniformMatrix4fv(matrixWVHandle[currentShader], gl.FALSE,
            utils.transposeMatrix(worldViewMatrix[i]));								// VS Gouraud, VS Phong.
        gl.uniformMatrix4fv(matrixWVPHandle[currentShader], gl.FALSE,
            utils.transposeMatrix(worldViewProjectionMatrix[i]));					// VS Gouraud, VS Phong.
        gl.uniformMatrix4fv(normalMatrixPositionHandle[currentShader], gl.FALSE,
            utils.transposeMatrix(normalsTransformMatrix[i]));						// VS Gouraud, VS Phong.

        // Light vectors and other attributes.
        gl.uniform3fv(lightDirectionHandle[currentShader], lightDirectionTransformed);
        gl.uniform4fv(lightPositionHandle[currentShader], lightPositionTransformed);
        gl.uniform4fv(lightColorHandle[currentShader], lightColor);

        gl.uniform1i(lightTypeHandle[currentShader], currentLightType);				// VS Gouraud, FS Phong.
        gl.uniform1f(lightDecayFactorHandle[currentShader], lightDecayFactor);
        gl.uniform1i(moveLightHandle[currentShader], moveLight);

        // Ambient light.
        gl.uniform4f(ambientLightColorHandle[currentShader], ambientLightColor[0],			// VS Gouraud, FS Phong.
            ambientLightColor[1],
            ambientLightColor[2],
            ambientLightColor[3]);

        gl.uniform1f(ambientLightInfluenceHandle[currentShader], ambientLightInfluence);	// VS Gouraud, FS Phong.

        // Textures (FS Gouraud, FS Phong).
        gl.uniform1i(textureFileHandle[currentShader], 0);		// Texture channel 0 used for diff txt.
        if (nTexture[i] == true && diffuseTextureObj[i].webglTexture) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, diffuseTextureObj[i].webglTexture);
        }
        gl.uniform1f(textureInfluenceHandle[currentShader], textureInfluence);

        // Diffuse color, specular color and specular "adjustment" exponent.
        gl.uniform4f(materialDiffColorHandle[currentShader], diffuseColor[i][0],
            diffuseColor[i][1],
            diffuseColor[i][2],
            diffuseColor[i][3]);			// FS Gouraud, FS Phong.
        gl.uniform4f(materialSpecColorHandle[currentShader], specularColor[i][0],
            specularColor[i][1],
            specularColor[i][2],
            specularColor[i][3]);		// VS Gouraud, FS Phong.
        gl.uniform1f(materialSpecPowerHandle[currentShader], objectSpecularPower);		// VS Gouraud, FS Phong.

        /***** INPUT ATTRIBUTES *****/
        // This buffer now contains all the information needed about the vertices for each object.
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObjectId[i]);

        // The stride is 4bytes (float dimension = 32 bit) * 8 (total size of the array buffer = 3+3+2).
        // The various offsets state the beginning of each different attribute of the array buffer (position, normal, UV).
        gl.enableVertexAttribArray(vertexPositionHandle[currentShader]);
        gl.vertexAttribPointer(vertexPositionHandle[currentShader], 3, gl.FLOAT, gl.FALSE, 4 * 8, 0);

        gl.enableVertexAttribArray(vertexNormalHandle[currentShader]);
        gl.vertexAttribPointer(vertexNormalHandle[currentShader], 3, gl.FLOAT, gl.FALSE, 4 * 8, 4 * 3);

        gl.enableVertexAttribArray(vertexUVHandle[currentShader]);
        gl.vertexAttribPointer(vertexUVHandle[currentShader], 2, gl.FLOAT, gl.FALSE, 4 * 8, 4 * 6);

        // Using element because it is an array of indices.
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObjectId[i]);
        gl.drawElements(gl.TRIANGLES, facesNumber[i] * 3, gl.UNSIGNED_SHORT, 0);

        // Activate door 5.
        if (door5Open === true) {
            let currentTime = (new Date).getTime();                 // milliseconds.
            let deltaT;
            if (lastUpdateTime1) {
                deltaT = (currentTime - lastUpdateTime1) / 1000.0;   // seconds.
            } else {
                deltaT = 0.02;
            }
            lastUpdateTime1 = currentTime;
            accumulator1 += deltaT;
            previousYDoor5 = animateDoor(accumulator1, previousYDoor5, 4);
            lever5Down = turnDownLever(lever5Down, 3);
        }

        // Activate door 3.
        if (door3Open === true) {
            let currentTime2 = (new Date).getTime();
            let deltaT2;
            if (lastUpdateTime2) {
                deltaT2 = (currentTime2 - lastUpdateTime2) / 1000.0;
            } else {
                deltaT2 = 0.02;
            }
            lastUpdateTime2 = currentTime2;
            accumulator2 += deltaT2;
            previousYDoor3 = animateDoor(accumulator2, previousYDoor3, 5);
            lever3Down = turnDownLever(lever3Down, 2);
        }

        // Activate door 1.
        if (door1Open === true) {
            let currentTime3 = (new Date).getTime();
            let deltaT3;
            if (lastUpdateTime3) {
                deltaT3 = (currentTime3 - lastUpdateTime3) / 1000.0;
            } else {
                deltaT3 = 0.02;
            }
            lastUpdateTime3 = currentTime3;
            accumulator3 += deltaT3;
            previousYDoor1 = animateDoor(accumulator3, previousYDoor1, 6);
            lever1Down = turnDownLever(lever1Down, 1);
        }

        // Setting of booleans that state whether the player is in the right position on the map to activate a lever.
        if (cx === 3 && cz === -1) {
            lever5PositionReached = true;
        }
        if (cx === 8 && cz === 4) {
            lever3PositionReached = true;
        }
        if (cx === 2 && cz === 2) {
            lever1PositionReached = true;
        }

        // If the end of the dungeon is reached, show the ending screen.
        if (cx === 8 && cz === 8) {
            document.getElementById("my-canvas").hidden = true;
            document.getElementById("my-canvas2").hidden = false;

            const canvas2 = document.getElementById("my-canvas2");
            const ctx = canvas2.getContext("2d");
            ctx.font = "70px JAF Herb";
            ctx.fillStyle = "rgb(255, 255, 255)";
            ctx.fillText("Congratulations, you escaped from the Dungeon!", 30, 360);
            ctx.fillText("Press the Space Bar to restart.", 290, 440);

            let keyFunction = function(e) {
                if(e.keyCode === 32) {      // Space bar.
                    location.reload();
                }
            };

            window.addEventListener("keyup", keyFunction, false);
        }

        gl.disableVertexAttribArray(vertexPositionHandle[currentShader]);
        gl.disableVertexAttribArray(vertexNormalHandle[currentShader]);
    }

    window.requestAnimationFrame(drawScene);
}



