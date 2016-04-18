#version 100

precision mediump float;

uniform sampler2D tex;
uniform float gameTime;
uniform vec2 viewport;

varying vec2 texCoord;

void main() {
  vec2 sane = texCoord-vec2(0.5);
  float aRad = length(sane);
  float ang = atan(sane.y, sane.x) + clamp(aRad + sin(gameTime/1000.0)/10.0, 0.4, 1.0) - 0.4;
  float rad = aRad;
  gl_FragColor = texture2D(tex, vec2(rad*cos(ang), rad*sin(ang))+vec2(0.5));
}
