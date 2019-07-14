var canvas, checkbox;
var gl = null;

// Two handles, one for each shaders' couple. 0 = goureaud; 1 = phong.
var	shaderProgram = new Array(2);

// Directory location of shaders and models.
var shaderDir = "http://127.0.0.1:8887/shaders/";
var modelsDir = "http://127.0.0.1:8887/models/";

var perspectiveMatrix,
    viewMatrix;
var currentTime = (new Date).getTime();
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
//var eyePositionHandle = new Array(2);
var materialSpecColorHandle = new Array(2);
var materialSpecPowerHandle  = new Array(2);			// It's the handle for the exponent used to tune the specular reflection.
var objectSpecularPower = 20.0;									// Actual exponent used.

// Parameters for light definition (directional light).
var dirLightAlpha = -utils.degToRad(60);
var dirLightBeta  = -utils.degToRad(120);

// Computation of direct light direction vector.
var lightDirection = [Math.cos(dirLightAlpha) * Math.cos(dirLightBeta),
    Math.sin(dirLightAlpha),
    Math.cos(dirLightAlpha) * Math.sin(dirLightBeta),
];
var lightPosition = [0.0, 0.5, 0.0, 1.0];
var lightColor = new Float32Array([1.0, 1.0, 1.0, 1.0]);	// White light.
var moveLight = 0;                                                      //0 : move the camera - 1 : Move the lights

// Transformed light direction and position for the scene. We need a matrix for each object.
var lightDirectionTransformed = [];
var lightPositionTransformed = [];

var currentLightType = 1;         		// 1 -> Direct, 2 -> Point, 3 -> Point with decay, 4 -> Spot.

var sceneObjects; // Total number of objects in the scene.

// The following arrays have sceneObjects as dimension.	
var vertexBufferObjectId = [];					// Matrix containing vertices of all the objects in the scene.
var indexBufferObjectId = [];					// Matrix containing indices used to display the objects in the scene.
var objectWorldMatrix = [];					// Matrix containing the transform of each object.
var worldViewMatrix = [];						// Matrix containing the product of the world matrix with the view matrix.
var worldViewProjectionMatrix = [];						// Matrix containing the product of the world-view matrix with the perspective matrix.
var normalsTransformMatrix = [];				// Matrix containing the transform of the normals for each object (inverse-transpose of world-view matrix).
var facesNumber		= [];						// Used to establish the right order of indices to respect back face culling.
var diffuseColor 	= [];						// Diffuse material colors of objects.
var specularColor   = [];						// Specular material colors of the objects.
var diffuseTextureObj = [];					// Texture material.
var nTexture 		= [];						// Number of textures per object.

// Parameters for Camera: look-in camera.
var cx = 0;
var cy = 0.5;
var cz = 0;
var elevation = 0;
var angle = 0;

//delta for movement
var delta = 1;
//parameters for time
var lastUpdateTime;
g_time=0;
// Eye parameters: we need one eye vector for each object in the scene.
//var observerPositionObj = [];

var currentShader = 0;                			// Defines the current shader in use (0 -> Gouraud, 1 -> Phong).
var textureInfluence = 0.0;						// Slider value for texture influence.
var ambientLightInfluence = 0.0;				// Slider value for light influence.
var ambientLightColor = [1.0, 1.0, 1.0, 1.0];	// Starting light color is white.

var dungeonMap = [];				// Matrix containing the map that states where the can or cannot go.

//boolean to activate door 5
var door5Open=false;

function main(){

    canvas=document.getElementById("my-canvas");
    checkbox = document.getElementById("chbx");


    try{
        gl = canvas.getContext("webgl2", {alpha: false});
    }catch(e){
        console.log(e);
    }
    if(gl){

        //Setting the size for the canvas equal to half the browser window
        //and other useful parameters
        var w=canvas.clientWidth;
        var h=canvas.clientHeight;
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.viewport(0.0, 0.0, w, h);
        gl.enable(gl.DEPTH_TEST);



        // Computation of the perspective matrix, done only once.
        perspectiveMatrix = utils.MakePerspective(90, w/h, 0.1, 100.0);

        // Loads the map containing the "cells" the player can or cannot go.
        loadMap("Mapasterix.json");

        // Opens the json file containing the 3D model to load,
        // parses it to retrieve objects' data
        // and creates the VBO and IBO from them.
        // The vertex format is (x,y,z,nx,ny,nz,u,v).
        loadModel("Dungeon.diff2.json");

        //Load shaders' code
        //compile them
        //retrieve the handles
        loadShaders();
        //loadMap("Mapasterix.json");
        //Setting up the interaction using keys
        initInteraction();


        //Rendering cycle
        drawScene();

    }else{
        alert( "Error: Your browser does not appear to support WebGL.");
    }

}

