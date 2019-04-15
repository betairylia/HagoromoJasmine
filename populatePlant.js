'use strict'

var glM = glMatrix;

var Jasmine = 
{
    // plant: plant array
    // translation: glM.mat4
    petal: function({
        plant, 
        translation = undefined, 
        alpha = 0.25, 
        startW = 0.3, expand = 0.03, totalGain = 0.4, fallOffGain = 0.1, expandExp = 2.0, fallOffExp = 3.5, cutOff = 4.7,
        rStart = 0.3, rEnd = 1.0, rGain = 1.4,
        length = 2.0, // ratio of length to width (1.0), don't change the scale 
        horizons = 32, verticals = 32} = {})
    {
        // console.log(translation);
        if(!translation)
        {
            translation = glM.mat4.create();
            // console.log(translation);
        }

        var offset = plant['position'].length;
        offset = offset / 3;
        console.log(offset);

        var segment = 1.0 / (horizons - 1);
        for(var h = 0; h < horizons; h++)
        {
            // Sample the point
            var pX = segment * h;
            var pY = Math.pow(pX, alpha) * 0.4;

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
            var dY = alpha * Math.pow(pX + 1e-5, alpha - 1); // derivative
            var tX = glM.vec3.create();
            var tY = glM.vec3.create();
            var tZ = glM.vec3.create();

            glM.vec3.set(tX, 1.0, dY, 0.0);
            glM.vec3.normalize(tX, tX);
            glM.vec3.cross(tZ, tX, [0, 1, 0]);
            glM.vec3.cross(tY, tZ, tX);

            // DEBUG
            for(var v = 0; v < verticals; v++)
            {
                var len = (-(width / 2.0)) + v * zSegment;
                var rad = len / radius; // * Math.PI;
                var vtY = -Math.cos(rad) * radius + radius;
                var vtZ =  Math.sin(rad) * radius;

                var finalPos = glM.vec3.create();
                glM.vec3.set(finalPos,
                    pX + vtY * tY[0] + vtZ * tZ[0], 
                    pY + vtY * tY[1] + vtZ * tZ[1], 
                     0 + vtY * tY[2] + vtZ * tZ[2]
                );
                glM.vec3.transformMat4(finalPos, finalPos, translation);

                plant['position'].push(finalPos[0], finalPos[1], finalPos[2]);
                plant['color'].push(0.937, 0.357 + (1.0 - 0.357) * Math.abs(len / (width / 2.0)), 0.612, 1.0);
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
    }
};

function populatePlant(seed = 0)
{
    var plant = 
    {
        position:       [],
        position_sec:   [],
        normal:         [],
        color:          [],
        uv:             [],
        indices:        [],
        iCount:         0,
    };

    var translate = glM.mat4.create();
    // matStack = []

    var loops = 5;
    for(var i = 0; i < loops; i++)
    {
        // matStack.push(translate);

        glM.mat4.fromYRotation(translate, i * (2.0 * Math.PI / loops))
        Jasmine.petal({
            plant: plant,
            translation: translate,
        });
        
        // translate = matStack.pop();
    }

    plant.iCount = plant.indices.length;

    console.log(plant);

    return plant;
}
