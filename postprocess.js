screenQuad   = [-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]
screenQuadUV = [0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0] 

class PostProcess
{
    constructor(gl, isWGL2, screenW, screenH, program, depth = false)
    {
        this.gl = gl;
        this.isWGL2 = isWGL2;
        this.program = program;

        this.width = screenW;
        this.height = screenH;

        this.depth = depth;
    }

    // Init frame buffer and vertex buffers for screen quad.
    init()
    {
        // Please refer to https://webglfundamentals.org/webgl/lessons/zh_cn/webgl-render-to-texture.html
        var gl = this.gl;

        this.colorTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.colorTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.width, this.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.frameBuf = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuf);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.colorTex, 0);

        if(this.depth === true)
        {

            this.depthTex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.depthTex);
            if(this.isWGL2)
            {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, this.width, this.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
            }
            else
            {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.width, this.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
            }
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTex, 0);
        }

        // console.log(this.colorTex);
        // console.log(this.depthTex);
        // console.log(this.frameBuf);

        // Unbind current frame buffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        //
        // ─── SCREEN QUAD ─────────────────────────────────────────────────
        //

        this.buffer_pos = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_pos );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(screenQuad), gl.STATIC_DRAW );

        this.buffer_uvw = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_uvw );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array(screenQuadUV), gl.STATIC_DRAW );
    }

    attach()
    {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.frameBuf);
        this.gl.viewport(0, 0, this.width, this.height);
    }

    release(width = 0, height = 0)
    {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        
        // TODO: get vp size in attach() ?
        if(width > 0 && height > 0)
        {
            this.gl.viewport(0, 0, width, height);
        }
        else
        {
            this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        }
    }

    render(commands = null)
    {
        var gl = this.gl;

        gl.useProgram(this.program.program);

        gl.activeTexture(gl.TEXTURE0 + 0);
        gl.bindTexture(gl.TEXTURE_2D, this.colorTex);
        gl.uniform1i(this.program.locations.color, 0);
        
        if(this.depth === true)
        {
            gl.activeTexture(gl.TEXTURE0 + 1);
            gl.bindTexture(gl.TEXTURE_2D, this.depthTex);
            gl.uniform1i(this.program.locations.depth, 1);
        }

        if(commands)
        {
            commands();
        }

        gl.enableVertexAttribArray( this.program.locations.pos );
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_pos );
        gl.vertexAttribPointer( this.program.locations.pos, 2, gl.FLOAT, false, 0, 0 );

        gl.enableVertexAttribArray( this.program.locations.uvw );
        gl.bindBuffer( gl.ARRAY_BUFFER, this.buffer_uvw );
        gl.vertexAttribPointer( this.program.locations.uvw, 2, gl.FLOAT, false, 0, 0 );

        gl.drawArrays(gl.TRIANGLES, 0, 6);

        gl.disableVertexAttribArray(this.program.locations.pos);
        gl.disableVertexAttribArray(this.program.locations.uvw);
    }
}
