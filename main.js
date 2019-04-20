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

class plantRenderable
{
    constructor(gl, flower = false, wireframe = false)
    {
        this.buffer_pos = 0;
        this.buffer_nor = 0;
        this.buffer_col = 0;
        this.buffer_uvw = 0;
        this.buffer_idx = 0;
        this.buffer_typ = 0;

        this.iCount = 0;

        this.gl = gl;

        this.pos = glM.vec3.create();
        this.modelMat = glM.mat4.create();

        if(flower === true)
        {
            // Very expensive lol
            this.buffer_pos2 = 0;
            this.buffer_nor2 = 0;
            this.buffer_col2 = 0;
        }

        if(wireframe === true)
        {
            this.buffer_idx_wire = 0;
            this.iCount_wire = 0;
        }

        this.wireframe = wireframe;
        this.isFlower = flower;
    }

    init(plant)
    {
        this.buffer_pos = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_pos );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(plant.position), gl.STATIC_DRAW );

        this.buffer_nor = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_nor );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(plant.normal), gl.STATIC_DRAW );

        this.buffer_col = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_col );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(plant.color), gl.STATIC_DRAW );

        this.buffer_uvw = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_uvw );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(plant.uv), gl.STATIC_DRAW );

        this.buffer_typ = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_typ );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(plant.type), gl.STATIC_DRAW );

        if(this.isFlower === true)
        {
            this.buffer_pos2 = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_pos2 );
            gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(plant.position_sec), gl.STATIC_DRAW );

            this.buffer_nor2 = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_nor2 );
            gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(plant.normal_sec), gl.STATIC_DRAW );

            this.buffer_col2 = gl.createBuffer();
            gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_col2 );
            gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(plant.color_sec), gl.STATIC_DRAW );
        }
        
        this.buffer_idx = gl.createBuffer();
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.buffer_idx );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(plant.indices), gl.STATIC_DRAW );

        this.iCount = plant.iCount;

        if(this.wireframe === true)
        {
            // Convert triangles to lines.
            // Unfortunately, we don't have glPolygonMethod in WebGL and OpenGL ES.

            var faceCnt = Math.floor(this.iCount / 3);
            this.vertex_idx_wire = [];
            for(var f = 0; f < faceCnt; f++)
            {
                var curIdx = f * 3;
                this.vertex_idx_wire.push(
                    plant.indices[curIdx    ], plant.indices[curIdx + 1],
                    plant.indices[curIdx + 1], plant.indices[curIdx + 2],
                    plant.indices[curIdx + 2], plant.indices[curIdx    ]);
            }

            this.buffer_idx_wire = gl.createBuffer();
            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.buffer_idx_wire );
            gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.vertex_idx_wire), gl.STATIC_DRAW );
            this.iCount_wire = faceCnt * 6;
        }
    }

    render(locations)
    {
        gl.uniformMatrix4fv( locations.model, false, this.modelMat );

        // Render geometry

        gl.enableVertexAttribArray( locations.pos );
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_pos );
        gl.vertexAttribPointer( locations.pos, 3, gl.FLOAT, false, 0, 0 );

        gl.enableVertexAttribArray( locations.nor );
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_nor );
        gl.vertexAttribPointer( locations.nor, 3, gl.FLOAT, false, 0, 0 );

        gl.enableVertexAttribArray( locations.col );
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_col );
        gl.vertexAttribPointer( locations.col, 4, gl.FLOAT, false, 0, 0 );
        
        // gl.enableVertexAttribArray( locations.uvw );
        // gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_uvw );
        // gl.vertexAttribPointer( locations.uvw, 2, gl.FLOAT, false, 0, 0 );

        gl.enableVertexAttribArray( locations.typ );
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_typ );
        gl.vertexAttribPointer( locations.typ, 1, gl.FLOAT, false, 0, 0 );

        if(this.isFlower === true)
        {
            gl.enableVertexAttribArray( locations.pos2 );
            gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_pos2 );
            gl.vertexAttribPointer( locations.pos2, 3, gl.FLOAT, false, 0, 0 );
            
            gl.enableVertexAttribArray( locations.nor2 );
            gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_nor2 );
            gl.vertexAttribPointer( locations.nor2, 3, gl.FLOAT, false, 0, 0 );
            
            gl.enableVertexAttribArray( locations.col2 );
            gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_col2 );
            gl.vertexAttribPointer( locations.col2, 4, gl.FLOAT, false, 0, 0 );
        }

        gl.uniform1i( locations.drawMode, 0 );
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.buffer_idx );
        gl.drawElements( gl.TRIANGLES, this.iCount, gl.UNSIGNED_SHORT, 0 );

        if(this.wireframe == true)
        {
            gl.uniform1i( locations.drawMode, 1 );
            gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.buffer_idx_wire );
            gl.drawElements( gl.LINES, this.iCount_wire, gl.UNSIGNED_SHORT, 0 );
        }
        
        gl.disableVertexAttribArray( locations.pos );
        // gl.disableVertexAttribArray( locations.nor );
        gl.disableVertexAttribArray( locations.col );
        // gl.disableVertexAttribArray( locations.uvw );

        if(this.isFlower === true)
        {
            gl.disableVertexAttribArray( locations.pos2 );
            // gl.disableVertexAttribArray( locations.nor2 );
            gl.disableVertexAttribArray( locations.col2 );
        }
    }
}

