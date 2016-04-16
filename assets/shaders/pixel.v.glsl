#version 100

precision mediump float;

attribute vec2 vertPos; //0
attribute vec2 texPos; //1
attribute float scale; //2
attribute vec3 color; //3

uniform vec2 viewport;
uniform mat3 matrix;

varying vec2 vTexPos;
varying float vScale;
varying vec3 vColor;

void main(void) {
  gl_Position = vec4(
                     ((vec3(vertPos, 1.0)*matrix*vec3(1.0, 1.0, 0.0))
                      *2.0/vec3(viewport, 1.0)) //pixel scale -> [-1,1] scale
                     *vec3(1.0, -1.0, 1.0),      //flip
                     1.0);

  vTexPos = texPos;
  vScale = scale;
  vColor = color;
}
