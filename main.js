// Boilerplate (template) copied from https://github.com/paulirish/webgl-boilerplate

/**
 * Provides requestAnimationFrame in a cross browser way.
 * paulirish.com/2011/requestanimationframe-for-smart-animating/
 */
window.requestAnimationFrame = window.requestAnimationFrame || ( function() {

    return  window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function(  callback, element ) {
                window.setTimeout( callback, 1000 / 60 );
            };

})();

var canvas, 
    gl, 
    buffer_pos,
    buffer_pos2,
    buffer_nor, 
    buffer_col, 
    buffer_uvw,
    buffer_idx,
    vertex_shader, fragment_shader, 
    currentProgram,
    vertex_position,
    vertex_position2,
    vertex_normal,
    vertex_color,
    vertex_uv,
    timeLocation,
    MVPLocation = [],
    MVInvLocation,
    iCount = 6,
    parameters = {  start_time  : new Date().getTime(), 
                    time        : 0, 
                    screenWidth : 0, 
                    screenHeight: 0 };

// var glM = glMatrix; // alias
var camPosition = glM.vec3.create();
glM.vec3.set(camPosition, 0.0, 0.0, -10.0);
var model = glM.mat4.create();
glM.mat4.identity(model);
var view = glM.mat4.create();
var proj = glM.mat4.create();

init();
animate();

function init() 
{
    vertex_shader = vs_color;
    fragment_shader = fs_color;

    canvas = document.querySelector( 'canvas#mainCanvas' );

    // Initialise WebGL

    try {

        gl = canvas.getContext( 'experimental-webgl' );

    } catch( error ) { }

    if ( !gl ) {

        throw "cannot create webgl context";

    }

    gl.enable(gl.DEPTH_TEST);

    // Create Vertex buffer (2 triangles)
    jasmine = populatePlant(0);

    buffer_pos = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer_pos );
    // gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ 
    //     - 1.0, - 1.0, 0.0, 
    //     1.0, - 1.0, 0.0, 
    //     - 1.0, 1.0, 0.0,
    //     1.0, - 1.0, 0.0,
    //     1.0, 1.0, 0.0,
    //     - 1.0, 1.0, 0.0 ] ), gl.STATIC_DRAW );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(jasmine.position), gl.STATIC_DRAW );

    buffer_col = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer_col );
    // gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( [ 
    //     0.937, 0.357, 0.612, 1.0,
    //     1.0, - 1.0, 0.0, 1.0,
    //     - 1.0, 1.0, 0.0, 1.0,
    //     1.0, - 1.0, 0.0, 1.0,
    //     1.0, 1.0, 0.0, 1.0,
    //     - 1.0, 1.0, 0.0, 1.0, ] ), gl.STATIC_DRAW );
    gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(jasmine.color), gl.STATIC_DRAW );

    buffer_idx = gl.createBuffer();
    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, buffer_idx );
    // gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 3, 4, 5]), gl.STATIC_DRAW );
    gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(jasmine.indices), gl.STATIC_DRAW );
    iCount = jasmine.iCount;

    // Create Program

    currentProgram = createProgram( vertex_shader, fragment_shader );

    timeLocation = gl.getUniformLocation( currentProgram, 'time' );
    MVPLocation[0] = gl.getUniformLocation( currentProgram, 'model' );
    MVPLocation[1] = gl.getUniformLocation( currentProgram, 'view' );
    MVPLocation[2] = gl.getUniformLocation( currentProgram, 'proj' );
    MVInvLocation = gl.getUniformLocation( currentProgram, 'MV_Inv' );
    // resolutionLocation = gl.getUniformLocation( currentProgram, 'resolution' );

    vertex_position = gl.getAttribLocation(currentProgram, 'position');
    vertex_position2 = gl.getAttribLocation(currentProgram, 'position_secondary');
    vertex_normal = gl.getAttribLocation(currentProgram, 'normal');
    vertex_color = gl.getAttribLocation(currentProgram, 'color');
    vertex_uv = gl.getAttribLocation(currentProgram, 'uv');
}

