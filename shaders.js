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

// Procedural noise from https://www.shadertoy.com/view/4dffRH
vec3 hash( vec3 p ) // replace this by something better. really. do
{
	p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
			  dot(p,vec3(269.5,183.3,246.1)),
			  dot(p,vec3(113.5,271.9,124.6)));

	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

// return value noise (in x) and its derivatives (in yzw)
vec4 noised( in vec3 x )
{
    // grid
    vec3 p = floor(x);
    vec3 w = fract(x);
    
    #if 1
    // quintic interpolant
    vec3 u = w*w*w*(w*(w*6.0-15.0)+10.0);
    vec3 du = 30.0*w*w*(w*(w-2.0)+1.0);
    #else
    // cubic interpolant
    vec3 u = w*w*(3.0-2.0*w);
    vec3 du = 6.0*w*(1.0-w);
    #endif    
    
    // gradients
    vec3 ga = hash( p+vec3(0.0,0.0,0.0) );
    vec3 gb = hash( p+vec3(1.0,0.0,0.0) );
    vec3 gc = hash( p+vec3(0.0,1.0,0.0) );
    vec3 gd = hash( p+vec3(1.0,1.0,0.0) );
    vec3 ge = hash( p+vec3(0.0,0.0,1.0) );
	vec3 gf = hash( p+vec3(1.0,0.0,1.0) );
    vec3 gg = hash( p+vec3(0.0,1.0,1.0) );
    vec3 gh = hash( p+vec3(1.0,1.0,1.0) );
    
    // projections
    float va = dot( ga, w-vec3(0.0,0.0,0.0) );
    float vb = dot( gb, w-vec3(1.0,0.0,0.0) );
    float vc = dot( gc, w-vec3(0.0,1.0,0.0) );
    float vd = dot( gd, w-vec3(1.0,1.0,0.0) );
    float ve = dot( ge, w-vec3(0.0,0.0,1.0) );
    float vf = dot( gf, w-vec3(1.0,0.0,1.0) );
    float vg = dot( gg, w-vec3(0.0,1.0,1.0) );
    float vh = dot( gh, w-vec3(1.0,1.0,1.0) );
	
    // interpolations
    return vec4( va + u.x*(vb-va) + u.y*(vc-va) + u.z*(ve-va) + u.x*u.y*(va-vb-vc+vd) + u.y*u.z*(va-vc-ve+vg) + u.z*u.x*(va-vb-ve+vf) + (-va+vb+vc-vd+ve-vf-vg+vh)*u.x*u.y*u.z,    // value
                 ga + u.x*(gb-ga) + u.y*(gc-ga) + u.z*(ge-ga) + u.x*u.y*(ga-gb-gc+gd) + u.y*u.z*(ga-gc-ge+gg) + u.z*u.x*(ga-gb-ge+gf) + (-ga+gb+gc-gd+ge-gf-gg+gh)*u.x*u.y*u.z +   // derivatives
                 du * (vec3(vb,vc,ve) - va + u.yzx*vec3(va-vb-vc+vd,va-vc-ve+vg,va-vb-ve+vf) + u.zxy*vec3(va-vb-ve+vf,va-vb-vc+vd,va-vc-ve+vg) + u.yzx*u.zxy*(-va+vb+vc-vd+ve-vf-vg+vh) ));
}

void main() 
{
    // gl_Position = model * view * proj * vec4(position, 1.0);

    vec3 budPos = (model * vec4(position, 1.0)).xyz;

    // float variation = 0.5 * noised(100.0 * budPos).x;

    float tmp_bloom = clamp(10.0 * (bloom - color.a - 0.1 * color_sec.a), 0.0, 1.2);
    // float tmp_bloom = clamp(((time - float(int(time / 6.0)) * 6.0) - 2.0) / 1.0, 0.0, 1.0);
    // float tmp_bloom = 1.0;

    fPos = (model * vec4(mix(position, position_sec, tmp_bloom), 1.0)).xyz;

    float freq = 4.0;
    vec3 noise = 
        1.000 * noised(1. * freq * fPos).yzw + 
        0.500 * noised(2. * freq * fPos + vec3(12.0)).yzw + 
        0.250 * noised(4. * freq * fPos + vec3(89.0)).yzw +
        0.125 * noised(8. * freq * fPos + vec3(-2.0)).yzw;
    fPos += noise * 0.0135 * (1.0 - color_sec.a);

    fNormal = mat3(model) * mix(normal, normal_sec, tmp_bloom); // Should use MV_Inv instead

    gl_Position = proj * view * vec4(fPos, 1.0);

    if(drawMode == 0)
    {
        fColor = mix(vec4(color.rgb, 1.0), vec4(color_sec.rgb, 0.8 / color_sec.a), tmp_bloom);
    }
    else
    {
        fColor = vec4(0., 0., 0., 1.);
    }

    fType = vType;
}`;

var fs_common = `
uniform float time;