/**
 * Called when the slider for texture influence is changed.
 * @param val coefficient to multiply to the color given by the texture.
 */
function updateTextureInfluence(val){
    textureInfluence = val;
}

/**
 *
 * @param val
 */
function updateLightType(val){
    currentLightType = parseInt(val);
}

/**
 *
 */
function updateLightMovement(){
    if (checkbox.checked == true) {
        moveLight = 1;
    } else {
        moveLight = 0;
    }
}

/**
 *
 * @param val
 */
function updateShader(val){
    currentShader = parseInt(val);
}

/**
 *
 * @param val
 */
function updateAmbientLightInfluence(val){
    ambientLightInfluence = val;
}

/**
 *
 * @param val
 */
function updateAmbientLightColor(val){

    val = val.replace('#','');
    ambientLightColor[0] = parseInt(val.substring(0,2), 16) / 255;
    ambientLightColor[1] = parseInt(val.substring(2,4), 16) / 255;
    ambientLightColor[2] = parseInt(val.substring(4,6), 16) / 255;
    ambientLightColor[3] = 1.0;
}

/**
 *
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
        ambientLightColorHandle[i]= gl.getUniformLocation(shaderProgram[i], 'ambientLightColor');

        //eyePositionHandle[i] = gl.getUniformLocation(shaderProgram[i], 'eyePosition');

        lightDirectionHandle[i] = gl.getUniformLocation(shaderProgram[i], 'lightDirection');
        lightPositionHandle[i] = gl.getUniformLocation(shaderProgram[i], 'lightPosition');
        lightColorHandle[i] = gl.getUniformLocation(shaderProgram[i], 'lightColor');
        lightTypeHandle[i]= gl.getUniformLocation(shaderProgram[i],'lightType');
    }
}

/**
 * Loads the map containing the "cells" where the player can go (corridors, 0) or cannot go (walls and other space, 1).
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
 *
 * @param modelName
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
            //observerPositionObj[i] = new Array(3);
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

            //s=0;

            if(UVFileNamePropertyIndex >= 0){

                nTexture[i]=true;

                console.log(loadedModel.materials[meshMatIndex].properties[UVFileNamePropertyIndex].value);
                var imageName = loadedModel.materials[meshMatIndex].properties[UVFileNamePropertyIndex].value;


                var getTexture = function(image_URL){

                    var image=new Image();
                    image.webglTexture=false;

                    image.onload=function(e) {

                        var texture=gl.createTexture();

                        gl.bindTexture(gl.TEXTURE_2D, texture);

                        console.log("Image w=" + image.width + " Image h=" + image.height);

                        /*if (!utils.isPowerOfTwo(image.width) || !utils.isPowerOfTwo(image.height)) {
                            console.log("Image " + image.src + " is not power of 2!");
                            // Scale up the texture to the next highest power of two dimensions.
                            var can = document.createElement("canvas");
                            can.width = utils.nextHighestPowerOfTwo(image.width);
                            can.height = utils.nextHighestPowerOfTwo(image.height);
                            var ctx = can.getContext("2d");
                            ctx.drawImage(image, 0, 0, image.width, image.height);
                            image = can;
                        }*/
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
 * //todo fix this
 */
