#version 100

precision lowp float;

varying vec4 vColor;

void main(void) {
  gl_FragColor = vColor;
}