uniform vec3 lights[3];
uniform vec4 lightColor[4];

varying vec3 fPos;
varying vec4 fColor;
varying vec3 fNormal;
varying vec2 fUV;
varying float fType;

uniform vec3 camPos;

// Procedural noise from https://www.shadertoy.com/view/4dffRH
vec3 hash( vec3 p ) // replace this by something better. really. do
{
	p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
			  dot(p,vec3(269.5,183.3,246.1)),
			  dot(p,vec3(113.5,271.9,124.6)));

	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

// return value noise (in x) and its derivatives (in yzw)
vec4 noised( in vec3 x )
{
    // grid
    vec3 p = floor(x);
    vec3 w = fract(x);
    
    #if 1
    // quintic interpolant
    vec3 u = w*w*w*(w*(w*6.0-15.0)+10.0);
    vec3 du = 30.0*w*w*(w*(w-2.0)+1.0);
    #else
    // cubic interpolant
    vec3 u = w*w*(3.0-2.0*w);
    vec3 du = 6.0*w*(1.0-w);
    #endif    
    
    // gradients
    vec3 ga = hash( p+vec3(0.0,0.0,0.0) );
    vec3 gb = hash( p+vec3(1.0,0.0,0.0) );
    vec3 gc = hash( p+vec3(0.0,1.0,0.0) );
    vec3 gd = hash( p+vec3(1.0,1.0,0.0) );
    vec3 ge = hash( p+vec3(0.0,0.0,1.0) );
	vec3 gf = hash( p+vec3(1.0,0.0,1.0) );
    vec3 gg = hash( p+vec3(0.0,1.0,1.0) );
    vec3 gh = hash( p+vec3(1.0,1.0,1.0) );
    
    // projections
    float va = dot( ga, w-vec3(0.0,0.0,0.0) );
    float vb = dot( gb, w-vec3(1.0,0.0,0.0) );
    float vc = dot( gc, w-vec3(0.0,1.0,0.0) );
    float vd = dot( gd, w-vec3(1.0,1.0,0.0) );
    float ve = dot( ge, w-vec3(0.0,0.0,1.0) );
    float vf = dot( gf, w-vec3(1.0,0.0,1.0) );
    float vg = dot( gg, w-vec3(0.0,1.0,1.0) );
    float vh = dot( gh, w-vec3(1.0,1.0,1.0) );
	
    // interpolations
    return vec4( va + u.x*(vb-va) + u.y*(vc-va) + u.z*(ve-va) + u.x*u.y*(va-vb-vc+vd) + u.y*u.z*(va-vc-ve+vg) + u.z*u.x*(va-vb-ve+vf) + (-va+vb+vc-vd+ve-vf-vg+vh)*u.x*u.y*u.z,    // value
                 ga + u.x*(gb-ga) + u.y*(gc-ga) + u.z*(ge-ga) + u.x*u.y*(ga-gb-gc+gd) + u.y*u.z*(ga-gc-ge+gg) + u.z*u.x*(ga-gb-ge+gf) + (-ga+gb+gc-gd+ge-gf-gg+gh)*u.x*u.y*u.z +   // derivatives
                 du * (vec3(vb,vc,ve) - va + u.yzx*vec3(va-vb-vc+vd,va-vc-ve+vg,va-vb-ve+vf) + u.zxy*vec3(va-vb-ve+vf,va-vb-vc+vd,va-vc-ve+vg) + u.yzx*u.zxy*(-va+vb+vc-vd+ve-vf-vg+vh) ));
}

