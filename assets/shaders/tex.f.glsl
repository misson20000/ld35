#version 100

precision lowp float;

varying vec2 vTexPos;
varying float vScale;
varying vec4 vColor;

uniform sampler2D tex;
uniform vec2 texres;

//#ifdef GL_OES_standard_derivatives
// basically calculates the lengths of (a.x, b.x) and (a.y, b.y) at the same time
vec2 v2len(in vec2 a, in vec2 b) {
  return sqrt(a*a+b*b);
}

// samples from a linearly-interpolated texture to produce an appearance similar to
// nearest-neighbor interpolation, but with resolution-dependent antialiasing
//
// this function's interface is exactly the same as texture2D's, aside from the 'res'
// parameter, which represents the resolution of the texture 'tex'.
vec4 textureBlocky(in sampler2D tex, in vec2 uv, in vec2 res) {
  uv *= res; // enter texel coordinate space.


  vec2 seam = floor(uv+.5); // find the nearest seam between texels.

  // here's where the magic happens. scale up the distance to the seam so that all
  // interpolation happens in a one-pixel-wide space.
  uv = (uv-seam)*vScale+seam;

  uv = clamp(uv, seam-.5, seam+.5); // clamp to the center of a texel.


  return texture2D(tex, uv/res, -1000.); // convert back to 0..1 coordinate space.
}


void main(void) {
  vec4 color = textureBlocky(tex, vTexPos, texres);
  //vec4 color = texture2D(tex, vTexPos);
  gl_FragColor = color;
}
