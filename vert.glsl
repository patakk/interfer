attribute vec2 a_position;
attribute vec2 a_uv;
attribute float a_info;
attribute float a_angle;
attribute vec3 a_diffuse;

// attribute vec3 a_transform;

uniform vec2 u_resolution;
uniform vec2 u_simulation;
uniform vec3 u_seed;

varying vec2 v_uv;
varying float v_info;
varying float v_angle;
varying vec3 v_diffuse;

void main() {
    vec2 position = (a_position) / u_simulation * 2. - 1.;

    gl_PointSize = 10.0;
    gl_Position = vec4(position*1., 0, 1);
    v_uv = a_uv;
    v_info = a_info;
    v_angle = a_angle;
    v_diffuse = a_diffuse;
}