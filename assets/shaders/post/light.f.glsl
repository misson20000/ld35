#version 100

precision mediump float;

uniform sampler2D diffuse;
uniform sampler2D light;
uniform float gameTime;
uniform vec2 viewport;

varying vec2 texCoord;

void main() {
  //gl_FragColor = texture2D(light, texCoord);
  gl_FragColor = texture2D(diffuse, texCoord) * texture2D(light, texCoord);
}
