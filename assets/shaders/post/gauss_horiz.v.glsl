#version 100

precision mediump float;

attribute vec2 vertPos;

uniform vec2 viewport;

varying vec2 texCoord;
varying vec2 blurTexCoords[14];

void main()
{
  gl_Position = vec4(vertPos, 0.0, 1.0);
  texCoord = vertPos/2.0 + vec2(0.5);

  vec2 rad = vec2(5)/viewport;
  
  blurTexCoords[ 0] = texCoord + vec2(0.0, -0.028)*rad;
  blurTexCoords[ 1] = texCoord + vec2(0.0, -0.024)*rad;
  blurTexCoords[ 2] = texCoord + vec2(0.0, -0.020)*rad;
  blurTexCoords[ 3] = texCoord + vec2(0.0, -0.016)*rad;
  blurTexCoords[ 4] = texCoord + vec2(0.0, -0.012)*rad;
  blurTexCoords[ 5] = texCoord + vec2(0.0, -0.008)*rad;
  blurTexCoords[ 6] = texCoord + vec2(0.0, -0.004)*rad;
  blurTexCoords[ 7] = texCoord + vec2(0.0,  0.004)*rad;
  blurTexCoords[ 8] = texCoord + vec2(0.0,  0.008)*rad;
  blurTexCoords[ 9] = texCoord + vec2(0.0,  0.012)*rad;
  blurTexCoords[10] = texCoord + vec2(0.0,  0.016)*rad;
  blurTexCoords[11] = texCoord + vec2(0.0,  0.020)*rad;
  blurTexCoords[12] = texCoord + vec2(0.0,  0.024)*rad;
  blurTexCoords[13] = texCoord + vec2(0.0,  0.028)*rad;
  // thanks, http://xissburg.com/faster-gaussian-blur-in-glsl/
}
