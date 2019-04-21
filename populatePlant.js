'use strict'

var glM = glMatrix;

var noise = 
{
    simplex: null,
    simplex2: null,
    oct1: null,
    oct2: null,
    oct3: null,

    fbm: function(gain, x, y, z)
    {
        return this.oct1.noise3D(x, y, z) + gain * this.oct2.noise3D(2 * x, 2 * y, 2 * z) + gain * gain * this.oct3.noise3D(4 * x, 4 * y, 4 * z);
    },

    _cnt: 0.0,
};

function initNoise(seed)
{
    noise.simplex = new SimplexNoise(seed);
    noise.simplex2 = new SimplexNoise(seed << 2 + 2019);
    noise.oct1 = new SimplexNoise(seed << 2 + 4);
    noise.oct2 = new SimplexNoise(seed << 4 + 22);
    noise.oct3 = new SimplexNoise(seed << 3 + 1420);
    noise._cnt = 0.0;
}

function nextFloat()
{
    noise._cnt += 0.713486758092;
    return noise.simplex.noise2D(noise._cnt, -noise._cnt) * 0.5 + 0.5;
}

function fbm3D(gain, x, y, z, scale = 1.0, freq = 1.0)
{
    return [
        scale * noise.fbm(gain, freq * x - 3.2, freq * y + 6.8, freq * z + 0.0),
        scale * noise.fbm(gain, freq * x + 1.7, freq * y + 1.2, freq * z - 0.8),
        scale * noise.fbm(gain, freq * x - 9.2, freq * y + 4.7, freq * z - 3.3),
    ];
}

function nextFloatRange(min, max)
{
    return nextFloat() * (max - min) + min;
}