function initInteraction(){

    canvas.requestPointerLock = canvas.requestPointerLock ||
        canvas.mozRequestPointerLock;

    document.exitPointerLock = document.exitPointerLock ||
        document.mozExitPointerLock;

    canvas.onclick = function() {
        canvas.requestPointerLock();
    };

    var keyFunction =function(e) {

        if (e.keyCode == 37) {	// Left arrow
            //if(moveLight == 0)

            if (dungeonMap[cz+9-delta][cx+6]!="1"){
                cz-=delta;

            }

            //else lightPosition[0] -=delta;
        }
        if (e.keyCode == 39) {	// Right arrow

            if (dungeonMap[cz+9+delta][cx+6]!="1"){
                cz+=delta;
            }
        }

        //else lightPosition[0] +=delta;

        if (e.keyCode == 38) {	// Up arrow
            //if(moveLight == 0)//

            if (dungeonMap[9+cz][cx+6+delta]!="1"){
                cx+=delta;
            }

            //else lightPosition[2] +=delta;
        }
        if (e.keyCode == 40) {	// Down arrow
            //if(moveLight == 0)
            if (dungeonMap[9+cz][cx+6-delta]!="1"){
                cx-=delta;
            }
            //else lightPosition[2] +=delta;
        }

        //to activate animation on door 5
        if (e.keyCode == 107) {	// Add
            //	if(moveLight == 0)  cx+=delta;

            //	else lightPosition[1] +=delta;

            door5Open=true;
        }

        //to get the actual position
        if (e.keyCode == 109) {	// Subtract

            console.log(" actual position:(cx:"+(cx+6) + "/" + "cy: "+ cy + "/" +"cz: "+ (cz+9) + ") - "+ elevation + "." + angle);
        }

        if (e.keyCode == 65) {	// a
            //cy += delta;
            if (dungeonMap[cz+9-delta][cx+6]!="1"){
                cz-=delta;

            }
        }
        if (e.keyCode == 68) {	// d
            //if(moveLight == 0)angle+=delta * 1.0;
            //else{
            //	lightDirection[0] += 0.1 * Math.cos(utils.degToRad(angle));
            //	lightDirection[2] += 0.1 * Math.sin(utils.degToRad(angle));
            if (dungeonMap[cz+9+delta][cx+6]!="1"){
                cz+=delta;
            }
        }
        if (e.keyCode === 87) {	// w
            //if(moveLight == 0)elevation+=delta * 10.0;
            //else{
            //	lightDirection[0] += 0.1 * Math.sin(utils.degToRad(angle));

            //	lightDirection[2] -= 0.1 * Math.cos(utils.degToRad(angle));
            if(angle > -45.0 && angle <= 45.0) {                       // Looking forward.
                if (dungeonMap[9 + cz + delta][cx + 6] != "1") {
                    cz += delta;
                }
            }
            else if(angle > 45.0 && angle <= 135.0) {                   // Looking left.

            }
            else if(angle > 135.0 && angle <= -135.0) {                 // Looking backward.

            }
            else if(angle > -135.0 && angle <= -45.0) {                 // Looking right.

            }
        }

        if (e.keyCode == 83) {	// s
            //if(moveLight == 0)elevation-=delta*10.0;
            //else{
            //	lightDirection[0] -= 0.1 * Math.sin(utils.degToRad(angle));
            //	lightDirection[2] += 0.1 * Math.cos(utils.degToRad(angle));
            if (dungeonMap[9+cz][cx+6-delta]!="1"){
                cx-=delta;
            }
            //else lightPosition[2] +=delta;
        }
    };

    /*var mouseState = false;
    var lastMouseX = -100, lastMouseY = -100;
    function doMouseDown(event) {
        lastMouseX = event.pageX;
        lastMouseY = event.pageY;
        mouseState = true;
    }
    function doMouseUp(event) {
        lastMouseX = 100;
        lastMouseY = 100;
        mouseState = false;
    }
    function doMouseMove(event) {
        if(mouseState) {
            var dx = event.pageX - lastMouseX;

            var dy = lastMouseY - event.pageY;
            lastMouseX = event.pageX;
            lastMouseY = event.pageY;

            if((dx != 0) || (dy != 0)) {
                angle = angle + 0.1* dx;
                //limit angles

                console.log(angle);
                elevation = elevation + 0.1* dy;

                if (elevation>35){
                    elevation=35};

                }
            if (elevation<-35){
                elevation=-35}


        }
    }*/

    /**
     * This function checks the pointLockElement property to see if it is our canvas.
     * If so, it attached an event listener to handle the mouse movements with the updatePosition() function.
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
        let mouseSensitivity = 0.1;
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
        else if (elevationTemp <= -90) {
            elevation = -90;
        }
        else {
            elevation = elevationTemp;
        }
        console.log("X: " + e.movementY + ", Y: " + e.movementY + " \nAngle: " + angle + ", Elevation: " + elevation);
    }


    //function clickOnLever(event){
    //console.log("cliccato");
//}

    // Mouse movement handled with pointer lock.


    //'window' is a JavaScript object (if "canvas", it will not work). todo
    window.addEventListener("keyup", keyFunction, false);
    /*canvas.addEventListener("mousedown", doMouseDown, false);
    canvas.addEventListener("mouseup", doMouseUp, false);
    canvas.addEventListener("mousemove", doMouseMove, false);*/

    //	canvas.addEventListener("click",clickOnLever,false);

    //activate to have resize
    //	window.onresize = doResize();

    // Pointer lock event listener.
    // Hook pointer lock state change events for different browsers
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('mozpointerlockchange', lockChangeAlert, false);
}

/**
 * This function computes matrices used elsewhere in the code. These matrices include the view matrix,
 * the transformed light position and direction for each object (done once here since Camera Space coordinates
 * are used), world-view matrix and projection matrix for each object, to be sent to the Vertex Shader
 * for further computation.
 */
