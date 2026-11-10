// The old hero's wave field, rendered at quarter resolution.
// Stored halved so it fits an 8-bit target (values reach ~1.6).
uniform vec2 uRes;
uniform float uTime;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec2 uv = vUv - 0.5;
  uv.x *= uRes.x / uRes.y;
  float f = pattern(uv, uTime);
  fragColor = vec4(f * 0.5, 0.0, 0.0, 1.0);
}
