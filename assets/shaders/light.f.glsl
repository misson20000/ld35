#version 100

precision lowp float;

varying vec4 vColor;
varying vec2 vA;
varying vec2 vB;
varying float vRad;
varying vec2 vPos;

float dist(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa,ba)/dot(ba,ba), 0.0, 1.0);
  return length(pa - ba*h);
}

void main(void) {
  vec4 color = vec4(vColor.a * vColor.rgb, clamp(1.0-(dist(vPos, vA, vB)/vRad), 0.0, 1.0));
  gl_FragColor = vec4(color.rgb * color.a, color.a);
}
