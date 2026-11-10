// Height-field water: r = current height, g = previous height.
uniform sampler2D uState;
uniform vec2 uTexel;
uniform float uAspect;
uniform vec2 uMouse;
uniform vec2 uMousePrev;
uniform float uMouseForce;
uniform vec3 uDrop; // xy = uv, z = strength
uniform float uDropRadius;
uniform float uDamping;
in vec2 vUv;
out vec4 fragColor;

float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec4 s = texture(uState, vUv);
  float n = texture(uState, vUv + vec2(0.0, uTexel.y)).r;
  float so = texture(uState, vUv - vec2(0.0, uTexel.y)).r;
  float e = texture(uState, vUv + vec2(uTexel.x, 0.0)).r;
  float w = texture(uState, vUv - vec2(uTexel.x, 0.0)).r;

  float h = (n + so + e + w) * 0.5 - s.g;
  h *= uDamping;

  vec2 aspect = vec2(uAspect, 1.0);
  float d = segmentDistance(vUv * aspect, uMousePrev * aspect, uMouse * aspect);
  h += uMouseForce * smoothstep(0.02, 0.0, d);

  float dd = length((vUv - uDrop.xy) * aspect);
  h += uDrop.z * smoothstep(uDropRadius, 0.0, dd);

  fragColor = vec4(h, s.r, 0.0, 1.0);
}
