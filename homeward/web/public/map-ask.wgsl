// Aether hud.rs / shaders.metal ask-bar primitives, translated to WGSL.
// Linear HDR light, original rounded SDF, dispersion, aura, orb and blur kernels.
struct Params { viewport:vec4<f32>, bar:vec4<f32>, state:vec4<f32>, accent:vec4<f32>, accent2:vec4<f32>, third:vec4<f32>, hint:vec4<f32>, glass:array<vec4<f32>,4>, radii:vec4<f32>,theme:vec4<f32> }
@group(0) @binding(0) var src:texture_2d<f32>;
@group(0) @binding(1) var lin:sampler;
@group(0) @binding(2) var<uniform> u:Params;
@group(0) @binding(3) var aux:texture_2d<f32>;
@group(0) @binding(4) var map_original:texture_2d<f32>;
struct Out { @builtin(position) p:vec4<f32>, @location(0) uv:vec2<f32> }
@vertex fn vs(@builtin(vertex_index) i:u32)->Out {
 let p=vec2(f32((i<<1u)&2u),f32(i&2u));var o:Out;o.p=vec4(p*2.0-1.0,0,1);o.uv=vec2(p.x,1.0-p.y);return o;
}
fn max3(v:vec3<f32>)->f32 {return max(max(v.x,v.y),v.z);}
fn decode(v:vec3<f32>)->vec3<f32> {return select(pow((v+0.055)/1.055,vec3(2.4)),v/12.92,v<=vec3(0.04045));}
fn encode(v:vec3<f32>)->vec3<f32> {let c=max(v,vec3(0.0));return select(1.055*pow(c,vec3(1.0/2.4))-0.055,12.92*c,c<=vec3(0.0031308));}
fn tone(c:vec3<f32>)->vec3<f32> {
 let m=max3(c);if m<=0.72 {return c;}
 let mm=0.72+0.28*(1.0-exp(-(m-0.72)/0.28));
 return mix(c*mm/m,vec3(mm),clamp((m-1.0)/4.0,0.0,1.0)*0.7);
}
// Preserve Homeward's existing map presentation outside the new chrome.
fn inverse_tone(c:vec3<f32>)->vec3<f32> {
 let m=max3(c);if m<=0.72 {return c;}
 let mm=0.72-0.28*log(max(1.0-(m-0.72)/0.28,0.0001));
 let desat=clamp((mm-1.0)/4.0,0.0,1.0)*0.7;
 return max((c-vec3(m*desat))/(1.0-desat)*(mm/m),vec3(0.0));
}
fn sd(q:vec2<f32>)->f32 {let a=abs(q)-u.bar.zw*0.5+vec2(29.0);return min(max(a.x,a.y),0.0)+length(max(a,vec2(0.0)))-29.0;}
fn aa(d:f32)->f32 {return max(length(vec2(dpdx(d),dpdy(d))),0.00001);}
fn coverage(d:f32,w:f32)->f32 {return clamp(0.5-d/w,0.0,1.0);}
fn cycle(t0:f32)->vec3<f32> {
 let t=fract(t0)*3.0;
 if t<1.0 {return mix(u.accent.rgb,u.accent2.rgb,smoothstep(0.0,1.0,t));}
 if t<2.0 {return mix(u.accent2.rgb,u.third.rgb,smoothstep(0.0,1.0,t-1.0));}
 return mix(u.third.rgb,u.accent.rgb,smoothstep(0.0,1.0,t-2.0));
}
fn aura_color(q:vec2<f32>)->vec3<f32> {return cycle(atan2(q.y/max(u.bar.w*0.5,1.0),q.x/max(u.bar.z*0.5,1.0))/6.2831853+u.third.w);}
fn intensity()->f32 {return 0.28*u.state.x+u.state.y;}
fn erf(x:vec2<f32>)->vec2<f32> {
 let a=abs(x);let z=1.0+(0.278393+(0.230389+0.078108*a*a)*a)*a;return sign(x)*(1.0-1.0/(z*z*z*z));
}
// The other chrome shares the ask bar's already captured/blurred map. There is
// no extra render target or blur pyramid per panel, and no recursive sampling.
fn panel_glass(col0:vec3<f32>,p:vec2<f32>,uv:vec2<f32>,r:vec4<f32>,radius0:f32)->vec3<f32> {
 let radius=min(radius0,min(r.z,r.w)*0.5);
 let q=p-r.xy-r.zw*0.5;
 let a=abs(q)-r.zw*0.5+vec2(radius);
 let d=min(max(a.x,a.y),0.0)+length(max(a,vec2(0.0)))-radius;
 let w=aa(d);let cov=coverage(d,w);
 let shadow=exp(-max(d,0.0)/14.0)*smoothstep(0.0,2.0,d)*0.20;
 var col=col0*(1.0-shadow);
 let normal=vec2(dpdx(d),dpdy(d))/w;
 let lens=pow(1.0-clamp(-d/18.0,0.0,1.0),2.0);
 let offset=-normal*lens*8.0/u.viewport.xy;
 let bg=textureSample(aux,lin,uv+offset).rgb;
 var glass=mix(bg*0.40,vec3(0.020,0.023,0.035),0.58);
 let vy=clamp((p.y-r.y)/max(r.w,1.0),0.0,1.0);
 glass+=vec3(0.022*pow(1.0-vy,2.0));
 let rim=exp(-max(-d,0.0)/max(0.8*u.viewport.z,0.8));
 let facing=max(dot(normal,normalize(vec2(-0.35,-1.0))),0.0);
 glass+=vec3(rim*(0.025+0.13*facing*facing));
 glass+=vec3(0.010,0.018,0.016)*exp(-length(q-r.zw*vec2(-0.35,0.25))/110.0);
 return mix(col,glass,cov);
}
@fragment fn backdrop(i:Out)->@location(0) vec4<f32> {
 let p=i.uv*u.viewport.xy;let q=p-(u.bar.xy+u.bar.zw*0.5);let d=sd(q);let w=aa(d);
 let spread=max(vec2(u.viewport.x-u.bar.z,u.viewport.y*(0.6+0.25*u.state.y))/3.0,vec2(1.0));
 let beyond=max(abs(q)-u.bar.zw*0.5,vec2(0.0))/spread;
 let wide=exp(-dot(beyond,beyond))*(1.0-smoothstep(2.0,3.0,max(beyond.x,beyond.y)))*smoothstep(-w,w,d);
 let base=inverse_tone(decode(textureSample(src,lin,i.uv).rgb));
 return vec4(base+aura_color(q)*0.75*wide*intensity(),1.0);
}
@fragment fn chrome(i:Out)->@location(0) vec4<f32> {
 let p=i.uv*u.viewport.xy;let q=p-(u.bar.xy+u.bar.zw*0.5);let d=sd(q);let w=aa(d);let cov=coverage(d,w);
 var col=textureSample(src,lin,i.uv).rgb;
 let sq=q-vec2(0.0,14.0);let half=u.bar.zw*0.5;
 let shadow=erf((sq+half)/(22.0*1.41421356))-erf((sq-half)/(22.0*1.41421356));
 col=mix(col,mix(vec3(0.0,0.0,0.015),vec3(0.03,0.06,0.16),u.theme.x),shadow.x*shadow.y*0.25*0.45*(1.0-0.66*u.theme.x));
 let width=26.0+10.0*u.state.y;
 let core=exp(-abs(d)/max(width*0.12,w*1.2));
 let halo=exp(-max(d,0.0)/width)*smoothstep(-w,w,d)*(1.0-smoothstep(2.5*width,4.0*width,d));
 let inner=exp(-max(-d,0.0)/(width*0.6))*(1.0-smoothstep(-w,w,d));
 col+=aura_color(q)*(1.5*core+0.55*halo+0.18*inner)*intensity();
 // Glass: refract only the captured, five-level blurred backdrop, never itself.
 let n=vec2(dpdx(d),dpdy(d))/w;let inside_px=max(-d/w,0.0);
 let tt=clamp(inside_px/max(22.0/w,1.0),0.0,1.0);let lens=(1.0-tt)*(1.0-tt);
 let off=-n*lens*22.0/u.viewport.xy;
 var bg:vec3<f32>;
 bg.r=textureSample(aux,lin,i.uv+off*1.45).r;
 bg.g=textureSample(aux,lin,i.uv+off).g;
 bg.b=textureSample(aux,lin,i.uv+off*0.55).b;
 let dawn=clamp(u.viewport.w-1.0,0.0,1.0);
 let night_tint=mix(vec3(0.045,0.025,0.090),vec3(0.001,0.002,0.006),u.theme.w)*(1.0+1.2*dawn);
 let day_tint=mix(vec3(0.80,0.88,0.98),vec3(1.0),u.theme.z)*(1.0-0.3*(1.0-dawn)*max(0.0,(u.theme.x-0.5)*2.0));
 let tint=mix(night_tint,day_tint,u.theme.x);
 var glass=mix(bg,tint,mix(0.40+0.1*u.state.x+0.20*u.theme.w,0.55+0.15*u.theme.z,u.theme.x));
 let vy=clamp((p.y-u.bar.y)/u.bar.w,0.0,1.0);
 glass+=vec3(0.84*(0.035*(1.0-vy)+0.04*(1.0-smoothstep(0.0,0.45,vy))));
 let light=normalize(vec2(-0.4,-1.0));let facing=max(dot(n,light),0.0);let back=max(dot(n,-light),0.0);
 let rim=exp(-inside_px/max(1.1*u.viewport.z,1.0));
 glass+=vec3(rim*0.4*(0.22+1.2*facing*facing+0.45*back*back*back)+lens*0.05*0.4);
 col=mix(col,glass,cov);
 // The orb alone communicates work: continuous clocks, never restart on state changes.
 let oq=p-(u.bar.xy+vec2(30.0,29.0));let radius=length(oq);let g=u.state.y;
 let pulse=0.5+0.5*sin(u.state.w);let glow_r=16.0+g*10.0;
 col+=u.accent.rgb*exp(-radius*radius/(glow_r*glow_r)*1.6)*(0.5+0.4*pulse*g+0.2*u.state.x);
 let disc=radius-9.0;let disc_cov=coverage(disc,aa(disc));
 col=mix(col,mix(vec3(1.2+g),u.accent2.rgb*1.1,clamp(radius/9.0,0.0,1.0)),disc_cov);
 let mid=u.state.z+1.0;let a=atan2(oq.x,-oq.y);let phi=atan2(sin(a-mid),cos(a-mid));
 let start=vec2(sin(u.state.z),-cos(u.state.z))*13.5;
 let end=vec2(sin(u.state.z+2.0),-cos(u.state.z+2.0))*13.5;
 let arc_d=select(min(length(oq-start),length(oq-end)),abs(radius-13.5),abs(phi)<=1.0)-0.7;
 let arc_t=clamp((phi+1.0)*0.5,0.0,1.0);
 col=mix(col,u.accent.rgb*mix(1.5,1.0,arc_t),coverage(arc_d,aa(arc_d))*(1.0-arc_t));
 // Aether's 24-point key hint: continuous-curvature corners, linear-light ink.
 let hq=p-vec2(u.bar.x+u.bar.z-16.0-u.hint.x*0.5,u.bar.y+29.0);
 let hr=min(7.0*1.28,min(u.hint.x*0.5,12.0));
 let h=abs(hq)-vec2(u.hint.x*0.5,12.0)+vec2(hr);let hm=max(h,vec2(0.0))/max(hr,0.001);
 let hd=min(max(h.x,h.y),0.0)+pow(pow(hm.x,4.2)+pow(hm.y,4.2),1.0/4.2)*hr-hr;
 let hw=aa(hd);let hc=coverage(hd,hw);let hi=coverage(hd+1.0,hw);let ring=clamp(hc-hi,0.0,1.0);
 let hint_alpha=0.06*hi+(0.14+0.06*(1.0-0.14))*ring;
 col=mix(col,select(vec3(1.0),vec3(0.0,0.01,0.04),u.theme.x>=0.25),hint_alpha*mix(1.0,1.25,u.theme.x));
 for(var k=0u;k<4u;k++){
  let rect=u.glass[k];
  if rect.z>0.0&&rect.w>0.0{col=panel_glass(col,p,i.uv,rect,u.radii[k]);}
 }
 return vec4(col,1.0);
}
@fragment fn down(i:Out)->@location(0) vec4<f32> {
 let h=0.5/vec2<f32>(textureDimensions(src));
 var c=textureSample(src,lin,i.uv)*4.0;
 c+=textureSample(src,lin,i.uv-h)+textureSample(src,lin,i.uv+h);
 c+=textureSample(src,lin,i.uv+vec2(h.x,-h.y))+textureSample(src,lin,i.uv-vec2(h.x,-h.y));return c*0.125;
}
@fragment fn up(i:Out)->@location(0) vec4<f32> {
 let h=0.5/vec2<f32>(textureDimensions(src));
 var c=textureSample(src,lin,i.uv+vec2(-2.0*h.x,0.0))+textureSample(src,lin,i.uv+vec2(2.0*h.x,0.0));
 c+=textureSample(src,lin,i.uv+vec2(0.0,-2.0*h.y))+textureSample(src,lin,i.uv+vec2(0.0,2.0*h.y));
 c+=2.0*(textureSample(src,lin,i.uv-h)+textureSample(src,lin,i.uv+h)+textureSample(src,lin,i.uv+vec2(h.x,-h.y))+textureSample(src,lin,i.uv-vec2(h.x,-h.y)));return c/12.0;
}
// Bloom only the added chrome light, preserving the existing map's bloom.
fn emission(uv:vec2<f32>)->vec3<f32> {return max(textureSample(src,lin,uv).rgb-textureSample(aux,lin,uv).rgb,vec3(0.0));}
@fragment fn bloom_pre(i:Out)->@location(0) vec4<f32> {
 let t=1.0/vec2<f32>(textureDimensions(src));let uv=i.uv;
 let a=emission(uv+t*vec2(-2.0,-2.0));let b=emission(uv+t*vec2(0.0,-2.0));let c=emission(uv+t*vec2(2.0,-2.0));
 let d=emission(uv+t*vec2(-2.0,0.0));let e=emission(uv);let f=emission(uv+t*vec2(2.0,0.0));
 let gg=emission(uv+t*vec2(-2.0,2.0));let h=emission(uv+t*vec2(0.0,2.0));let ii=emission(uv+t*vec2(2.0,2.0));
 let j=emission(uv+t*vec2(-1.0,-1.0));let k=emission(uv+t*vec2(1.0,-1.0));let l=emission(uv+t*vec2(-1.0,1.0));let m=emission(uv+t*vec2(1.0,1.0));
 let g0=(a+b+d+e)*0.25;let g1=(b+c+e+f)*0.25;let g2=(d+e+gg+h)*0.25;let g3=(e+f+h+ii)*0.25;let g4=(j+k+l+m)*0.25;
 let w0=0.125/(1.0+max3(g0));let w1=0.125/(1.0+max3(g1));let w2=0.125/(1.0+max3(g2));let w3=0.125/(1.0+max3(g3));let w4=0.5/(1.0+max3(g4));
 let col=(g0*w0+g1*w1+g2*w2+g3*w3+g4*w4)/(w0+w1+w2+w3+w4);
 let br=max3(col);var soft=clamp(br-1.0+0.6,0.0,1.2);soft=soft*soft/(2.4+0.00001);
 return vec4(col*max(soft,br-1.0)/max(br,0.00001),1.0);
}
@fragment fn present(i:Out)->@location(0) vec4<f32> {
 let col=textureSample(src,lin,i.uv).rgb+textureSample(aux,lin,i.uv).rgb*0.55;
 let original=decode(textureSample(map_original,lin,i.uv).rgb);
 return vec4(encode(original+tone(col)-tone(inverse_tone(original))),1.0);
}