var Jasmine = 
{
    drawCurve: function({
        plant,
        translation = undefined,
        curve = [],
        radius = 1.0,
        rSeg = 50,
        color = [1, 1, 1, 1],
        up = [0, 1, 0],
        type = 0.0, // Default type is "Stem"
    } = {})
    {
        if(!translation) { translation = glM.mat4.create(); }
        var nSeg = curve.length;
        
        var offset = plant['position'].length;
        offset = offset / 3;
        
        for(var i = 0; i < nSeg; i++)
        {
            var dst, tmp = glM.vec3.create();
            
            dst = glM.vec3.create();
            
            if(i > 0)
            {
                // previous one
                glM.vec3.subtract(dst, curve[i], curve[i-1]);
                // glM.vec3.add(dst, curve[i], dst);
            }

            if(i < nSeg - 1)
            {
                // next one
                glM.vec3.subtract(tmp, curve[i+1], curve[i]);
                glM.vec3.add(dst, dst, tmp);
            }

            // Normalize
            glM.vec3.normalize(dst, dst);

            // Tangent space
            if(dst[0] != 0 || dst[1] != 1 || dst[2] != 0)
            {
                var tY = dst;
                var tX = glM.vec3.create();
                var tZ = glM.vec3.create();

                glM.vec3.cross(tX, tY, up);
                glM.vec3.normalize(tX, tX);
                glM.vec3.cross(tZ, tX, tY);
                glM.vec3.normalize(tZ, tZ);
            }
            else
            {
                var tY = [0, 1, 0];
                var tX = [1, 0, 0];
                var tZ = [0, 0, 1];
            }

            var cur_radius = 0;
            if(typeof radius == 'number')
            {
                cur_radius = radius;
            }
            else if(typeof radius == 'object')
            {
                cur_radius = radius[i];
            }
                
            for(var r = 0; r < rSeg; r++)
            {
                var rad = r * (Math.PI * 2.0) / rSeg;
                var ptX = Math.sin(rad) * cur_radius;
                var ptZ = Math.cos(rad) * cur_radius;

                var dP = glM.vec3.create();
                glM.vec3.add(dP, dP, glM.vec3.scale(glM.vec3.create(), tX, ptX));
                glM.vec3.add(dP, dP, glM.vec3.scale(glM.vec3.create(), tZ, ptZ));

                var finalPos = glM.vec3.create();
                glM.vec3.set(finalPos,
                    curve[i][0] + dP[0],
                    curve[i][1] + dP[1],
                    curve[i][2] + dP[2])

                glM.vec3.transformMat4(finalPos, finalPos, translation);
                
                plant['position'].push(finalPos[0], finalPos[1], finalPos[2]);
                var rot = glM.mat4.getRotation(glM.quat.create(), translation);
                var _dP = glM.vec3.transformQuat(glM.vec3.create(), dP, rot);
                plant['normal'].push(_dP[0], _dP[1], _dP[2]);
                plant['color'].push(color[0], color[1], color[2], color[3]);
                plant['type'].push(type);
                // TODO: normal, uv, etc.
            }
        }

        // Push indices
        // Generate faces
        for(var i = 0; i < (nSeg-1); i++)
        {
            for(var r = 0; r < rSeg; r++)
            {
                var pt = i * rSeg + r;
                var nextR  = i * rSeg + (r + 1) % rSeg;
                plant['indices'].push(
                    offset + pt, offset + nextR, offset + pt + rSeg,
                    offset + nextR, offset + nextR + rSeg, offset + pt + rSeg);
            }
        }
    },

    evalCurve: function({
        curve = [],
        evals = [],
        withDirc = false,
    } = {})
    {
        if(curve.length <= 0)
        {
            return [];
        }

        if(curve.length == 1)
        {
            var result = [];
            for(var i = 0; i < evals.length; i++)
            {
                var tmp = glM.vec3.create();
                glM.vec3.set(tmp, curve[0][0], curve[0][1], curve[0][2]);
                result.push(tmp);
            }

            return result;
        }

        var cSeg = 1.0 / (curve.length - 1);
        result = [];
        for(var i = 0; i < evals.length; i++)
        {
            var startPt = Math.min(curve.length - 2, Math.floor(evals[i] / cSeg));
            var endPt   = Math.max(               1, Math.ceil (evals[i] / cSeg));
            var midVal  = evals[i] - startPt * cSeg;

            var tmp = glM.vec3.create();
            glM.vec3.lerp(tmp, curve[startPt], curve[endPt], midVal / cSeg);

            if(withDirc === true)
            {
                var dirc = glM.vec3.create();
                glM.vec3.sub(dirc, curve[endPt], curve[startPt]);
                glM.vec3.normalize(dirc, dirc);

                tmp = [tmp, dirc];
            }

            result.push(tmp);
        }

        return result;
    },

    calcCurveAlign: function({
        translation = glM.mat4.create(), // Used for fbm sampling
        start = [0, 0, 0],
        startDirc = [0, 1, 0],
        alignDirc = [0, 1, 0],
        align = 0.3,
        noiseA = 0.0,
        noiseP = 1.0,
        noiseOctwave = 0.5,
        nSeg = 10,
        step = 0.1,
    } = {})
    {
        align = Math.max(align, 0.0);
        align = Math.min(align, 1.0);

        var stem = [];
        var p = glM.vec3.clone(start);
        var d = glM.vec3.clone(startDirc);
        var a = glM.vec3.clone(alignDirc);
        glM.vec3.normalize(d, d);
        glM.vec3.normalize(a, a);
        glM.vec3.scale(d, d, step);
        for(var i = 0; i < nSeg; i++)
        {
            stem.push(p);
            p = glM.vec3.clone(p);

            glM.vec3.add(p, p, d);

            var _p = glM.vec3.clone(p);
            glM.vec3.transformMat4(_p, p, translation);
            glM.vec3.add(d, d, fbm3D(noiseOctwave, _p[0], _p[1], _p[2], noiseA, 1.0 / noiseP));

            glM.vec3.normalize(d, d);
            glM.vec3.lerp(d, d, a, align);
            glM.vec3.normalize(d, d);
            glM.vec3.scale(d, d, step);
        }

        return stem;
    },

    vecToMat: function(tX, tY, tZ)
    {
        return glM.mat4.set(glM.mat4.create(), 
            tX[0], tX[1], tX[2], 0,
            tY[0], tY[1], tY[2], 0,
            tZ[0], tZ[1], tZ[2], 0,
                0 ,    0 ,    0 , 1); // This is the transpose of actual matrix (row0col0, row1col0, row2col0, ...)
    },

    alignYAxis: function({
        vec = [0, 1, 0],
         up = [0, 1, 0],
    } = {})
    {
        var tX = glM.vec3.create();
        var tY = glM.vec3.create();
        var tZ = glM.vec3.create();
        glM.vec3.set(tY, vec[0], vec[1], vec[2]);
        glM.vec3.normalize(tY, tY);
        glM.vec3.cross(tX, tY, up);
        glM.vec3.normalize(tX, tX);
        glM.vec3.cross(tZ, tX, tY);
        
        var rot = this.vecToMat(tX, tY, tZ);
        
        return rot;
    },

    flattenBell: function({
        x,
        flatten = 0,
        mu = 0.5,
        dev = 0.16, // 2 * (sigma ^ 2)
    } = {})
    {
        // var value = Math.tanh(flatten * Math.exp(-(Math.pow(x - mu, 2)) / dev));
        // var maxValue = Math.tanh(flatten * Math.exp(-(Math.pow(0, 2)) / dev));
        // value *= 1.0 / maxValue;

        var value = Math.exp(-(Math.pow(Math.abs(x - mu), 2 + flatten)) / dev);

        return value;
    },

    dFlattenBell: function({
        x,
        flatten = 0,
        mu = 0.5,
        dev = 0.16, // 2 * (sigma ^ 2)
    } = {})
    {
        var sign = 1;
        if(x - mu < 0) { sign = -1; }

        return -(1 / dev) * Math.exp(-(Math.pow(Math.abs(x - mu), 2 + flatten)) / dev) * (2 + flatten) * Math.pow(Math.abs(x - mu), 1 + flatten);
    },

    leaf: function({
        plant,
        translation = undefined, 
        length = 1.8, // ratio of length to width (1.0), don't change the scale 
        startW = 0.0, // value within [0.0, 1.0]
        normalAlign = [0, 1, 0],
        normalAlignPower = 0.4,
        horizons = 3, verticals = 2} = {})
    {
        // console.log(translation);
        if(!translation)
        {
            translation = glM.mat4.create();
            // console.log(translation);
        }

        var offset = plant['position'].length;
        offset = offset / 3;

        var segment = 1.0 / (horizons - 1);
        for(var h = 0; h < horizons; h++)
        {
            // Sample the point
            var pX = segment * h;
            var pY = 0.0;

            // calculate width
            var width = startW + (1.0 - startW) * this.flattenBell({x: pX, flatten: 0.5, dev: 0.16});
            width *= 1.0 / length;
            var zSegment = width / (verticals - 1);

            for(var v = 0; v < verticals; v++)
            {
                var pZ = (-(width / 2.0)) + v * zSegment;

                var finalPos = glM.vec3.create();
                glM.vec3.transformMat4(finalPos, [pX, pY, pZ], translation);
                glM.vec3.add(finalPos, finalPos, fbm3D(0.5, finalPos[0] - 196, finalPos[1], finalPos[2], Math.pow(pX, 0.2) * 0.02, 6.0)); // Add some noise, but no noise at root (pX = 0)

                plant['position'].push(finalPos[0], finalPos[1], finalPos[2]);

                var rot = glM.mat4.getRotation(glM.quat.create(), translation);
                var _n = glM.vec3.transformQuat(glM.vec3.create(), [0, 1, 0], rot);
                glM.vec3.normalize(_n, _n);
                glM.vec3.lerp(_n, _n, normalAlign, normalAlignPower);
                plant['normal'].push(_n[0], _n[1], _n[2]);
                
                plant['color'].push(0.282, 0.486, 0.220, 0.65 + Math.pow(pX, 0.2) * 0.35); // Fake AO
                plant['type'].push(1.0); // Leaf
                // plant['color'].push(0.937, 0.357 + (1.0 - 0.357) * Math.abs(len / (width / 2.0)), 0.612, 1.0);
            }
        }

        // Generate faces
        for(var h = 0; h < horizons-1; h++)
        {
            for(var v = 0; v < verticals-1; v++)
            {
                var pt = h * verticals + v;
                plant['indices'].push(
                    offset + pt, offset + pt + 1, offset + pt + verticals,
                    offset + pt + 1, offset + pt + 1 + verticals, offset + pt + verticals);
            }
        }
    },

    leafStem: function({
        plant,
        translation,
        start = [0, 0, 0],
        startDirc = [0, 1, 0.3],
        alignDirc = [0, 1, 0], up = [0, 1, 0],
        align = 0.0,
        facing = [1, 0, 0], facingPower = 0.0,
        step = 0.3,
        nSeg = 3,
        rSeg = 3,
        radius = 0.01,
        noiseA = 0.1, noiseP = 0.4, noiseOctwave = 0.3,
        nSub = 4, dSub = Math.PI, subStart = 0.2, subEnd = 0.8,
    } = {})
    {
        var stem = this.calcCurveAlign({
            translation: translation, 
            start: start, startDirc: startDirc, 
            alignDirc: alignDirc, align: align, 
            noiseA: noiseA, noiseP: noiseP, noiseOctwave: noiseOctwave, 
            nSeg: nSeg, step: step
        });

        // Generate subs
        var subs = [];
        for(var i = 0; i < nSub; i++)
        {
            var x = subStart + i * ((subEnd - subStart) / (nSub - 1));
            subs.push(x + nextFloatRange(-0.0, 0.0));
        }

        subs = this.evalCurve({curve: stem, evals: subs, withDirc: true});

        var rad = 0.0;
        var stack = [];

        for(var i = 0; i < nSub; i++)
        {
            stack.push(glM.mat4.clone(translation));

            var localPos = glM.vec3.clone(subs[i][0]);
            var localDirc = glM.vec3.create();

            rad = i * dSub + nextFloatRange(-0.07, 0.7);
            var rtX = 0.5 + nextFloatRange(-0.5, 0.5); // A little "front"
            var rtY = Math.sin(rad);
            var rtZ = Math.cos(rad);

            // Create sub-stems
            // Overall tangent space
            var tX = glM.vec3.create();
            var tY = glM.vec3.create();
            var tZ = glM.vec3.create();
            glM.vec3.set(tX, subs[i][1][0], subs[i][1][1], subs[i][1][2]);
            glM.vec3.normalize(tX, tX);
            glM.vec3.cross(tZ, tX, up);
            glM.vec3.normalize(tZ, tZ);
            glM.vec3.cross(tY, tX, tZ);

            localDirc[0] = rtX * tX[0] + rtY * tY[0] + rtZ * tZ[0];
            localDirc[1] = rtX * tX[1] + rtY * tY[1] + rtZ * tZ[1];
            localDirc[2] = rtX * tX[2] + rtY * tY[2] + rtZ * tZ[2];

            // console.log(localDirc);

            var ttX = glM.vec3.normalize(glM.vec3.create(), localDirc);
            var ttZ = glM.vec3.cross(glM.vec3.create(), ttX, glM.vec3.lerp(glM.vec3.create(), up, facing, facingPower));
            glM.vec3.normalize(ttZ, ttZ);
            var ttY = glM.vec3.cross(glM.vec3.create(), ttX, ttZ);

            var rot = this.vecToMat(ttX, ttY, ttZ);
            var _p = glM.vec3.transformMat4(glM.vec3.create(), localPos, translation);
            glM.vec3.add(_p, _p, [128, 199, 43]);
            var leafScale = noise.fbm(0.5, _p[0] * 63, _p[1] * 63, _p[2] * 63) * 0.1 + 0.3 * step * (nSeg - 1) / 1.0;

            glM.mat4.translate(translation, translation, localPos);
            glM.mat4.scale(translation, translation, [leafScale, leafScale, leafScale]);
            glM.mat4.mul(translation, translation, rot);

            this.leaf({
                plant: plant,
                translation: translation,
                horizons: 4,
                verticals: 3,
            });

            translation = stack.pop();
        }

        this.drawCurve({
            plant: plant,
            translation: translation,
            curve: stem,
            radius: radius,
            rSeg: rSeg,
            color: [0.694, 0.545, 0.333, 1.0],
        });
    },

    // plant: plant array
    // translation: glM.mat4
    petal: function({
        plant,
        translation = undefined, 
        alpha = 0.35, 
        startW = 0.3, expand = 0.0, totalGain = 0.4, fallOffGain = 0.1, expandExp = 2.0, fallOffExp = 3.5, cutOff = 4.7,
        rStart = 0.1, rEnd = 1.0, rGain = 1.4,
        length = 1.8, // ratio of length to width (1.0), don't change the scale 
        budLen = 5.5,
        normalAlign = [0, 1, 0],
        normalAlignPower = 0.4,
        bloomTime = 0.5,
        horizons = 12, verticals = 8} = {})
    {
        // console.log(translation);
        if(!translation)
        {
            translation = glM.mat4.create();
            // console.log(translation);
        }

        var offset = plant['position'].length;
        offset = offset / 3;

        var segment = 1.0 / (horizons - 1);
        for(var h = 0; h < horizons; h++)
        {
            // Position 1 - Bud
            {
                // Sample the point
                var pY = segment * h;
                var pR = this.flattenBell({x: pY, flatten: 0.2, mu: 0.3, dev: 0.15}) / budLen;

                // calculate width
                var width = Math.PI * 0.6; // in radian
                width = Math.max(width, 0.0);
                var zSegment = width / (verticals - 1);

                // var radius = rStart + (rEnd - rStart) * Math.pow(pX, 1.0 / rGain);
                // console.log(h);
                // console.log(radius);

                // radius /= length;

                // Dive into the tangent space
                var dR = this.dFlattenBell({x: pY, flatten: 0.2, mu: 0.3, dev: 0.15}) / budLen; // derivative
                var yScale = 1.1;

                for(var v = 0; v < verticals; v++)
                {
                    var theta = (width / 2) - v * zSegment;

                    var tangentSpace = this.alignYAxis({ vec: [Math.cos(theta) * dR, yScale, -Math.sin(theta) * dR], up: [0, 1, 0] });

                    var finalPos = glM.vec3.create();
                    glM.vec3.set(finalPos, Math.cos(theta) * pR, pY * yScale, -Math.sin(theta) * pR);
                    glM.vec3.transformMat4(finalPos, finalPos, translation);

                    plant['position'].push(finalPos[0], finalPos[1], finalPos[2]);

                    var rot = glM.mat4.getRotation(glM.quat.create(), translation);
                    var norm = glM.vec3.transformQuat(glM.vec3.create(), glM.vec3.transformMat4(glM.vec3.create(), [0, 0, -1], tangentSpace), rot);
                    glM.vec3.normalize(norm, norm);
                    glM.vec3.lerp(norm, norm, normalAlign, normalAlignPower);
                    plant['normal'].push(norm[0], norm[1], norm[2]);

                    plant['color'].push(0.847, 0.220, 0.380, bloomTime);
                    // plant['color'].push(0.996, 0.933, 0.929, bloomTimeS);
                    plant['type'].push(3.0); // Petal
                }
            }

            // Position 2 - Blooming flower
            {
                // Sample the point
                var pX = segment * h;
                var pY = Math.pow(pX + 1e-3, alpha) * 0.4;

                // calculate width
                var width = 
                    startW + expand * (cutOff * pX) +
                    (1 - startW) * Math.tanh(
                        (totalGain * (
                            Math.pow(cutOff * pX, expandExp) - 
                            Math.pow(cutOff * pX, fallOffExp) * fallOffGain
                        ))
                    );
                width = Math.max(width, 0.0) / length;
                var zSegment = width / (verticals - 1);

                var radius = rStart + (rEnd - rStart) * Math.pow(pX, 1.0 / rGain);
                // console.log(h);
                // console.log(radius);

                radius /= length;

                // Dive into the tangent space
                var dY = alpha * Math.pow(pX + 1e-1, alpha - 1); // derivative
                var tX = glM.vec3.create();
                var tY = glM.vec3.create();
                var tZ = glM.vec3.create();

                glM.vec3.set(tX, 1.0, dY, 0.0);
                glM.vec3.normalize(tX, tX);
                glM.vec3.cross(tZ, tX, [0, 1, 0]);
                glM.vec3.normalize(tZ, tZ);
                glM.vec3.cross(tY, tZ, tX);

                for(var v = 0; v < verticals; v++)
                {
                    var len = (-(width / 2.0)) + v * zSegment;
                    var rad = len / radius; // * Math.PI;
                    var vtY = -Math.cos(rad) * radius + radius;
                    var vtZ =  Math.sin(rad) * radius;

                    var finalPos = glM.vec3.create();
                    glM.vec3.set(finalPos,
                        pX + vtY * tY[0] + vtZ * tZ[0] + 0.03, 
                        pY + vtY * tY[1] + vtZ * tZ[1], 
                        0 + vtY * tY[2] + vtZ * tZ[2]
                    );
                    glM.vec3.transformMat4(finalPos, finalPos, translation);

                    plant['position_sec'].push(finalPos[0], finalPos[1], finalPos[2]);
                    
                    var norm = glM.vec3.normalize(glM.vec3.clone(tY), tY);
                    glM.vec3.lerp(norm, norm, normalAlign, normalAlignPower);
                    plant['normal_sec'].push(norm[0], norm[1], norm[2]);
                    
                    plant['color_sec'].push(0.996, 0.933, 0.929, dY);
                }
            }
        }

        // Generate faces
        for(var h = 0; h < horizons-1; h++)
        {
            for(var v = 0; v < verticals-1; v++)
            {
                var pt = h * verticals + v;
                plant['indices'].push(
                    offset + pt, offset + pt + 1, offset + pt + verticals,
                    offset + pt + 1, offset + pt + 1 + verticals, offset + pt + verticals);
            }
        }
    },

    flower: function({
        plant,
        translation,
        dirc = [0, 1, 0],
        worldSpaceDirc = true,
    } = {})
    {
        var stack = [];
        var tmp = glM.mat4.clone(translation);

        // Cylindrical petals
        stack.push(glM.mat4.clone(tmp));
        var rodSteps = 5;
        var rodDirc = glM.vec3.clone(dirc);
        if(worldSpaceDirc === true)
        {
            var quat = glM.quat.create();
            glM.mat4.getRotation(quat, tmp);
            glM.quat.invert(quat, quat);
            glM.vec3.transformQuat(rodDirc, dirc, quat); // Get the dirc in world space
            glM.vec3.normalize(rodDirc, rodDirc);
        }
        tmp = stack.pop();

        var stemPetals = this.calcCurveAlign({
            translation: translation, 
            start: [0, -0.2, 0], startDirc: [0, 1, 0],
            alignDirc: rodDirc, align: 0.3,
            noiseA: 0.0,
            noiseP: 10.0, 
            nSeg: rodSteps, step: 1.0 / rodSteps
        });

        var rodRadius = [];
        for(var i = 0; i < rodSteps; i++)
        {
            var x = 1.0 / (rodSteps - 1) * i;
            rodRadius.push(0.02 + 0.04 * Math.pow(x, 1.5));
        }

        this.drawCurve({plant: plant, translation: translation, curve: stemPetals, radius: rodRadius, rSeg: 8, color: [0.847, 0.220, 0.380, 1.0], type: 2.0,});

        var flowerPos = this.evalCurve({curve: stemPetals, evals: [0.95], withDirc: true})[0];
        var rot = glM.mat4.create();
        if(!(worldSpaceDirc == false && dirc[0] == 0 && dirc[1] == 1 && dirc[2] == 0))
        {
            rot = this.alignYAxis({vec: flowerPos[1], up: [0, 1, 0]});
        }

        stack.push(glM.mat4.clone(tmp));
        var flowerScale = 0.5;
        var _p = glM.vec3.transformMat4(glM.vec3.create(), flowerPos[0], translation);
        glM.vec3.scale(_p, _p, 0.5); // freq = 12
        var bloomTime = 0.5 - 0.5 * noise.fbm(0.5, _p[0], _p[1], _p[2]);
        // console.log(bloomTime);
        glM.mat4.translate(tmp, tmp, flowerPos[0]);
        glM.mat4.scale(tmp, tmp, [flowerScale, flowerScale, flowerScale]);
        glM.mat4.mul(tmp, tmp, rot);
            // Petals
            var petals = 5;
            for(var i = 0; i < petals; i++)
            {
                stack.push(glM.mat4.clone(tmp));
                    glM.mat4.rotateY(tmp, tmp, i * (2.0 * Math.PI / petals))
                    this.petal({
                        plant: plant.flower,
                        translation: tmp,
                        horizons: 6,
                        verticals: 4,
                        bloomTime: bloomTime,
                    });
                tmp = stack.pop();
            }

            // Pistil
            stack.push(glM.mat4.clone(tmp));
            {
                var nSeg = 3, rSeg = 3;
                var gPos = glM.vec3.transformMat4(glM.vec3.create(), [0, 0, 0], tmp);
                
                var pistil = this.calcCurveAlign({
                    translation: tmp, 
                    start: [0, 0, 0], startDirc: [0, 1, 0],
                    alignDirc: fbm3D(0.5, gPos[0], gPos[1], gPos[2]), align: 0.3,
                    noiseA: 0.01,
                    noiseP: 0.01, 
                    nSeg: nSeg, step: 0.75 * nextFloatRange(0.7, 1.2) / nSeg
                });
        
                var pistilRadius = [];
                for(var i = 0; i < nSeg; i++)
                {
                    var x = 1.0 / (nSeg - 1) * i;
                    pistilRadius.push(0.04 * this.flattenBell({x: x, flatten: 2})); // a "flatten" bell curve.
                }

                this.drawCurve({plant: plant, translation: tmp, curve: pistil, radius: pistilRadius, rSeg: rSeg, color: [0.988, 0.945, 0.431, 1.00], type: 2.0 /*Pistil*/});
            }
            tmp = stack.pop();

        tmp = stack.pop();

        // translation = stack.pop();
    },

    flowerStem: function({
        plant,
        translation,
        start = [0, 0, 0],
        startDirc = [0, 1, 0],
        alignDirc = [0, -1, 0],
        align = 0.27,
        step = 0.5,
        nSeg = 10,
        rSeg = 3,
        radius = 0.04,
        noiseA = 0.1, noiseP = 0.4, noiseOctwave = 0.3,
        up = [0, 1, 0],
    } = {})
    {
        var stem = this.calcCurveAlign({
            translation: translation, 
            start: start, startDirc: startDirc, 
            alignDirc: alignDirc, align: align, 
            noiseA: noiseA, noiseP: noiseP, noiseOctwave: noiseOctwave, 
            nSeg: nSeg, step: step
        });

        if(true)
        {
            var flowerPos = [1.0];
            flowerPos = this.evalCurve({curve: stem, evals: flowerPos, withDirc: true})[0];
            var tmp_mat = glM.mat4.clone(translation);

            var rot = this.alignYAxis({vec: flowerPos[1], up: up});

            glM.mat4.translate(tmp_mat, tmp_mat, flowerPos[0]);
            glM.mat4.scale(tmp_mat, tmp_mat, [0.2, 0.2, 0.2]);
            glM.mat4.mul(tmp_mat, tmp_mat, rot);

            this.flower({plant: plant, translation: tmp_mat});
        }

        this.drawCurve({
            plant: plant,
            translation: translation,
            curve: stem,
            radius: radius,
            rSeg: rSeg,
            color: [0.694, 0.545, 0.333, 1.0],
        });
    },

    subStem: function({
        plant,
        translation,
        depth = 0,
        start = [0, 0, 0],
        startDirc = [0, 1, 0],
        alignDirc = [0, -1, 0], up = [0, 1, 0],
        align = 0.27,
        step = 0.5,
        nSeg = 10,
        rSeg = 3,
        radius = 0.04,
        noiseA = 0.1, noiseP = 0.4, noiseOctwave = 0.3,
        nSub = 15, dSub = Math.PI, subStart = 0.3, subEnd = 0.95, subDir = [-0.7, 1.0, 0.0],
    } = {})
    {
        var stem = this.calcCurveAlign({
            translation: translation, 
            start: start, startDirc: startDirc, 
            alignDirc: alignDirc, align: align, 
            noiseA: noiseA, noiseP: noiseP, noiseOctwave: noiseOctwave, 
            nSeg: nSeg, step: step
        });

        // Generate subs
        var subs = [];
        for(var i = 0; i < nSub; i++)
        {
            var x = subStart + i * ((subEnd - subStart) / (nSub - 1));
            subs.push(Math.min(subEnd, Math.max(subStart, x + nextFloatRange(-0.01, 0.01))));
        }

        subs = this.evalCurve({curve: stem, evals: subs, withDirc: true});

        var rad = 0.0;
        var stack = [];

        for(var i = 0; i < nSub; i++)
        {
            stack.push(glM.mat4.clone(translation));

            var localPos = glM.vec3.clone(subs[i][0]);
            var localDirc = glM.vec3.create();

            rad = i * dSub + nextFloatRange(-0.07, 0.7);
            var rtX = 2.0 + nextFloatRange(-0.5, 0.5); // A little "front"
            var rtY = Math.sin(rad);
            var rtZ = Math.cos(rad);

            // Create sub-stems
            // Overall tangent space
            var tX = glM.vec3.create();
            var tY = glM.vec3.create();
            var tZ = glM.vec3.create();
            glM.vec3.set(tX, subs[i][1][0], subs[i][1][1], subs[i][1][2]);
            glM.vec3.normalize(tX, tX);
            glM.vec3.cross(tZ, tX, up);
            glM.vec3.normalize(tZ, tZ);
            glM.vec3.cross(tY, tX, tZ);

            localDirc[0] = rtX * tX[0] + rtY * tY[0] + rtZ * tZ[0];
            localDirc[1] = rtX * tX[1] + rtY * tY[1] + rtZ * tZ[1];
            localDirc[2] = rtX * tX[2] + rtY * tY[2] + rtZ * tZ[2];

            glM.mat4.translate(translation, translation, localPos);

            if(depth == 0)
            {
                this.subStem({
                    plant: plant,
                    translation: translation,
                    depth: 1,
                    start: [0, 0, 0], // Since we already applied the translation (movement only)
                    startDirc: localDirc,
                    alignDirc: alignDirc,
                    align: 0.66,
                    noiseA: 3.0,
                    noiseP: 0.01,
                    noiseOctwave: 0.6,
                    step: step * 3,
                    nSeg: 8,
                    radius: 0.01,
                    rSeg: 5,
                    nSub: 40, subStart: 0.05, subEnd: 0.9
                });
            }
            else
            {
                if(noise.fbm(0.5, localPos[0], localPos[1], localPos[2]) > -0.1)
                {
                    this.flowerStem({
                        plant: plant,
                        translation: translation,
                        start: [0, 0, 0], // Since we already applied the translation (movement only)
                        startDirc: localDirc,
                        alignDirc: subDir,
                        align: 0.5,
                        noiseA: 0.0,
                        step: 0.08 * nextFloatRange(0.7, 1.1),
                        nSeg: 3,
                        rSeg: 5,
                        radius: 0.007,
                    });
                }
                else
                {
                    this.leafStem({
                        plant: plant,
                        translation: translation,
                        start: [0, 0, 0], // Since we already applied the translation (movement only)
                        startDirc: localDirc,
                        alignDirc: alignDirc,
                        align: 0.4,
                        facing: subDir, facingPower: 0.0,
                        noiseA: 0.2,
                        noiseP: 0.001,
                        step: 0.1 * nextFloatRange(0.7, 1.1),
                        nSeg: 9,
                        rSeg: 5,
                        nSub: 4,
                        radius: 0.005,
                    });
                }
            }

            translation = stack.pop();
        }

        this.drawCurve({
            plant: plant,
            translation: translation,
            curve: stem,
            radius: radius,
            rSeg: rSeg,
            color: [0.694, 0.545, 0.333, 1.0],
        });
    },

    mainStem: function({
        plant,
        translation,
        start   = [ 0,  0, -1],
        end     = [ 0,  0,  1],
        up      = [ 0,  1,  0],
        radius  = 0.2,
        noiseA  = 0.2, noiseP = 3.0, noiseOctwave = 0.3,
        rSeg    = 3, nSeg = 10,
        nSub    = 6, dSub = Math.PI * 0.333,
    } = {})
    {
        var stem = [];
        for(var i = 0; i < nSeg; i++)
        {
            var p = glM.vec3.create();
            glM.vec3.lerp(p, start, end, i * (1.0 / (nSeg - 1)));
            glM.vec3.add(p, p, fbm3D(noiseOctwave, p[0], p[1], p[2], noiseA, 1.0 / noiseP));
            stem.push(p);
        }

        var subs = [];
        for(var i = 0; i < nSub; i++)
        {
            var x = 0.1 + i * (0.8 / (nSub - 1));
            subs.push(x + nextFloatRange(-0.02, 0.02));
        }

        subs = this.evalCurve({curve: stem, evals: subs});
        
        // Create sub-stems
        // Overall tangent space
        var tX = glM.vec3.create();
        var tY = glM.vec3.create();
        var tZ = glM.vec3.create();
        glM.vec3.sub(tX, end, start);
        glM.vec3.normalize(tX, tX);
        glM.vec3.cross(tZ, tX, up);
        glM.vec3.normalize(tZ, tZ);
        glM.vec3.cross(tY, tX, tZ);

        var rad = 0.0;
        var stack = [];

        for(var i = 0; i < nSub; i++)
        {
            stack.push(glM.mat4.clone(translation));

            var localPos = glM.vec3.clone(subs[i]);
            var localDirc = glM.vec3.create();

            rad = i * dSub + nextFloatRange(-0.4, 0.4);
            var rtY = Math.sin(rad);
            var rtZ = Math.cos(rad);

            localDirc[0] = rtY * tY[0] + rtZ * tZ[0];
            localDirc[1] = rtY * tY[1] + rtZ * tZ[1];
            localDirc[2] = rtY * tY[2] + rtZ * tZ[2];

            glM.mat4.translate(translation, translation, localPos);

            this.subStem({
                plant: plant,
                translation: translation,
                start: [0, 0, 0], // Since we already applied the translation (movement only)
                startDirc: localDirc,
                alignDirc: [-0.4, -1.0, 0.0],
                align: 0.65,
                noiseA: 0.3,
                step: 0.18,
                nSeg: 4,
                radius: 0.025,
                nSub: 2,
                dSub: Math.PI / 4.0, subStart: 0.6, subEnd: 0.9,
            });

            translation = stack.pop();
            // console.log(tZ);
        }

        this.drawCurve({
            plant: plant,
            translation: translation,
            curve: stem,
            radius: radius,
            rSeg: rSeg,
            color: [0.694, 0.545, 0.333, 1.0],
        });
    },

    jasmine: function({
        plant,
        translation,
    } = {})
    {
        this.mainStem({
            plant: plant,
            translation: translation,
            start: [0, 3, -1], end: [0, 3, 1],
            radius: 0.03,
            nSub: 5,
        });
    }
};

