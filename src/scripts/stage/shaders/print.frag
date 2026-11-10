// A print developing: blank paper -> 1-bit grain -> tones -> colour.
uniform sampler2D uTex;
uniform vec2 uSize;     // mesh size, CSS px
uniform vec2 uImage;    // natural image size
uniform float uReady;   // texture uploaded
uniform float uProgress;
uniform float uHover;
uniform float uPixel;
uniform float uSeed;
uniform vec3 uPaper;
uniform vec3 uInk;
in vec2 vUv;
out vec4 fragColor;

void main() {
  // Cover-fit, anchored to the top of the screenshot.
  float rs = uSize.x / uSize.y;
  float ri = uImage.x / uImage.y;
  vec2 scale = rs > ri ? vec2(1.0, ri / rs) : vec2(rs / ri, 1.0);
  vec2 iuv = vec2((vUv.x - 0.5) * scale.x + 0.5, (1.0 - vUv.y) * scale.y);
  vec3 img = mix(uPaper, texture(uTex, iuv).rgb, uReady);
  float lum = dot(img, vec3(0.299, 0.587, 0.114));

  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uSize;
  float n = valueNoise(px / 70.0 + uSeed) * 0.65 + valueNoise(px / 18.0 - uSeed) * 0.35;

  float front = uProgress * 1.55 - 0.3;
  float dev = smoothstep(0.0, 0.35, front - n * 0.55);
  float density = (1.0 - lum) * dev;
  float levels = mix(2.0, 36.0, smoothstep(0.4, 0.95, uProgress));
  float q = ditherQuantize(density, levels, gl_FragCoord.xy, uPixel);
  q = mix(q, density, smoothstep(0.93, 1.0, uProgress));
  vec3 bw = mix(uPaper, uInk, q);
  vec3 col = mix(bw, img, smoothstep(0.72, 1.0, uProgress));

  col *= 1.0 + uHover * 0.05;
  fragColor = vec4(col, 1.0);
}