void main( void ) 
{
    float freq = 16.0;
    vec3 noise = vec3(0.0);
        
    if(fType >= 2.9) 
    { 
        noise = 
        1.000 * noised(1. * freq * fPos).yzw + 
        0.500 * noised(2. * freq * fPos + vec3(12.0)).yzw + 
        0.250 * noised(4. * freq * fPos + vec3(89.0)).yzw +
        0.125 * noised(8. * freq * fPos + vec3(-2.0)).yzw; 
    }

    vec3 normal = normalize(fNormal + 0.15 * noise);

    vec3 albedo = fColor.rgb * 0.3;
    vec3 finalColor = vec3(0.0, 0.0, 0.0);

    float coefficent = 0.;
    float diffuse = 0.;
    float specular = 0.;
    float transmit = 0.;
    float rim = 0.;

    vec3 viewVec = normalize(camPos - fPos);
    vec3 reflection;
    vec3 colorTone;

    for(int i = 0; i < 3; ++i)
    {
        coefficent = lightColor[i].a;
        diffuse = clamp(dot(normal, lights[i]), 0., 1.);

        // Specular reflection
        if(fType <= 2.5 && diffuse > 0.0)
        {
            reflection = reflect(lights[i], normal);
            specular = clamp(dot(reflection, viewVec), 0., 1.);
            specular = pow(specular, 32.0);
            // specular = 0.;
        }

        transmit = 0.;
        if(fType >= 0.9) // Leaf, pistil
        {
            // Transmission
            transmit = clamp(dot(-lights[i], viewVec), 0., 1.); // * pow(clamp(dot(viewVec, normal), 0., 1.), 0.001);
            transmit = pow(transmit, 32.0) * 0.35;
            colorTone = lightColor[i].rgb;// * albedo.rgb;
            if(fType <= 1.3) // Leaf
            {
                colorTone = vec3(colorTone.g * 0.9, colorTone.g * 1.0, colorTone.g * 0.2);
            }
        }

        rim = 0.;
        if(fType >= 1.9 && fType < 2.5) // Pistil, Fake SSS
        {
            // Rim light
            rim = 1.0 - clamp(dot(viewVec, normal), 0., 1.);
            rim = pow(rim, 0.5) * 0.6 * transmit; // Only apply rim light when transmission happens.
            diffuse += 0.2;
            diffuse = clamp(diffuse, 0., 1.);
        }

        finalColor += coefficent * (
            diffuse * lightColor[i].rgb * albedo.rgb + 
            specular * lightColor[i].rgb + 
            transmit * colorTone +
            rim * lightColor[i].rgb);
        // finalColor += coefficent * vec3(transmit);
        // finalColor += coefficent * vec3(specular);
    }
    
    // float ambient = 0.;
    float ambient = lightColor[3].a;
    finalColor = finalColor * (1.0 - ambient) + lightColor[3].rgb * fColor.rgb * ambient;

    float ao = clamp(fColor.a, 0.0, 1.0);
    finalColor *= ao;

    gl_FragColor = vec4(finalColor, 1.0);
    // gl_FragColor = vec4(albedo.rgb, 1.0);

    // gl_FragColor = vec4(noise / 0.05, 1.0);
}`;

var vs_Sky = `
uniform mat4 vpInv;

attribute vec3 position;
attribute vec2 uv;

varying vec3 fPos;
varying vec2 screenUV;

void main()
{
    gl_Position = vec4(position, 1.0);

    fPos = (vpInv * vec4(position.xy, 0.8, 1.0)).xyz; // Get world space position, for sky rendering
    screenUV = vec2(uv.x, 1.0 - uv.y);
}`;

var Sky = `
uniform sampler2D color;
uniform sampler2D depth;

varying vec3 fPos;
varying vec2 screenUV;

uniform vec3 camPos;
uniform vec3 light;
uniform vec4 lightColor;

