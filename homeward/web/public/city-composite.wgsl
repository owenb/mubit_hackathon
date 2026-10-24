@group(0) @binding(0) var city:texture_2d<f32>;
@group(0) @binding(1) var linear:sampler;
struct Out{@builtin(position) p:vec4<f32>,@location(0) uv:vec2<f32>}
@vertex fn vs(@builtin(vertex_index) i:u32)->Out {
 let p=vec2(f32((i<<1u)&2u),f32(i&2u));var o:Out;o.p=vec4(p*2.0-1.0,0,1);o.uv=vec2(p.x,1.0-p.y);return o;
}
@fragment fn fs(i:Out)->@location(0) vec4<f32> {
 let texel=1.0/vec2<f32>(textureDimensions(city));var c=textureSample(city,linear,i.uv).rgb;var glow=vec3(0.0);
 for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){
  let v=textureSample(city,linear,i.uv+vec2(f32(x),f32(y))*texel*2.5).rgb;
  glow+=max(v-vec3(0.65),vec3(0.0))*exp(-f32(x*x+y*y)*0.3);
 }}
 c+=glow*0.10;
 // SDR presentation of the preserved HDR city, with a small spatial bloom.
 c=vec3(1.0)-exp(-c*1.35);
 // egui native Rgba8Unorm textures contain gamma-encoded sRGB, not linear HDR.
 // Encode once here; egui handles conversion for the window's surface format.
 c=max(c,vec3(0.0));
 let srgb=select(1.055*pow(c,vec3(1.0/2.4))-0.055,12.92*c,c<=vec3(0.0031308));
 return vec4(srgb,1);
}
