#version 100

precision mediump float;

attribute vec2 vertPos; //0
attribute vec2 aPos; //1
attribute vec2 bPos; //2
attribute float radius; //3
attribute vec4 color; //4

uniform vec2 viewport;
uniform mat3 matrix;

varying vec4 vColor;
varying vec2 vA;
varying vec2 vB;
varying float vRad;
varying vec2 vPos;

void main(void) {
  gl_Position = vec4(
                     ((vec3(vertPos, 1.0)*matrix*vec3(1.0, 1.0, 0.0))
                      *2.0/vec3(viewport, 1.0)) //pixel scale -> [-1,1] scale
                     *vec3(1.0, -1.0, 1.0),      //flip
                     1.0);

  vColor = color;
  vA = (vec3(aPos, 1.0)*matrix).xy;
  vB = (vec3(bPos, 1.0)*matrix).xy;
  vRad = radius;
  vPos = (vec3(vertPos, 1.0)*matrix).xy;
}
