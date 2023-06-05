
import {noise} from "./noise.js";
import {getShaderSource, createShader, createProgram} from "./webglutils.js";
import { Vector, Quad } from "./utils.js";

let canvas;
let gl;

let curves = [];
let quads = [];
let uvs = [];
let infos = [];

let aspects = [
    3/4,
    // 4/3,
]

let SCALE;
let ASPECT;
let EDGE_OFFSET;
let THICKNESS;

function main() {
    curves = [];
    quads = [];
    uvs = [];
    infos = [];
    
    SCALE = 4;
    ASPECT = aspects[Math.floor(prng.rand()*aspects.length)];
    EDGE_OFFSET = 50;
    if(ASPECT >= 1)
        EDGE_OFFSET = window.innerHeight*.15;
    EDGE_OFFSET = 0;
    THICKNESS = 70 * SCALE;
    THICKNESS = rand(10, 100) * SCALE;

    if(!canvas)
        canvas = document.getElementById("canvas");
    onresize(null);
    if(!gl)
        gl = canvas.getContext('webgl', {preserveDrawingBuffer: true, antialias: true});
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    setupCurves();
    constructQuads();

    render();
}

function render(){
    let fragmentCode = getShaderSource("frag.glsl");
    let vertexCode = getShaderSource("vert.glsl");

    let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexCode);
    let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentCode);

    let program = createProgram(gl, vertexShader, fragmentShader);

    gl.useProgram(program);
    let positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    let uvAttributeLocation = gl.getAttribLocation(program, "a_uv");
    let infoAttributeLocation = gl.getAttribLocation(program, "a_info");
    let resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
    let seedUniformLocation = gl.getUniformLocation(program, "u_seed");
    // let colorUniformLocation = gl.getUniformLocation(program, "u_color");

    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    let seed1 = prng.rand();
    let seed2 = prng.rand();
    let seed3 = prng.rand();
    gl.uniform3f(seedUniformLocation, seed1, seed2, seed3);

    let positionBuffer = gl.createBuffer();
    let uvBuffer = gl.createBuffer();
    let infoBuffer = gl.createBuffer();
    
    let type = gl.FLOAT;   // the data is 32bit floats
    let normalize = false; // don't normalize the data
    let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
    let offset = 0;        // start at the beginning of the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, quads, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, type, normalize, stride, offset);

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(uvAttributeLocation);
    gl.vertexAttribPointer(uvAttributeLocation, 2, type, normalize, stride, offset);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, infoBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, infos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(infoAttributeLocation);
    gl.vertexAttribPointer(infoAttributeLocation, 3, type, normalize, stride, offset);

    let framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.canvas.width, gl.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    gl.clearColor(0.898, 0.827, 0.675, 1);
    gl.clearColor(rand(.9, .93), rand(.9, .92), rand(.89, .91), 1);
    gl.clearColor(rand(.92, .93), rand(.92, .92), rand(.9, .91), 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    let numQuads = quads.length / 8;
    let numInfos = infos.length / 12;
    for(let i = 0; i < numQuads; i++) {
        const offset = i * 4; // 4 vertices per quad
        gl.uniform3f(seedUniformLocation, seed1, seed2, seed3*(infos[offset*3]%2==1));
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, 4);
    }

    let bgFragmentCode = getShaderSource("bgfrag.glsl");
    let bgVertexCode = getShaderSource("bgvert.glsl");

    let bgVertexShader = createShader(gl, gl.VERTEX_SHADER, bgVertexCode);
    let bgFragmentShader = createShader(gl, gl.FRAGMENT_SHADER, bgFragmentCode);

    let bgProgram = createProgram(gl, bgVertexShader, bgFragmentShader);

    gl.useProgram(bgProgram);
    const quadVertices = [
        -1, -1,
         1, -1,
        -1,  1,
         1,  1
    ];
    let backgroundPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, backgroundPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertices), gl.STATIC_DRAW);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);  // unbind the framebuffer

    // Now bind the texture and draw a screen-sized quad using your post-processing shader:
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Setup and draw your screen-sized quad
    let bgPositionAttributeLocation = gl.getAttribLocation(bgProgram, "a_position");
    let uTextureUniformLocation = gl.getUniformLocation(bgProgram, "u_texture");

    // Pass the texture to the shader
    
    gl.activeTexture(gl.TEXTURE0);
    // Now bind the texture and draw a screen-sized quad using your post-processing shader:
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Pass the texture to the shader
    gl.uniform1i(uTextureUniformLocation, 0);
    gl.uniform2f(gl.getUniformLocation(bgProgram, "u_resolution"), gl.canvas.width, gl.canvas.height);
    gl.uniform3f(gl.getUniformLocation(bgProgram, "u_seed"), prng.rand(), prng.rand(), prng.rand());

    let bgPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bgPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVertices), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(bgPositionAttributeLocation);
    gl.vertexAttribPointer(
        bgPositionAttributeLocation,
        2,           // number of components per vertex attribute
        gl.FLOAT,    // data type
        false,       // normalized
        0,           // stride, 0 = auto
        0            // start position in buffer
    );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function constructQuads(){
    for(let i = 0; i < curves.length; i++){
        let points = curves[i];
    
        let bounceVectors = [];
        bounceVectors.push(new Vector(points[1].x - points[0].x, points[1].y - points[0].y));
        for(let j = 1; j < points.length-1; j++){
            let vec1 = new Vector(points[j-1].x - points[j].x, points[j-1].y - points[j].y);
            let vec2 = new Vector(points[j+1].x - points[j].x, points[j+1].y - points[j].y);
            vec1.normalize();
            vec2.normalize();
            let bounceVec = new Vector(vec1.x + vec2.x, vec1.y + vec2.y);
            bounceVec.normalize();
            bounceVectors.push(bounceVec);
        }
        bounceVectors.push(new Vector(points[points.length-2].x - points[points.length-1].x, points[points.length-2].y - points[points.length-1].y));
    
        let leftAnchors = [];
        let rightAnchors = [];
        let bv = bounceVectors[0];
        bv.rotate(-Math.PI/2);
        bv.normalize();
        leftAnchors.push(new Vector(points[0].x + bv.x * THICKNESS, points[0].y + bv.y * THICKNESS));
        rightAnchors.push(new Vector(points[0].x - bv.x * THICKNESS, points[0].y - bv.y * THICKNESS));
        for(let j = 1; j < points.length-1; j++){
            let toprev = new Vector(points[j-1].x - points[j].x, points[j-1].y - points[j].y);
            toprev.normalize();
            if(j%2 == 0){
                bv = bounceVectors[j].clone();
                bv.normalize();
                let ddot = toprev.dot(bv);
                let angle = Math.acos(ddot);
                let fac = Math.sqrt(1 + Math.pow(Math.tan(angle), 2));
                bv.rotate(-Math.PI/2);
                leftAnchors.push(new Vector(points[j].x + bv.x * THICKNESS*fac, points[j].y + bv.y * THICKNESS*fac));
                rightAnchors.push(new Vector(points[j].x - bv.x * THICKNESS*fac, points[j].y - bv.y * THICKNESS*fac));
            }
            else{
                bv = bounceVectors[j].clone();
                bv.normalize();
                let ddot = toprev.dot(bv);
                let angle = Math.acos(ddot);
                let fac = Math.sqrt(1 + Math.pow(Math.tan(angle), 2));
                bv.rotate(+Math.PI/2);
                leftAnchors.push(new Vector(points[j].x + bv.x * THICKNESS*fac, points[j].y + bv.y * THICKNESS*fac));
                rightAnchors.push(new Vector(points[j].x - bv.x * THICKNESS*fac, points[j].y - bv.y * THICKNESS*fac));
            }
        }
        bv = bounceVectors[bounceVectors.length-1];
        if(bounceVectors.length%2 == 0)
            bv.rotate(+Math.PI/2);
        else
            bv.rotate(-Math.PI/2);
        bv.normalize();
        leftAnchors.push(new Vector(points[points.length-1].x + bv.x * THICKNESS, points[points.length-1].y + bv.y * THICKNESS));
        rightAnchors.push(new Vector(points[points.length-1].x - bv.x * THICKNESS, points[points.length-1].y - bv.y * THICKNESS));
    
        for(let j = 0; j < leftAnchors.length-1; j++){
            let p1 = leftAnchors[j];
            let p2 = rightAnchors[j];
            let p3 = leftAnchors[j+1];
            let p4 = rightAnchors[j+1];
            
            let p13 = new Vector(p3.x - p1.x, p3.y - p1.y);
            let p34 = new Vector(p4.x - p3.x, p4.y - p3.y);
            let p31 = new Vector(p1.x - p3.x, p1.y - p3.y);
            let p24 = new Vector(p4.x - p2.x, p4.y - p2.y);
            let p42 = new Vector(p2.x - p4.x, p2.y - p4.y);
            let aa = p13.length();
            let bb = p24.length();
            let avgdist = (aa + bb)/2;
            p13.normalize();
            p31.normalize();
            p24.normalize();
            p42.normalize();
            let p12 = new Vector(p2.x - p1.x, p2.y - p1.y);
            let dot1 = p12.dot(p13);
            let np1, np2, np3, np4, np5, np6, np7, np8;
            if(dot1 > 0.01){
                let om1 = dot1/aa;
                let a1 = p13.clone();
                a1.multiplyScalar(dot1);
                np1 = p1.clone();
                np4 = p2.clone();
                np3 = p1.clone().add(a1);
                np2 = p1.clone(); //.add(p2).multiplyScalar(.5);
                addquadpointstoattributes(np1, np2, np3, np4, [0, 0], [0, 1], [om1, 0], [om1, 1], avgdist, j);

                let dot2 = p34.dot(p31);
                if(dot2 > 0.01){
                    let om2 = 1.-dot2/aa;
                    let a1 = p31.clone();
                    a1.multiplyScalar(dot2);
                    np6 = p4.clone();
                    np7 = p3.clone();
                    np5 = p3.clone().add(a1);
                    np8 = p3.clone(); //.add(p4).multiplyScalar(.5);
                    addquadpointstoattributes(np5, np6, np7, np8, [om2, 0], [om2, 1], [1, 0], [1, 1], avgdist, j);
                }
                else if(dot2 < -0.01){
                    let om2 = 1.-dot2/bb;
                    let a1 = p42.clone();
                    a1.multiplyScalar(-dot2);
                    np5 = p3.clone();
                    np8 = p4.clone();
                    np6 = p4.clone().add(a1);
                    np7 = p4.clone(); //.add(p3).multiplyScalar(.5);
                    addquadpointstoattributes(np5, np6, np7, np8, [om2, 0], [om2, 1], [1, 0], [1, 1], avgdist, j);
                }
                else{
                    np5 = p3.clone();
                    np6 = p4.clone();
                }
                addquadpointstoattributes(np3, np4, np5, np6, [om1, 0], [om1, 1], [1, 0], [1, 1], avgdist, j);
            }
            else if(dot1 < -0.01){
                let om1 = -dot1/bb;
                let a1 = p24.clone();
                a1.multiplyScalar(-dot1);
                np2 = p2.clone();
                np3 = p1.clone();
                np4 = p2.clone().add(a1);
                np1 = p2.clone(); //.add(p1).multiplyScalar(.5);
                addquadpointstoattributes(np1, np2, np3, np4, [0, 0], [0, 1], [om1, 0], [om1, 1], avgdist, j);

                let dot2 = p34.dot(p31);
                if(dot2 > 0.01){
                    let om2 = 1.-dot2/aa;
                    let a1 = p31.clone();
                    a1.multiplyScalar(dot2);
                    np6 = p4.clone();
                    np7 = p3.clone();
                    np5 = p3.clone().add(a1);
                    np8 = p3.clone(); //.add(p4).multiplyScalar(.5);
                    addquadpointstoattributes(np5, np6, np7, np8, [om2, 0], [om2, 1], [1, 0], [1, 1], avgdist, j);
                }
                else if(dot2 < -0.01){
                    let om2 = 1.-dot2/bb;
                    let a1 = p42.clone();
                    a1.multiplyScalar(-dot2);
                    np5 = p3.clone();
                    np8 = p4.clone();
                    np6 = p4.clone().add(a1);
                    np7 = p4.clone(); //.add(p3).multiplyScalar(.5);
                    addquadpointstoattributes(np5, np6, np7, np8, [om2, 0], [om2, 1], [1, 0], [1, 1], avgdist, j);
                }
                else{
                    np5 = p3.clone();
                    np6 = p4.clone();
                }
                addquadpointstoattributes(np3, np4, np5, np6, [om1, 0], [om1, 1], [1, 0], [1, 1], avgdist, j);
            }
            else{
                np3 = p1.clone();
                np4 = p2.clone();let dot2 = p34.dot(p31);
                if(dot2 > 0.01){
                    let om2 = 1.-dot2/aa;
                    let a1 = p31.clone();
                    a1.multiplyScalar(dot2);
                    np6 = p4.clone();
                    np7 = p3.clone();
                    np5 = p3.clone().add(a1);
                    np8 = p3.clone(); //.add(p4).multiplyScalar(.5);
                    addquadpointstoattributes(np5, np6, np7, np8, [om2, 0], [om2, 1], [1, 0], [1, 1], avgdist, j);
                }
                else if(dot2 < -0.01){
                    let om2 = 1.-dot2/bb;
                    let a1 = p42.clone();
                    a1.multiplyScalar(-dot2);
                    np5 = p3.clone();
                    np8 = p4.clone();
                    np6 = p4.clone().add(a1);
                    np7 = p4.clone(); //.add(p3).multiplyScalar(.5);
                    addquadpointstoattributes(np5, np6, np7, np8, [om2, 0], [om2, 1], [1, 0], [1, 1], avgdist, j);
                }
                else{
                    np5 = p3.clone();
                    np6 = p4.clone();
                }
                addquadpointstoattributes(np3, np4, np5, np6, [0, 0], [0, 1], [1, 0], [1, 1], avgdist, j);
                // addquadpointstoattributes(p1, p2, p3, p4);
            }

            // addquadpointstoattributes(p1, p2, p3, p4);
        }
    }

    const flatten = arr => arr.reduce(
        (acc, val) => acc.concat(
            Array.isArray(val) ? flatten(val) : val
        ), []
    );

    quads = new Float32Array(flatten(quads));
    uvs = new Float32Array(flatten(uvs));
    infos = new Float32Array(flatten(infos));
}