function computeMatrices() {
    // Computation of the view matrix, done once for the whole scene.
    viewMatrix = utils.MakeView(cx, cy, cz, elevation, angle);

    // Computation of light position for the whole scene, done once in the CPU.
    lightPositionTransformed = utils.multiplyMatrixVector(viewMatrix, lightPosition);

    // Computation of light direction for the whole the scene, done once in the CPU.
    lightDirectionTransformed = utils.multiplyMatrix3Vector3(utils.sub3x3from4x4(viewMatrix), lightDirection);

    for(let i = 0; i < sceneObjects; i++){
        // Computation of world-view, projection and normal matrices for each object of the scene.
        worldViewMatrix[i] = utils.multiplyMatrices(viewMatrix, objectWorldMatrix[i]);
        worldViewProjectionMatrix[i] = utils.multiplyMatrices(perspectiveMatrix, worldViewMatrix[i]);
        normalsTransformMatrix[i] = utils.invertMatrix(utils.transposeMatrix(worldViewMatrix[i]));
    }
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
 * //todo comment
 */
//function to animate door 5; it is an implementation o Bezier interpolation
function animate(deltaT){
    alpha=deltaT/2;
    var mat=worldViewProjectionMatrix[4];

    var uma = 1-alpha;
    if (alpha>=0 && alpha<=1)
    {
        var c0 = uma*uma*uma;
        var c1 = 3*uma*uma*alpha;
        var c2 = 3*uma*alpha*alpha;
        var c3 = alpha*alpha*alpha;
        var cx=[0,0,0,0];
        var cy=[0,-0.10,-0.2,-0.3];
        var cz=[0,0,0,0];
//translation matrix
        var MT = utils.MakeTranslateMatrix(cx[0]*c0 + cx[1]*c1 + cx[2]*c2 + cx[3]*c3,
            cy[0]*c0 + cy[1]*c1 + cy[2]*c2 + cy[3]*c3,
            cz[0]*c0 + cz[1]*c1 + cz[2]*c2 + cz[3]*c3);
        worldViewProjectionMatrix[4]=utils.multiplyMatrices(worldViewProjectionMatrix[4],MT);


    }else{
        worldViewProjectionMatrix[4]=utils.multiplyMatrices(mat,utils.MakeTranslateMatrix(0,-0.28,0));
    }

}


function drawScene(){

    computeMatrices();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Load the desired shader program: 0 -> Gouraud shading, 1 -> Phong shading.
    gl.useProgram(shaderProgram[currentShader]);

    for(let i = 0; i < sceneObjects; i++){

        /***** UNIFORMS *****/
        // Transform matrices.
        //if(door5Open=false){
        //worldViewMatrix[5]=multiplyMatrices(worldViewMatrix[5],utils.MakeTranslateMatrix(0,3,0))
        //}

        gl.uniformMatrix4fv(matrixWVHandle[currentShader], gl.FALSE,
            utils.transposeMatrix(worldViewMatrix[i]));								// VS Gouraud, VS Phong.
        gl.uniformMatrix4fv(matrixWVPHandle[currentShader], gl.FALSE,
            utils.transposeMatrix(worldViewProjectionMatrix[i]));					// VS Gouraud, VS Phong.
        gl.uniformMatrix4fv(normalMatrixPositionHandle[currentShader], gl.FALSE,
            utils.transposeMatrix(normalsTransformMatrix[i]));						// VS Gouraud, VS Phong.

        // Light vectors.
        gl.uniform3fv(lightDirectionHandle[currentShader], lightDirectionTransformed);
        gl.uniform4fv(lightPositionHandle[currentShader], lightPositionTransformed);
        gl.uniform4fv(lightColorHandle[currentShader], lightColor);

        gl.uniform1i(lightTypeHandle[currentShader], currentLightType);				// VS Gouraud, FS Phong.

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


        //todo this should not be needed.
        /*gl.uniform3f(eyePositionHandle[currentShader],	observerPositionObj[i][0],
                                                            observerPositionObj[i][1],
                                                            observerPositionObj[i][2]);*/

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


//activate door 5
        if(door5Open==true){
            var currentTime = (new Date).getTime();
            var deltaT;
            if(lastUpdateTime){
                deltaT = (currentTime - lastUpdateTime) / 1000.0;
            } else {
                deltaT = 1/50;
            }
            lastUpdateTime = currentTime;
            g_time += deltaT;
            animate(g_time);
        }

        gl.disableVertexAttribArray(vertexPositionHandle[currentShader]);
        gl.disableVertexAttribArray(vertexNormalHandle[currentShader]);
    }

    window.requestAnimationFrame(drawScene);
}



