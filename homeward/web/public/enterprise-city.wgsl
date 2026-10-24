// Aether's london.metal, ported to WGSL for wgpu's Metal backend.
diagnostic(off, derivative_uniformity);
struct Uniform { mvp:mat4x4<f32>, eye:vec4<f32>, style:vec4<f32>,sun:vec4<f32>,sky:vec4<f32>,haze:vec4<f32>,inverse:mat4x4<f32> }
@group(0) @binding(0) var<uniform> u:Uniform;
struct Out {
 @builtin(position) position:vec4<f32>, @location(0) world:vec3<f32>,
 @location(1) normal:vec3<f32>, @location(2) @interpolate(flat) material:u32,
 @location(3) side:f32, @location(4) @interpolate(flat) info:f32
}
@vertex fn vs(@location(0) pos:vec3<f32>,@location(1) normal:vec3<f32>,@location(2) material:u32,@location(3) seed:f32)->Out {
 var o:Out; o.position=u.mvp*vec4(pos,1);o.world=pos;o.normal=normal;
 o.material=material&15u;o.side=f32((material>>4u)&1u);o.info=f32(material>>8u);return o;
}
fn hash(p0:vec2<f32>)->f32 {var p=fract(p0*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
fn key(i:Out)->f32 {let k=select(floor(i.world.y*10.0+0.5),i.info,i.material==1u);return hash(vec2(k*0.0137+0.31,f32(i.material)*0.731+0.17));}
fn night(i:Out)->vec3<f32> {
 let n=normalize(i.normal);let hv=key(i);let moon=max(0.0,dot(n,normalize(vec3(-0.45,0.83,0.35))));
 let px=max(length(fwidth(i.world)),0.001);var c=vec3(0.0);
 switch i.material {
 case 0u:{c=vec3(0.030,0.038,0.062)*(0.7+0.3*moon)*(0.9+0.2*hv);}
 case 7u:{let hue=u32(hv*3.0)%3u;var wash=vec3(0.25,0.85,0.75);if hue==0u {wash=vec3(0.20,0.55,0.95);}else if hue==1u{wash=vec3(0.55,0.35,0.95);}c=vec3(0.03,0.035,0.06)*(0.7+0.3*moon)+wash*0.07;}
 case 1u:{
  let top=i.info*0.1;let t=normalize(vec3(n.z,0.0,-n.x));let cell=vec2(dot(i.world,t)/2.6,i.world.y/3.4);
  let id=floor(cell);let f=fract(cell);let aa=max(fwidth(cell),vec2(0.0001));
  let window_box=smoothstep(vec2(0.18,0.26)-aa,vec2(0.18,0.26)+aa,f)*(1.0-smoothstep(vec2(0.82,0.74)-aa,vec2(0.82,0.74)+aa,f));
  let occupancy=0.14+0.30*hv;let lit=step(hash(id+hv*97.0),occupancy);let k=hash(id.yx+hv*31.0+7.0);
  var tone=vec3(1.0,0.35,0.8);if k<0.62{tone=vec3(1.0,0.70,0.40);}else if k<0.92{tone=vec3(0.72,0.86,1.0);}else if k<0.96{tone=vec3(0.25,0.9,1.0);}
  let window=tone*(1.1+1.3*hash(id*1.7+3.0))*lit*window_box.x*window_box.y;
  let mean=vec3(0.95,0.78,0.6)*occupancy*0.31*1.2;let detail=smoothstep(2.0,5.0,1.0/max(aa.x,aa.y));
  let clear=smoothstep(0.8,1.6,top-i.world.y)*step(1.0,i.world.y);
  let glass=mix(vec3(0.008,0.012,0.026),vec3(0.022,0.032,0.062),i.side)*(0.8+0.3*moon);
  c=glass+mix(mean,window,detail)*clear;
  let neon=(1.0-smoothstep(0.0,max(0.35,1.3*px),top-i.world.y))*smoothstep(10.0,30.0,top);
  let hue=u32(hv*4.0)%4u;var ink=vec3(1.0,0.6,0.2);if hue==0u{ink=vec3(0.15,0.85,1.0);}else if hue==1u{ink=vec3(1.0,0.25,0.75);}else if hue==2u{ink=vec3(0.55,0.4,1.0);}
  c+=ink*4.0*neon;c+=vec3(0.55,0.30,0.12)*0.10*(1.0-smoothstep(0.0,9.0,i.world.y));
 }
 case 2u:{let v=normalize(u.eye.xyz-i.world);c=mix(vec3(0.004,0.012,0.028),vec3(0.05,0.08,0.17),pow(1.0-clamp(v.y,0.0,1.0),4.0));}
 case 3u:{c=vec3(0.004,0.018,0.014)+vec3(0.02,0.16,0.10)*0.06;}
 case 4u,5u,6u:{
  let across=1.0-abs(2.0*i.side-1.0);let core=mix(across*across,1.0/3.0,smoothstep(0.25,0.6,fwidth(i.side)));var light=vec3(0.0);
  if i.material==5u{light=vec3(0.2,0.8,1.0)*1.3;}else if i.material==6u{light=vec3(0.75,0.88,1.0)*2.4;}else if i.info<2.5{light=vec3(1.0,0.55,0.18)*(2.4-0.5*i.info);}else{light=vec3(0.35,0.5,0.85)*(0.55-0.08*(i.info-3.0));}
  c=vec3(0.016,0.02,0.034)+light*core;
 }
 default:{let g=i.world.xz/100.0;let d=abs(fract(g-0.5)-0.5)/max(fwidth(g),vec2(0.0001));let line=1.0-min(min(d.x,d.y),1.0);let near=1.0-smoothstep(u.eye.w*0.5,u.eye.w*1.8,length(i.world-u.eye.xyz));c=vec3(0.008,0.011,0.022)+vec3(0.10,0.35,0.65)*0.18*line*near;}
 }
 return mix(c,select(vec3(0.045,0.028,0.10),u.haze.rgb,u.style.w>0.5),smoothstep(u.eye.w*0.6,u.eye.w*2.4,length(i.world-u.eye.xyz))*0.55);
}
fn daylight(i:Out,chalk:bool)->vec3<f32> {var c=vec3(0.0);var light=0.0;
 switch i.material {
 case 0u:{c=select(vec3(0.35,0.31,0.23),vec3(0.80,0.77,0.66),chalk);}
 case 1u:{c=select(vec3(0.21,0.25,0.26),vec3(0.58,0.62,0.62),chalk);}
 case 2u:{c=select(vec3(0.012,0.052,0.068),vec3(0.06,0.18,0.24),chalk);}
 case 3u:{c=select(vec3(0.033,0.12,0.083),vec3(0.10,0.24,0.14),chalk);}
 case 4u:{c=select(vec3(0.43,0.33,0.19),vec3(0.24,0.29,0.28),chalk);light=select(0.16,0.0,chalk);}
 case 5u:{c=select(vec3(0.14,0.23,0.25),vec3(0.31,0.34,0.34),chalk);}
 case 6u:{c=select(vec3(0.55,0.43,0.25),vec3(0.58,0.54,0.42),chalk);light=select(0.18,0.0,chalk);}
 case 7u:{c=select(vec3(0.55,0.45,0.26),vec3(0.82,0.75,0.60),chalk);}
 default:{c=select(vec3(0.022,0.035,0.04),vec3(0.33,0.38,0.35),chalk);}
 }
 let diffuse=max(0.0,dot(normalize(i.normal),normalize(select(vec3(-0.45,0.83,0.35),u.sun.xyz,u.style.w>0.5))));
 c*=(1.0+(key(i)-0.5)*0.15)*select(0.38+0.62*diffuse,0.58+0.42*diffuse,chalk);c+=light*c;
 if i.material==1u{c*=0.70+0.30*smoothstep(0.0,18.0,i.world.y);}
 let haze=smoothstep(u.eye.w*0.65,u.eye.w*2.3,length(i.world-u.eye.xyz))*select(0.35,0.15,chalk);
 return mix(c,select(select(vec3(0.025,0.045,0.055),vec3(0.33,0.38,0.36),chalk),u.haze.rgb,u.style.w>0.5),haze);
}

@fragment fn fs(i:Out)->@location(0) vec4<f32> {
 if u.style.w<0.5 {if u.style.x<0.5{return vec4(night(i),1.0);}return vec4(daylight(i,u.style.x<1.5),1.0);}
 let dark=night(i)*(1.0-0.60*u.style.y);
 var light=mix(daylight(i,false),daylight(i,true),u.style.z);
 light*=mix(vec3(1.0),vec3(1.18,0.90,0.72),u.sky.y*0.22);
 return vec4(mix(dark,light,u.sky.x),1.0);
}
struct SkyOut { @builtin(position) position:vec4<f32>, @location(0) uv:vec2<f32> }
@vertex fn sky_vs(@builtin(vertex_index) i:u32)->SkyOut {
 let p=vec2(f32((i<<1u)&2u),f32(i&2u));var o:SkyOut;o.position=vec4(p*2.0-1.0,0.0,1.0);o.uv=vec2(p.x,1.0-p.y);return o;
}
@fragment fn sky_fs(i:SkyOut)->@location(0) vec4<f32> {
 let far=u.inverse*vec4(i.uv.x*2.0-1.0,1.0-i.uv.y*2.0,0.0001,1.0);
 let ray=normalize(far.xyz/far.w-u.eye.xyz);
 let height=clamp(ray.y,0.0,1.0);let clean=u.style.z;
 let night=mix(vec3(0.017,0.012,0.045),vec3(0.003,0.005,0.016),height)*(1.0-0.95*u.style.y);
 let blue=mix(vec3(0.56,0.70,0.82),vec3(0.10,0.27,0.53),sqrt(height));
 var c=mix(night,blue,u.sky.x);
 let horizon=exp(-height*height*30.0);
 let towards=pow(max(0.0,dot(normalize(vec3(ray.x,0.0,ray.z)),normalize(vec3(u.sun.x,0.0,u.sun.z)))),8.0);
 c+=vec3(0.70,0.22,0.055)*u.sky.y*horizon*(0.25+0.75*towards);
 let uv=vec2(atan2(ray.x,ray.z)/6.2831853,asin(clamp(ray.y,-1.0,1.0))/3.1415926)*vec2(900.0,450.0);
 let cell=floor(uv);let point=fract(uv)-vec2(hash(cell+1.0),hash(cell+7.0));
 let star=step(0.993,hash(cell))*exp(-dot(point,point)*180.0);
 c+=vec3(0.65,0.76,1.0)*star*u.sky.z*(1.0-0.8*u.style.y)*smoothstep(0.0,0.08,ray.y);
 let sun_dot=dot(ray,normalize(u.sun.xyz));
 c+=vec3(3.0,2.4,1.5)*smoothstep(0.99994,0.99997,sun_dot)*(1.0-clean);
 return vec4(mix(c,vec3(1.0),clean),1.0);
}