function addquadpointstoattributes(p1, p2, p3, p4, uv1=[0,0], uv2=[0,1], uv3=[1,0], uv4=[1,1], avgdist=1., j=0){
    quads.push(
        [
            [p1.x, p1.y],
            [p2.x, p2.y],
            [p3.x, p3.y],
            [p4.x, p4.y],
        ]
    );

    uv1 = [uv1[0]*avgdist, uv1[1]*avgdist];
    uv2 = [uv2[0]*avgdist, uv2[1]*avgdist];
    uv3 = [uv3[0]*avgdist, uv3[1]*avgdist];
    uv4 = [uv4[0]*avgdist, uv4[1]*avgdist];

    let d1 = Math.sqrt(Math.pow(p1.x - p3.x, 2) + Math.pow(p1.y - p3.y, 2));
    let d2 = Math.sqrt(Math.pow(p2.x - p4.x, 2) + Math.pow(p2.y - p4.y, 2));
    let d3 = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    uvs.push(
        [
            uv1,
            uv2,
            uv3,
            uv4,
        ]
    );
    let seed = j;
    infos.push(
        [
            [seed, seed, seed],
            [seed, seed, seed],
            [seed, seed, seed],
            [seed, seed, seed],
        ]
    );
}

function rand(a, b){
    return a + prng.rand()*(b-a);
}

