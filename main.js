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
    constructor(gl, flower = false, wireframe = false, normal = false)
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

        if(normal === true)
        {
            this.buffer_pos_norm = 0;
            if(flower === true)
            {
                this.buffer_pos_norm_2 = 0;
            }
        }

        this.wireframe = wireframe;
        this.isFlower = flower;
        this.normal = normal;
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

        // if(this.normal === true)
        // {
        //     var vert = [];
        //     var norm = glM.vec3.create();

        //     var vCount = Math.floor(plant['position'].length / 3);

        //     for(var v = 0; v < vCount; v++)
        //     {
        //         vert.push(plant['position'][v * 3], plant['position'][v * 3 + 1], plant['position'][v * 3 + 2]);
        //         glM.vec3.set(norm, plant['normal'][v * 3], plant['normal'][v * 3 + 1], plant['normal'][v * 3 + 2]);
        //         glM.vec3.normalize(norm, norm);
        //         glM.vec3.scale(norm, norm, 0.05);
        //         vert.push(plant['position'][v * 3] + norm[0], plant['position'][v * 3 + 1] + norm[1], plant['position'][v * 3 + 2] + norm[2]);
        //     }

        //     this.buffer_pos_norm = gl.createBuffer();
        //     gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_pos_norm );
        //     gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vert), gl.STATIC_DRAW );
        //     this.vcount_norm = vCount * 2;

        //     if(this.flower === true)
        //     {
        //         vert = [];

        //         for(var v = 0; v < vCount; v++)
        //         {
        //             vert.push(plant['position_sec'][v * 3], plant['position_sec'][v * 3 + 1], plant['position_sec'][v * 3 + 2]);
        //             glM.vec3.set(norm, plant['normal_sec'][v * 3], plant['normal_sec'][v * 3 + 1], plant['normal_sec'][v * 3 + 2]);
        //             glM.vec3.normalize(norm, norm);
        //             glM.vec3.scale(norm, norm, 0.05);
        //             vert.push(plant['position_sec'][v * 3] + norm[0], plant['position_sec'][v * 3 + 1] + norm[1], plant['position_sec'][v * 3 + 2] + norm[2]);
        //         }

        //         this.buffer_pos_norm_2 = gl.createBuffer();
        //         gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_pos_norm_2 );
        //         gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(vert), gl.STATIC_DRAW );
        //     }
        // }
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

    // renderNormal(locations)
    // {
    //     gl.uniformMatrix4fv( locations.model, false, this.modelMat );

    //     // Render geometry

    //     gl.enableVertexAttribArray( locations.pos );
    //     gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_pos_norm );
    //     gl.vertexAttribPointer( locations.pos, 3, gl.FLOAT, false, 0, 0 );

    //     if(this.flower === true)
    //     {
    //         gl.enableVertexAttribArray( locations.pos2 );
    //         gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_pos_norm_2 );
    //         gl.vertexAttribPointer( locations.pos2, 3, gl.FLOAT, false, 0, 0 );
    //     }

    //     gl.drawArrays(GL_LINES, 0, this.vcount_norm);

    //     gl.disableVertexAttribArray( locations.pos );
    //     if(this.flower === true)
    //     {
    //         gl.disableVertexAttribArray( locations.pos2 );
    //     }
    // }
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
    post_sky,
    post_DOF_X,
    post_DOF_Y,
    post_colorCorrection,
    program_sky,
    program_DOF_X,
    program_DOF_Y,
    program_CC,
    plants = [],
    flowers = [],
    parameters = {  start_time  : new Date().getTime(), 
                    time        : 0, 
                    screenWidth : 0, 
                    screenHeight: 0 };

// var glM = glMatrix; // alias
var camPosition = glM.vec3.create();
glM.vec3.set(camPosition, -1.2, 1.0, 2.0);
var camTarget = [-1.0, 1.0, -0.0];
var model = glM.mat4.create();
glM.mat4.identity(model);
var view = glM.mat4.create();
var proj = glM.mat4.create();

var drawAsUsual     = true;
// var drawWireFrame   = true;
var drawWireFrame   = false;

width = 600;
height = 600;

