// The hero: a sheet of paper developing in a tray of liquid.
uniform sampler2D uState;   // ripple height field
uniform sampler2D uField;   // old wave field (latent noise)
uniform sampler2D uLatent;  // the latent image, in sheet space (y down)
uniform vec2 uSize;         // plane size, CSS px
uniform vec2 uSimTexel;
uniform vec4 uSheet;        // centre.xy (px from plane top-left), size.xy (px)
uniform float uAngle;       // radians, CSS sense (clockwise positive)
uniform float uProgress;    // 0 = blank paper, 1 = fully developed
uniform float uPixel;       // dither cell, device px
uniform vec3 uBg;
uniform vec3 uPageBg;     // the page colour the tray fades into
uniform vec3 uPaper;
uniform vec3 uInk;
uniform vec3 uLight;
uniform float uLightAmt;
uniform float uGlow;
uniform float uFog;
uniform float uVignette;
uniform float uShadow;
in vec2 vUv;
out vec4 fragColor;

void main() {
  vec2 px = vec2(vUv.x, 1.0 - vUv.y) * uSize;

  // Liquid surface.
  float hL = texture(uState, vUv - vec2(uSimTexel.x, 0.0)).r;
  float hR = texture(uState, vUv + vec2(uSimTexel.x, 0.0)).r;
  float hD = texture(uState, vUv - vec2(0.0, uSimTexel.y)).r;
  float hU = texture(uState, vUv + vec2(0.0, uSimTexel.y)).r;
  vec2 grad = vec2(hR - hL, hU - hD);
  vec3 normal = normalize(vec3(-grad * 3.0, 1.0));
  vec2 rpx = px + vec2(grad.x, -grad.y) * 18.0; // refraction

  // Sheet space.
  vec2 rel = rpx - uSheet.xy;
  float ca = cos(uAngle);
  float sa = sin(uAngle);
  vec2 local = vec2(ca * rel.x + sa * rel.y, -sa * rel.x + ca * rel.y);
  vec2 suv = local / uSheet.zw + 0.5;
  vec2 edge = min(suv, 1.0 - suv) * uSheet.zw; // px to the nearest edge (negative outside)
  float edgeDist = min(edge.x, edge.y);
  float inside = smoothstep(-0.75, 0.75, edgeDist);

  // Development: the latent image appears first where the old wave field is dense.
  float latent = texture(uLatent, clamp(suv, 0.0, 1.0)).r;
  vec2 fuv = rpx / uSize;
  float field = texture(uField, vec2(fuv.x, 1.0 - fuv.y)).r * 2.0;
  float front = uProgress * 1.7 - 0.35;
  float dev = smoothstep(0.0, 0.4, front - (1.0 - clamp(field * 0.8, 0.0, 1.0)) * 0.55);
  float density = latent * dev;
  float fog = smoothstep(0.35, 1.3, field) * uFog * (1.0 - smoothstep(0.5, 1.0, uProgress));
  density = clamp(max(density, fog), 0.0, 1.0);

  float levels = mix(2.0, 28.0, smoothstep(0.5, 1.0, uProgress));
  float q = ditherQuantize(density, levels, gl_FragCoord.xy, uPixel);
  q = mix(q, density, smoothstep(0.96, 1.0, uProgress));

  float fibre = valueNoise(local * 0.35) * 0.5 + valueNoise(local * 1.4) * 0.5;
  vec3 paper = uPaper * (0.955 + 0.045 * fibre);
  vec3 sheet = mix(paper, uInk, q);

  // Tray: dark liquid with a soft contact shadow around the sheet.
  vec2 shadowUv = (local - vec2(0.0, 22.0)) / uSheet.zw + 0.5; // cast downward, light from above
  vec2 shadowEdge = min(shadowUv, 1.0 - shadowUv) * uSheet.zw;
  float shadow = smoothstep(-64.0, 12.0, min(shadowEdge.x, shadowEdge.y)) * uShadow;
  vec3 tray = uBg * (1.0 - shadow * (1.0 - inside));
  vec3 col = mix(tray, sheet, inside);

  // Light caught by the ripples.
  vec3 lightDir = normalize(vec3(-0.35, 0.55, 0.76));
  float slope = clamp(length(grad) * 40.0, 0.0, 1.0);
  float spec = pow(max(dot(normal, lightDir), 0.0), 80.0);
  col += uLight * spec * uLightAmt * slope;
  col *= 1.0 + normal.y * 0.08 * slope;

  // Safelight glow from above, and a vignette.
  vec2 g = (px - vec2(uSize.x * 0.5, -uSize.y * 0.3)) / uSize.y;
  col += uLight * exp(-dot(g, g) * 2.0) * 0.16 * uGlow;
  vec2 v = (px / uSize - 0.5) * vec2(1.0, 1.15);
  col *= 1.0 - uVignette * smoothstep(0.35, 0.95, length(v));

  // Fade into the page at the bottom so the tray has no hard edge.
  col = mix(col, uPageBg, smoothstep(0.8, 1.0, px.y / uSize.y) * (1.0 - inside));

  fragColor = vec4(col, 1.0);
}
