var vs_color = `
attribute vec3 position;
attribute vec3 position_secondary;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 uv;

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;
uniform mat4 MV_Inv;
uniform int  drawMode;

varying vec4 vertColor;

void main() 
{
    // gl_Position = model * view * proj * vec4(position, 1.0);
    gl_Position = proj * view * model * vec4(position, 1.0);
    if(drawMode == 0)
    {
        vertColor = color;
    }
    else
    {
        vertColor = vec4(0., 0., 0., 1.);
    }
}`;

var fs_color = `
uniform float time;
varying vec4 vertColor;

void main( void ) 
{
    gl_FragColor = vertColor; //vec4( 0.937, 0.357, 0.612, 1.0 ); // Some random pink
}`;