// Light rig
lightMain = glM.vec3.normalize(glM.vec3.create(), [0.4, 0.15, -1]);
lightMainColor = [1.000, 0.929, 0.302, 3.0]; // Creamy yellow
lightDome = glM.vec3.normalize(glM.vec3.create(), [0, 1, 0]);
lightDomeColor = [0.7, 0.943, 0.925, 1.5]; // Sky blue 
lightIndirect = glM.vec3.normalize(glM.vec3.create(), [-0.4, 0.15, -1]);
lightIndirectColor = [0.698, 0.176, 0.208, 1.0]; // Yellow-Greenish
lightAmbient = [0.953, 0.925, 0.9, 0.6]; // ambient

init();
animate();

function init() 
{
    canvas = document.querySelector( 'canvas#mainCanvas' );

    // Initialise WebGL

    var isgl2 = true;
    try {

        gl = canvas.getContext( 'webgl2' );

    } catch( error ) { }

    if( !gl )
    {
        try {
            isgl2 = false;
            gl = canvas.getContext( 'webgl' );
        }
        catch(e) {}
    }

    if ( !gl ) {

        throw "cannot create webgl context";

    }

    if(!isgl2)
    {
        var ext = (
            gl.getExtension("WEBKIT_WEBGL_depth_texture") ||
            gl.getExtension("WEBGL_depth_texture") ||
            gl.getExtension("OES_WEBGL_depth_texture") ||
            gl.getExtension("MOZ_WEBGL_depth_texture")
        );
        console.log(ext);

        if(!ext)
        {
            throw "cannot load extension WEBGL_depth_texture!";
        }
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

        dmain:      ['lights[0]',    true],
        cmain:      ['lightColor[0]',true],
        ddome:      ['lights[1]',    true],
        cdome:      ['lightColor[1]',true],
        dindr:      ['lights[2]',    true],
        cindr:      ['lightColor[2]',true],
        cambi:      ['lightColor[3]',true],
        pcam:       ['camPos',       true],
    });

    program_plant.init();

    program_flowers = new Program(gl, vs_bloom, fs_common/*fs_bloom*/, {
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

        dmain:      ['lights[0]',    true],
        cmain:      ['lightColor[0]',true],
        ddome:      ['lights[1]',    true],
        cdome:      ['lightColor[1]',true],
        dindr:      ['lights[2]',    true],
        cindr:      ['lightColor[2]',true],
        cambi:      ['lightColor[3]',true],
        pcam:       ['camPos',       true],
    });

    program_flowers.init();

    program_sky = new Program(gl, vs_Sky, Sky, {
        vpInv:      ['vpInv',        true],
        pos:        ['position',    false],
        uvw:        ['uv',          false],
        color:      ['color',        true],
        depth:      ['depth',        true],
        pcam:       ['camPos',       true],
        cmain:      ['lightColor',   true],
        pmain:      ['light',        true],
    })

    program_DOF = new Program(gl, vs_scrQuad, DOF, {
        uvw:        ['uv',          false],
        color:      ['color',        true],
        depth:      ['depth',        true],
        dof:        ['DOF',          true],
        dirc:       ['dirc',         true],
    });

    program_CC = new Program(gl, vs_scrQuad, ColorCorrection, {
        uvw:        ['uv',          false],
        color:      ['color',        true],
    });

    program_sky.init();
    program_DOF.init();
    program_CC.init();

    post_sky = new PostProcess(gl, isgl2, width * 2, height * 2, program_sky, true); // *2 for some poor SSAA
    post_DOF_X = new PostProcess(gl, isgl2, width, height, program_DOF, false); 
    post_DOF_Y = new PostProcess(gl, isgl2, width, height, program_DOF, false);
    post_colorCorrection = new PostProcess(gl, isgl2, width, height, program_CC, false);

    post_sky.init();
    post_DOF_X.init();
    post_DOF_Y.init();
    post_colorCorrection.init();

    gl.enable(gl.DEPTH_TEST);

    for(var i = 0; i < 4; i++)
    {
        var translation = glM.mat4.create();
        glM.mat4.translate(translation, translation, [i * -0.9, i * 0.0, i * -2.3]);
        // jasmine = populatePlant(0);
        jasmine = populatePlant(19422 + i * 2019, translation);

        var p = new plantRenderable(gl, false, drawWireFrame);
        p.init(jasmine);
        plants.push(p);

        // Blooming flowers
        var f = new plantRenderable(gl,  true, drawWireFrame);
        f.init(jasmine.flower);
        flowers.push(f);
    }

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

