#version 100

precision mediump float;

uniform sampler2D tex;

varying vec2 texCoord;

void main() {
  gl_FragColor = texture2D(tex, texCoord) * vec4(0.6, 0.6, 1.0, 1.0);  
}