function map(value, min1, max1, min2, max2){
    return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

function resample(curve){
    let newCurve = [];
    for(let i = 0; i < curve.length-1; i++){
        let p1 = curve[i];
        let p2 = curve[i+1];
        let d = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
        let num = Math.round(d/THICKNESS)+1;
        for(let j = 0; j < num; j++){
            let t = j/num;
            let x = p1.x + t*(p2.x - p1.x);
            let y = p1.y + t*(p2.y - p1.y);
            newCurve.push(new Vector(x, y));
        }
    }
    newCurve.push(curve[curve.length-1]);
    return newCurve;
}

function intersects(point, curve){
    if(curve.length < 2)
        return false;
    let resampled = resample(curve);

    for(let i = 0; i < resampled.length; i++){
        let d = point.distance(resampled[i]);
        if(d < THICKNESS*2)
            return true;
    }
    return false;
}

function setupCurves(){

    let success = false;
    let ctries = 0;
    let curve = [];
    let pathsteps = Math.round(rand(2, 6))*2;
    while(!success && ctries++ < 100){
        let pos = new Vector(canvas.width/2 + rand(-222, 222), canvas.height/2 + rand(-222, 222));
        let direction0 = new Vector(rand(-1, 1), rand(-1, 1));
        direction0.normalize();

        curve = [];
        let center = new Vector(canvas.width/2, canvas.height/2);

        let margin = canvas.width*.07;
        let sumpoints = new Vector(0, 0);
        curve.push(pos);
        sumpoints.add(pos);
        for(let i = 0; i < pathsteps; i++){
            let direction = direction0.clone();
            direction.rotate(map(power(rand(0, 1), 3), 0, 1, Math.PI/2, Math.PI*3/2));
            direction.normalize();
            direction.multiplyScalar(SCALE*rand(400, 1400)*.5);
            let newPos = new Vector(pos.x + direction.x, pos.y + direction.y);
            let tries = 0;
            while(tries++ < 130 && (newPos.x < margin || newPos.x > canvas.width-margin || newPos.y < margin || newPos.y > canvas.height-margin || intersects(newPos, curve))){
                direction = direction0.clone();
                direction.rotate(map(power(rand(0, 1), 3), 0, 1, Math.PI/2, Math.PI*3/2));
                direction.normalize();
                direction.multiplyScalar(SCALE*rand(400, 1400)*.5);
                newPos = new Vector(pos.x + direction.x, pos.y + direction.y);
            }
            direction0 = direction.clone();
            pos = newPos;
            curve.push(newPos);
            sumpoints.add(newPos);
        }
        sumpoints.multiplyScalar(1/(pathsteps+1));
        for(let i = 0; i < curve.length; i++){
            curve[i].sub(sumpoints);
            curve[i].add(center);
        }

        success = true;
        for(let i = 0; i < curve.length; i++){
            let newPos = curve[i];
            if(newPos.x < margin || newPos.x > canvas.width-margin || newPos.y < margin || newPos.y > canvas.height-margin){
                success = false;
                break;
            }
        }
    }

    curves.push(curve);
}

function hsvToRgb(h, s, v) {
    let r, g, b;
    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f*s);
    let t = v * (1 - (1 - f) * s);
    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return [Math.floor(r*255), Math.floor(g*255), Math.floor(b*255)];
}