void main( void ) 
{
    // gl_FragColor = texture2D(color, screenUV);
    // gl_FragColor = vec4(texture2D(depth, screenUV));
    float d = float(texture2D(depth, screenUV).r);
    
    float transmit = 0.;
    vec3 viewVec;
    vec3 colorTone;

    // Redish
    // vec3 skyTop = vec3(0.988, 0.686, 0.090);
    // vec3 skyBot = vec3(0.698, 0.176, 0.208);

    // Blueish day-time
    vec3 skyTop = vec3(0.565, 0.843, 0.925);
    vec3 skyBot = vec3(0.275, 0.365, 0.667);
    float sky = 0.;

    if(d == 1.0) // Nothing rendered - render sky instead
    {
        viewVec = normalize(camPos - fPos);

        // Transmission - Fake Sun
        transmit = clamp(dot(-light, viewVec), 0., 1.);
        transmit = pow(transmit, 64.0) * 3.0;
        colorTone = lightColor.rgb;

        sky = clamp((screenUV.y), 0., 1.);

        // Fake sky
        gl_FragColor = vec4(transmit * colorTone + mix(skyBot, skyTop, sky), 1.);
    }
    else
    {
        // gl_FragColor = vec4(d, d, d, 1.);
        gl_FragColor = texture2D(color, screenUV);
    }
}`

var vs_scrQuad = `
attribute vec3 position;
attribute vec2 uv;

varying vec2 screenUV;

void main()
{
    gl_Position = vec4(position, 1.0);
    screenUV = vec2(uv.x, 1.0 - uv.y);
}`;

var DOF = `
uniform sampler2D color;
uniform sampler2D depth;
uniform vec4 DOF; // x - near; y - far; z - focus; w - focusRange
uniform vec2 dirc;

varying vec2 screenUV;

#define BLUR_STEPS 7
#define WIDTH 600.0
#define SIZE 2.5

// From https://stackoverflow.com/a/6657284/10011415
float linearize_depth(float d,float zNear,float zFar)
{
    float z_n = 2.0 * d - 1.0;
    return 2.0 * zNear * zFar / (zFar + zNear - z_n * (zFar - zNear));
}

float getDOF(float d)
{
    float dep = linearize_depth(d, DOF.x, DOF.y);
    float r = clamp((abs(dep - DOF.z) - DOF.w) / DOF.w, 0., 1.);
    r *= 3.;
    return r;
}

// http://dev.theomader.com/gaussian-kernel-calculator/
float gaussian(int i)
{
    float g = 0.;
    if(i == 3) { g = 0.383103; }
    if(i == 2 || i == 4) { g = 0.241843; }
    if(i == 1 || i == 5) { g = 0.060626; }
    if(i == 0 || i == 6) { g = 0.005980; }
    
    return g;
}

void main( void ) 
{
    float r = getDOF(texture2D(depth, screenUV).r);
    
    float start = 0.;
    float offset = 0.;
    float newDepth = 0.;
    vec2 newUV = screenUV;

    vec3 colorSum;
    if(r <= 0.01)
    {
        gl_FragColor = texture2D(color, screenUV);
        // gl_FragColor = vec4(0., 0., 1., 1.);
    }
    else
    {
        r = r / WIDTH * SIZE / (float(BLUR_STEPS) - 1.);
        start = (-r) * ((float(BLUR_STEPS) - 1.) / 2.);

        for(int i = 0; i < BLUR_STEPS; ++i)
        {
            offset = start + float(i) * r;
            newUV = screenUV + offset * dirc;
            if(getDOF(texture2D(depth, newUV).r) > 0.01)
            {
                colorSum += 
                    texture2D(color, newUV).rgb * 
                    gaussian(i); // Gaussian instead.
            }
            else
            {
                colorSum +=
                    texture2D(color, screenUV).rgb * 
                    gaussian(i); // Gaussian instead.
            }
        }
        gl_FragColor = vec4(colorSum, 1.);
        // gl_FragColor = vec4(r, r, r, 1.);
    }
}`;

var ColorCorrection = `
uniform sampler2D color;

varying vec2 screenUV;

float unitSigmoid(float x)
{
    return 1. / (exp((-10.)*x + 5.) + 1.);
}

void main( void ) 
{
    vec3 pColor = texture2D(color, screenUV).rgb;

    pColor.r = pow(pColor.r, 1.1);
    pColor.g = mix(pColor.g, unitSigmoid(pColor.g), 0.1);
    pColor.b = mix(pColor.b, unitSigmoid(pColor.b), 0.3);

    gl_FragColor = vec4(pColor, 1.0);
}`;