function createProgram( vertex, fragment ) 
{
    var program = gl.createProgram();

    var vs = createShader( vertex, gl.VERTEX_SHADER );
    var fs = createShader( '#ifdef GL_ES\nprecision highp float;\n#endif\n\n' + fragment, gl.FRAGMENT_SHADER );

    if ( vs == null || fs == null ) return null;

    gl.attachShader( program, vs );
    gl.attachShader( program, fs );

    gl.deleteShader( vs );
    gl.deleteShader( fs );

    gl.linkProgram( program );

    if ( !gl.getProgramParameter( program, gl.LINK_STATUS ) ) {

        alert( "ERROR:\n" +
        "VALIDATE_STATUS: " + gl.getProgramParameter( program, gl.VALIDATE_STATUS ) + "\n" +
        "ERROR: " + gl.getError() + "\n\n" +
        "- Vertex Shader -\n" + vertex + "\n\n" +
        "- Fragment Shader -\n" + fragment );

        return null;

    }

    return program;
}

function createShader( src, type ) 
{
    var shader = gl.createShader( type );

    gl.shaderSource( shader, src );
    gl.compileShader( shader );

    if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {

        alert( ( type == gl.VERTEX_SHADER ? "VERTEX" : "FRAGMENT" ) + " SHADER:\n" + gl.getShaderInfoLog( shader ) );
        return null;

    }

    return shader;
}

function resizeCanvas( event ) 
{
    if ( canvas.width != canvas.clientWidth ||
            canvas.height != canvas.clientHeight ) 
    {

        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        parameters.screenWidth = canvas.width;
        parameters.screenHeight = canvas.height;

        gl.viewport( 0, 0, canvas.width, canvas.height );
    }
}

function animate() 
{
    resizeCanvas();
    update();
    render();
    requestAnimationFrame( animate );
}

function update()
{
    var time = new Date().getTime() - parameters.start_time;
    var dist = 5.0;
    glM.vec3.set(camPosition, dist * Math.sin(time / 2000.0), 5.7, dist * Math.cos(time / 2000.0));
}

function render() 
{
    if ( !currentProgram ) return;

    parameters.time = new Date().getTime() - parameters.start_time;

    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    // Load program into GPU

    gl.useProgram( currentProgram );

    // Set values to program variables
    // Update camera matrix
    
    glM.mat4.identity(view);
    glM.mat4.lookAt(view, camPosition, [0, 0, 0], [0, 1, 0]);
    glM.mat4.identity(proj);
    glM.mat4.perspective(proj, Math.PI / 4.0, 1.0, 0.2, 100.0);

    gl.uniform1f( timeLocation, parameters.time / 1000 );
    gl.uniformMatrix4fv( MVPLocation[0], false, model );
    gl.uniformMatrix4fv( MVPLocation[1], false, view );
    gl.uniformMatrix4fv( MVPLocation[2], false, proj );
    // gl.uniformMatrix4fv( MVInvLocation, false, MV_Inv );

    // Render geometry

    gl.enableVertexAttribArray( vertex_position );
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer_pos );
    gl.vertexAttribPointer( vertex_position, 3, gl.FLOAT, false, 0, 0 );

    gl.enableVertexAttribArray( vertex_normal );
    gl.vertexAttribPointer( vertex_normal, 3, gl.FLOAT, false, 0, 0 );

    gl.enableVertexAttribArray( vertex_color );
    gl.bindBuffer( gl.ARRAY_BUFFER, buffer_col );
    gl.vertexAttribPointer( vertex_color, 4, gl.FLOAT, false, 0, 0 );
    
    gl.enableVertexAttribArray( vertex_uv );
    gl.vertexAttribPointer( vertex_uv, 2, gl.FLOAT, false, 0, 0 );

    gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, buffer_idx );
    gl.drawElements( gl.TRIANGLES, iCount, gl.UNSIGNED_SHORT, 0 );
    
    gl.disableVertexAttribArray( vertex_position );
    gl.disableVertexAttribArray( vertex_normal );
    gl.disableVertexAttribArray( vertex_color );
    gl.disableVertexAttribArray( vertex_uv );
}