function handleWindowSize(){
    let clientWidth = window.innerWidth;
    let clientHeight = window.innerHeight;
    let caspect = (clientWidth-EDGE_OFFSET*2)/(clientHeight-EDGE_OFFSET*2);
    let aspect = ASPECT;
    let sw, sh;
    if(caspect > aspect){
        sh = Math.round(clientHeight) - EDGE_OFFSET*2;
        sw = Math.round(sh * aspect);
    }else{
        sw = Math.round(clientWidth) - EDGE_OFFSET*2;
        sh = Math.round(sw / aspect);
    }
    canvas.width = sw*SCALE;
    canvas.height = sh*SCALE;
    canvas.style.width = sw + 'px';
    canvas.style.height = sh + 'px';
    canvas.style.position = 'absolute';
    canvas.style.left = clientWidth/2 - sw/2 + 'px';
    canvas.style.top = clientHeight/2 - sh/2 + 'px';
}

function onresize(event){
    // // set width and height, full screen
    // canvas.width = window.innerWidth*SCALE;
    // canvas.height = window.innerHeight*SCALE;
    // canvas.style.width = window.innerWidth + "px";
    // canvas.style.height = window.innerHeight + "px";
    handleWindowSize();
}

function power(p, g) {
    if (p < 0.5)
        return 0.5 * Math.pow(2*p, g);
    else
        return 1 - 0.5 * Math.pow(2*(1 - p), g);
}

// on load html, no jquery
window.onload = main;
window.addEventListener('resize', onresize, false);

// handle keys
document.addEventListener('keydown', function(event) {
    if(event.key == 'q') {
        main();
    }
    if(event.key == 's') {
        save();
    }
});


function save(){
    console.log('preparing canvas for saving...');
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'render.png';
    // link.href = imgElement.src;
    link.href = dataURL;
    link.click();
}