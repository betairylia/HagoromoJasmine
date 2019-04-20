var vs_common = `
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 uv;
attribute float vType;

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;
uniform mat4 MV_Inv;
uniform int  drawMode;

varying vec3 fPos;
varying vec4 fColor;
varying vec3 fNormal;
varying vec2 fUV;
varying float fType;

void main() 
{
    // gl_Position = model * view * proj * vec4(position, 1.0);

    fPos = (model * vec4(position, 1.0)).xyz;
    fNormal = mat3(model) * normal; // Should use MV_Inv instead

    gl_Position = proj * view * vec4(fPos, 1.0);

    if(drawMode == 0)
    {
        fColor = color;
    }
    else
    {
        fColor = vec4(0., 0., 0., 1.);
    }

    fType = vType;
}`;

var fs_common = `
uniform float time;

varying vec3 fPos;
varying vec4 fColor;
varying vec3 fNormal;
varying vec2 fUV;
varying float fType;

void main( void ) 
{
    vec3 normal = normalize(fNormal);

    vec3 matColor = fColor.rgb;

    float ambient = 0.5;
    float diffuse = clamp(dot(normal, vec3(0, 1, 0)), 0.0, 1.0);
    float ao = clamp(fColor.a, 0.0, 1.0);

    // Pistil
    if(fType >= 1.9)
    {
        diffuse = 1.0;
    }

    gl_FragColor = vec4(ao * (ambient + (1.0 - ambient) * diffuse) * matColor, 1.0);
}`;

var vs_bloom = `
attribute vec3 position;
attribute vec3 normal;
attribute vec4 color;
attribute vec2 uv;
attribute float vType;

uniform mat4 model;
uniform mat4 view;
uniform mat4 proj;
uniform mat4 MV_Inv;
uniform int  drawMode;

attribute vec3 position_sec;
attribute vec3 normal_sec;
attribute vec4 color_sec;

uniform float time;
uniform float bloom;

varying vec3 fPos;
varying vec4 fColor;
varying vec3 fNormal;
varying vec2 fUV;
varying float fType;

void main() 
{
    // gl_Position = model * view * proj * vec4(position, 1.0);

    float tmp_bloom = clamp(((time - float(int(time / 6.0)) * 6.0) - 2.0) / 1.0, 0.0, 1.0);
    // float tmp_bloom = 0.0;

    fPos = (model * vec4(mix(position, position_sec, tmp_bloom), 1.0)).xyz;
    fNormal = mat3(model) * mix(normal, normal_sec, tmp_bloom); // Should use MV_Inv instead

    gl_Position = proj * view * vec4(fPos, 1.0);

    if(drawMode == 0)
    {
        fColor = mix(color, color_sec, tmp_bloom);
    }
    else
    {
        fColor = vec4(0., 0., 0., 1.);
    }

    fType = vType;
}`;

var fs_bloom = `
uniform float time;

varying vec3 fPos;
varying vec4 fColor;
varying vec3 fNormal;
varying vec2 fUV;
varying float fType;

// TODO: check the color space!

void main( void ) 
{
    vec3 normal = normalize(fNormal);

    vec3 matColor = fColor.rgb;

    float ambient = 0.5;
    float diffuse = clamp(dot(normal, vec3(0, 1, 0)), 0.0, 1.0);
    float ao = clamp(fColor.a, 0.0, 1.0);

    gl_FragColor = vec4(ao * (ambient + (1.0 - ambient) * diffuse) * matColor, 1.0);
}`;