class Program
{
    constructor(gl, vs, fs, vars)
    {
        this.vs = vs;
        this.fs = fs;
        this.vars = vars;
        this.gl = gl;
    }

    init()
    {
        this.program = createProgram( this.vs, this.fs );
        this.locations = {};

        for(const v of Object.keys(this.vars))
        {
            // this.vars[v] = [ (String) name, (Boolean) isUniform ]

            var isUniform = this.vars[v][1];
            if(isUniform)
            {
                this.locations[v] = gl.getUniformLocation( this.program, this.vars[v][0] );
            }
            else
            {
                this.locations[v] = gl.getAttribLocation( this.program, this.vars[v][0] );
            }
        }
    }
}

var canvas, 
    gl, 
    program_plant,
    program_flowers,
    plants = [],
    flowers = [],
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

var drawAsUsual     = true;
// var drawWireFrame   = true;
var drawWireFrame   = false;

init();
animate();

function init() 
{
    canvas = document.querySelector( 'canvas#mainCanvas' );

    // Initialise WebGL

    try {

        gl = canvas.getContext( 'experimental-webgl' );

    } catch( error ) { }

    if ( !gl ) {

        throw "cannot create webgl context";

    }

    // Create programs
    program_plant = new Program(gl, vs_common, fs_common, {
        time:       ['time',        true ],
        model:      ['model',       true ],
        view:       ['view',        true ],
        proj:       ['proj',        true ],
        MVInv:      ['MV_Inv',      true ],
        drawMode:   ['drawMode',    true ],
        
        pos:        ['position',    false],
        nor:        ['normal',      false],
        col:        ['color',       false],
        uvw:        ['uv',          false],
        typ:        ['vType',       false],
    });

    program_plant.init();

    program_flowers = new Program(gl, vs_bloom, fs_bloom, {
        time:       ['time',        true ],
        model:      ['model',       true ],
        view:       ['view',        true ],
        proj:       ['proj',        true ],
        MVInv:      ['MV_Inv',      true ],
        drawMode:   ['drawMode',    true ],
        
        pos:        ['position',    false],
        nor:        ['normal',      false],
        col:        ['color',       false],
        uvw:        ['uv',          false],
        typ:        ['vType',       false],

        bloom:      ['bloom',       true ],
        pos2:       ['position_sec',false],
        nor2:       ['normal_sec',  false],
        col2:       ['color_sec',   false],
    });

    program_flowers.init();

    gl.enable(gl.DEPTH_TEST);

    // jasmine = populatePlant(0);
    jasmine = populatePlant(19422);

    var p = new plantRenderable(gl, false, drawWireFrame);
    p.init(jasmine);
    plants.push(p);

    // Blooming flowers
    var f = new plantRenderable(gl,  true, drawWireFrame);
    f.init(jasmine.flower);
    flowers.push(f);

    // TODO: flowers
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
    // var time = 8100;
    var time = new Date().getTime() - parameters.start_time;
    var dist = 5.7;
    glM.vec3.set(camPosition, dist * Math.sin(time / 2000.0), 3.4, dist * Math.cos(time / 2000.0));
}

function render() 
{
    if ( !program_plant.program ) return;
    if ( !program_flowers.program ) return;

    var camTarget = [0, 1.14, 0];

    parameters.time = new Date().getTime() - parameters.start_time;

    gl.clearColor(0.2, 0.2, 0.2, 1.0);
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    // Load program into GPU

    // Draw plants (parts are not flowers)

    gl.useProgram( program_plant.program );

    // Set values to program variables
    // Update camera matrix
    
    glM.mat4.identity(view);
    glM.mat4.lookAt(view, camPosition, camTarget, [0, 1, 0]);
    glM.mat4.identity(proj);
    glM.mat4.perspective(proj, Math.PI / 4.0, 1.0, 0.2, 100.0);

    gl.uniform1f( program_plant.locations.time, parameters.time / 1000 );
    gl.uniformMatrix4fv( program_plant.locations.view, false, view );
    gl.uniformMatrix4fv( program_plant.locations.proj, false, proj );
    // gl.uniformMatrix4fv( MVInvLocation, false, MV_Inv );

    // Render geometry
    for(var plant of plants)
    {
        plant.render(program_plant.locations);
    }

    // Draw flowers

    gl.useProgram( program_flowers.program );

    // Set values to program variables
    // Update camera matrix
    
    glM.mat4.identity(view);
    glM.mat4.lookAt(view, camPosition, camTarget, [0, 1, 0]);
    glM.mat4.identity(proj);
    glM.mat4.perspective(proj, Math.PI / 4.0, 1.0, 0.2, 100.0);

    gl.uniform1f( program_flowers.locations.time, parameters.time / 1000 );
    gl.uniformMatrix4fv( program_flowers.locations.view, false, view );
    gl.uniformMatrix4fv( program_flowers.locations.proj, false, proj );
    // gl.uniformMatrix4fv( MVInvLocation, false, MV_Inv );

    // Render geometry
    for(var flower of flowers)
    {
        flower.render(program_flowers.locations);
    }
}