function updateLight(locations)
{
    gl.uniform3fv(locations.dmain, lightMain);
    gl.uniform3fv(locations.ddome, lightDome);
    gl.uniform3fv(locations.dindr, lightIndirect);

    gl.uniform4fv(locations.cmain, lightMainColor);
    gl.uniform4fv(locations.cdome, lightDomeColor);
    gl.uniform4fv(locations.cindr, lightIndirectColor);

    gl.uniform4fv(locations.cambi, lightAmbient);
}

function update()
{
    // var time = 0;
    // var time = new Date().getTime() - parameters.start_time;
    // var dist = 5.7;
    // glM.vec3.set(camPosition, dist * Math.sin(time / 2000.0), 1.4, dist * Math.cos(time / 2000.0));
}

function render() 
{
    if ( !program_plant.program ) return;
    if ( !program_flowers.program ) return;

    parameters.time = new Date().getTime() - parameters.start_time;

    // Render to texture for post processing
    post_sky.attach();

    gl.clearColor(0.6, 0.5, 0.4, 1.0);
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    // Load program into GPU

    // Draw plants (parts are not flowers)

    gl.useProgram( program_plant.program );

    updateLight(program_plant.locations);

    // Set values to program variables
    // Update camera matrix
    
    glM.mat4.identity(view);
    glM.mat4.lookAt(view, camPosition, camTarget, [0, 1, 0]);
    glM.mat4.identity(proj);
    glM.mat4.perspective(proj, Math.PI / 4.0, 1.0, 0.2, 100.0);

    gl.uniform1f( program_plant.locations.time, parameters.time / 1000 );
    gl.uniformMatrix4fv( program_plant.locations.view, false, view );
    gl.uniformMatrix4fv( program_plant.locations.proj, false, proj );
    gl.uniform3fv( program_plant.locations.pcam, camPosition );
    // gl.uniformMatrix4fv( MVInvLocation, false, MV_Inv );

    // Render geometry
    for(var plant of plants)
    {
        plant.render(program_plant.locations);
    }

    // Draw flowers

    gl.useProgram( program_flowers.program );

    updateLight(program_flowers.locations);

    // Set values to program variables
    // Update camera matrix

    gl.uniform1f( program_flowers.locations.time, parameters.time / 1000 );
    gl.uniformMatrix4fv( program_flowers.locations.view, false, view );
    gl.uniformMatrix4fv( program_flowers.locations.proj, false, proj );
    gl.uniform3fv( program_flowers.locations.pcam, camPosition );

    gl.uniform1f( program_flowers.locations.bloom, 0.5 + 0.65 * Math.sin(parameters.time / 3000) )
    // gl.uniformMatrix4fv( MVInvLocation, false, MV_Inv );

    // Render geometry
    for(var flower of flowers)
    {
        flower.render(program_flowers.locations);
    }

    // Post processing
    post_sky.release(width, height);
    post_DOF_X.attach();

    vpi = glM.mat4.mul(glM.mat4.create(), view, proj);
    glM.mat4.invert(vpi, vpi);
    // console.log(vpi);

    post_sky.render(function(){
        gl.uniformMatrix4fv( program_sky.locations.vpInv, false, vpi );
        gl.uniform3fv( program_sky.locations.pmain, lightMain );
        gl.uniform4fv( program_sky.locations.cmain, [1.0, 0.808, 0.482, 1.0] );
        gl.uniform3fv( program_sky.locations.pcam, camPosition );
    });

    post_DOF_X.release(width, height);
    post_DOF_Y.attach();

    post_DOF_X.render(function(){
        gl.activeTexture(gl.TEXTURE0 + 1);
        gl.bindTexture(gl.TEXTURE_2D, post_sky.depthTex);
        gl.uniform1i(post_DOF_X.program.locations.depth, 1);
        gl.uniform4f(post_DOF_X.program.locations.dof, 0.2, 100.0, 1.5, 1.0);
        gl.uniform2f(post_DOF_X.program.locations.dirc, 1.0, 0.0);
    });

    post_DOF_Y.release(width, height);
    post_colorCorrection.attach();

    post_DOF_Y.render(function(){
        gl.activeTexture(gl.TEXTURE0 + 1);
        gl.bindTexture(gl.TEXTURE_2D, post_sky.depthTex);
        gl.uniform1i(post_DOF_X.program.locations.depth, 1);
        gl.uniform4f(post_DOF_X.program.locations.dof, 0.2, 100.0, 1.5, 1.0);
        gl.uniform2f(post_DOF_X.program.locations.dirc, 0.0, 1.0);
    });

    post_colorCorrection.release(width, height);
    post_colorCorrection.render();
}
