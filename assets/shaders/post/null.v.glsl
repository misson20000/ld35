#version 100

precision mediump float;

attribute vec2 vertPos;

uniform vec2 viewport;

varying vec2 texCoord;

void main()
{
  gl_Position = vec4(vertPos, 0.0, 1.0);
  texCoord = vertPos/2.0 + vec2(0.5);
}