function populatePlant(seed = 0, translation = glM.mat4.create())
{
    var plant = 
    {
        position:       [],
        normal:         [],
        color:          [],
        uv:             [],
        indices:        [],
        type:           [],
        seed:           seed,
        iCount:         0,
    };

    var flower = 
    {
        position:       [],
        position_sec:   [],
        normal:         [],
        normal_sec:     [],
        color:          [],
        color_sec:      [],
        uv:             [],
        indices:        [],
        type:           [],
        seed:           seed,
        iCount:         0,
    };

    plant.flower = flower;

    initNoise(seed);
    // initNoise(12);

    var translate = glM.mat4.clone(translation);
    // Jasmine.leaf({plant: plant, translation: glM.mat4.fromScaling(glM.mat4.create(), [0.2, 0.2, 0.2]), horizons: 16, verticals: 12});
    // Jasmine.leafStem({plant: plant, translation: glM.mat4.fromScaling(glM.mat4.create(), [0.2, 0.2, 0.2])});

    // var t = glM.mat4.fromScaling(glM.mat4.create(), [0.2, 0.2, 0.2]);
    // glM.mat4.translate(t, t, [0, 0, 1]);
    // Jasmine.petal({plant: plant, translation: t});
    // Jasmine.flowerStem({ 
    //     plant: plant, translation: translate, 
    //     nSeg: 2, step: 0.07, noiseP: 0.1,
    //     start: [0, 0, 0.0],
    //     startDirc: [nextFloat(), nextFloat(), nextFloat()], 
    //     alignDirc: [nextFloat(), nextFloat(), nextFloat()], align: 0.4,
    // noiseA: 2.0,});
    Jasmine.jasmine({plant: plant, translation: translate});

    // Jasmine.drawCurve({
    //     plant: plant,
    //     curve: [[-1, 0, -1], [-1, 0.5, 0], [0, -0.5, 1], [1.2, 0.2, 2.3]],
    //     radius: 0.3,
    // });

    plant.iCount = plant.indices.length;
    plant.flower.iCount = plant.flower.indices.length;

    console.log(plant);

    return plant;
}
