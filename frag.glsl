precision mediump float;

uniform vec3 u_seed;
uniform vec2 u_resolution;

varying vec2 v_uv;
varying float v_info;
varying float v_angle;
varying vec3 v_diffuse;
uniform float u_postproc;

uniform sampler2D u_randomTexture;
uniform vec2 u_randomTextureSize;

#define NUM_OCTAVES 8

vec4 hcrandom(vec3 co) {
    // Map the coordinates to the range [0, 1] so we can use them to sample the texture.
    vec2 uv = fract(co.xy+co.z*1.13141);

    // Sample the texture and return a random value in the range [0, 1].
    return texture2D(u_randomTexture, uv).rgba;
}


float hash12(vec2 p)
{
	return hcrandom(vec3(p, 0.)*1013.31).r;
}

float noise (vec2 _st) {
    vec2 i = floor(_st);
    vec2 f = fract(_st);

    // Four corners2D of a tile
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

float noise3(vec2 _st,float t) {
    vec2 i = floor(_st+t);
    vec2 f = fract(_st+t);

    // Four corners2D of a tile
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

float fbm(vec2 _st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(_st);
        _st = rot * _st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}


vec3 random3(vec3 c) {
	return hcrandom(c).rgb;
}

// vec3 random3(vec3 c) {
// 	float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
// 	vec3 r;
// 	r.z = fract(512.0*j);
// 	j *= .125;
// 	r.x = fract(512.0*j);
// 	j *= .125;
// 	r.y = fract(512.0*j);
// 	return r-0.5;
// }


const float F3 =  0.3333333;
const float G3 =  0.1666667;

float simplex3d(vec3 p) {
	 vec3 s = floor(p + dot(p, vec3(F3)));
	 vec3 x = p - s + dot(s, vec3(G3));
	 vec3 e = step(vec3(0.0), x - x.yzx);
	 vec3 i1 = e*(1.0 - e.zxy);
	 vec3 i2 = 1.0 - e.zxy*(1.0 - e);
	 vec3 x1 = x - i1 + G3;
	 vec3 x2 = x - i2 + 2.0*G3;
	 vec3 x3 = x - 1.0 + 3.0*G3;
	 vec4 w, d;
	 w.x = dot(x, x);
	 w.y = dot(x1, x1);
	 w.z = dot(x2, x2);
	 w.w = dot(x3, x3);
	 w = max(0.6 - w, 0.0);
	 d.x = dot(random3(s), x);
	 d.y = dot(random3(s + i1), x1);
	 d.z = dot(random3(s + i2), x2);
	 d.w = dot(random3(s + 1.0), x3);
	 w *= w;
	 w *= w;
	 d *= w;
	 return .5+.5*dot(d, vec4(52.0));
}

float power(float p, float g) {
    if (p < 0.5)
        return 0.5 * pow(2.*p, g);
    else
        return 1. - 0.5 * pow(2.*(1. - p), g);
}
float fbm3 (vec2 _st, float t) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    // Rotate to reduce axial bias
    mat2 rot = mat2(cos(0.5), sin(0.5),
                    -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise3(_st, t);
        _st = rot * _st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

float rand(vec2 co){
    float r1 = fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
    float r2 = fract(sin(dot(co.xy + .4132, vec2(12.9898,78.233))) * 43758.5453);
    float r3 = fract(sin(dot(co.xy + vec2(r1, r2),vec2(12.9898, 78.233))) * 43758.5453);
    return r1;
}

vec3 rgb2xyz( vec3 c ) {
    vec3 tmp;
    tmp.x = ( c.r > 0.04045 ) ? pow( ( c.r + 0.055 ) / 1.055, 2.4 ) : c.r / 12.92;
    tmp.y = ( c.g > 0.04045 ) ? pow( ( c.g + 0.055 ) / 1.055, 2.4 ) : c.g / 12.92,
    tmp.z = ( c.b > 0.04045 ) ? pow( ( c.b + 0.055 ) / 1.055, 2.4 ) : c.b / 12.92;
    return 100.0 * tmp *
        mat3( 0.4124, 0.3576, 0.1805,
              0.2126, 0.7152, 0.0722,
              0.0193, 0.1192, 0.9505 );
}

vec3 xyz2lab( vec3 c ) {
    vec3 n = c / vec3( 95.047, 100, 108.883 );
    vec3 v;
    v.x = ( n.x > 0.008856 ) ? pow( n.x, 1.0 / 3.0 ) : ( 7.787 * n.x ) + ( 16.0 / 116.0 );
    v.y = ( n.y > 0.008856 ) ? pow( n.y, 1.0 / 3.0 ) : ( 7.787 * n.y ) + ( 16.0 / 116.0 );
    v.z = ( n.z > 0.008856 ) ? pow( n.z, 1.0 / 3.0 ) : ( 7.787 * n.z ) + ( 16.0 / 116.0 );
    return vec3(( 116.0 * v.y ) - 16.0, 500.0 * ( v.x - v.y ), 200.0 * ( v.y - v.z ));
}

vec3 rgb2lab(vec3 c) {
    vec3 lab = xyz2lab( rgb2xyz( c ) );
    return vec3( lab.x / 100.0, 0.5 + 0.5 * ( lab.y / 127.0 ), 0.5 + 0.5 * ( lab.z / 127.0 ));
}

vec3 lab2xyz( vec3 c ) {
    float fy = ( c.x + 16.0 ) / 116.0;
    float fx = c.y / 500.0 + fy;
    float fz = fy - c.z / 200.0;
    return vec3(
         95.047 * (( fx > 0.206897 ) ? fx * fx * fx : ( fx - 16.0 / 116.0 ) / 7.787),
        100.000 * (( fy > 0.206897 ) ? fy * fy * fy : ( fy - 16.0 / 116.0 ) / 7.787),
        108.883 * (( fz > 0.206897 ) ? fz * fz * fz : ( fz - 16.0 / 116.0 ) / 7.787)
    );
}

vec3 xyz2rgb( vec3 c ) {
    vec3 v =  c / 100.0 * mat3( 
        3.2406, -1.5372, -0.4986,
        -0.9689, 1.8758, 0.0415,
        0.0557, -0.2040, 1.0570
    );
    vec3 r;
    r.x = ( v.r > 0.0031308 ) ? (( 1.055 * pow( v.r, ( 1.0 / 2.4 ))) - 0.055 ) : 12.92 * v.r;
    r.y = ( v.g > 0.0031308 ) ? (( 1.055 * pow( v.g, ( 1.0 / 2.4 ))) - 0.055 ) : 12.92 * v.g;
    r.z = ( v.b > 0.0031308 ) ? (( 1.055 * pow( v.b, ( 1.0 / 2.4 ))) - 0.055 ) : 12.92 * v.b;
    return r;
}

vec3 lab2rgb(vec3 c) {
    return xyz2rgb( lab2xyz( vec3(100.0 * c.x, 2.0 * 127.0 * (c.y - 0.5), 2.0 * 127.0 * (c.z - 0.5)) ) );
}

vec3 goodmix(vec3 rgb1, vec3 rgb2, float p){
    // vec3 lab1 = rgb2lab(rgb1);
    // vec3 lab2 = rgb2lab(rgb2);
    // vec3 lab = mix(lab1, lab2, p);
    // vec3 rgb = lab2rgb(lab);
    return mix(rgb1, rgb2, p);
}


vec3 hardMixBlend(vec3 col1, vec3 col2) {
    vec3 result;
    result.r = (col1.r < (1.0 - col2.r)) ? 0.0 : 1.0;
    result.g = (col1.g < (1.0 - col2.g)) ? 0.0 : 1.0;
    result.b = (col1.b < (1.0 - col2.b)) ? 0.0 : 1.0;
    return result;
}

void main() {

    // vec3 result = vec3(1.);

    // if(mod(v_info, 2.) == 0.){
    //     result = vec3(0.);
    // }
    // else{
    //     if(mod(v_info, 3.) == 0.){
    //         result = vec3(1., 0., 0.);
    //     }
    //     if(mod(v_info, 3.) == 1.){
    //         result = vec3(0., 1., 0.);
    //     }
    // }
    
    // if(mod(v_info, 3.) == 0.){
    //     result = vec3(1., 0., 0.);
    // }
    // if(mod(v_info, 3.) == 1.){
    //     result = vec3(0., 1., 0.);
    // }
    // if(mod(v_info, 3.) == 2.){
    //     result = vec3(0., 0., 1.);
    // }
    // if(mod(v_info, 6.) == 0.){
    //     result = vec3(0., 0., 0.);
    // }

    // gl_FragColor = vec4(vec3(result.r, result.g, result.b), 1.0);  // RGBA, purple color

    gl_FragColor = vec4(v_diffuse.rgb, 1.0);
}