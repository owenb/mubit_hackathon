import {readFile,writeFile,mkdir} from 'node:fs/promises';
const chosen={unilever:'File:Unilever House Mars 2014 02.jpg',shell:'File:The Shell Centre Tower South Bank London - geograph.org.uk - 1374314.jpg',barclays:'File:London MMB »013 1 Churchill Place.jpg',hsbc:'File:London MMB «77 Cabot Square.jpg',google:'File:6 Pancras Square Google 0765.jpg','morgan-stanley':'File:Morgan Stanley, 25 Cabot Square, Canary Wharf - geograph.org.uk - 440760.jpg'};
const images={};await mkdir(new URL('../../web/public/enterprise-images/',import.meta.url),{recursive:true});
for(const [id,title]of Object.entries(chosen)){
 const metadata=JSON.parse(await readFile(new URL('osm/image-'+id+'.json',import.meta.url),'utf8'));const page=Object.values(metadata.query.pages).find(x=>x.title===title);if(!page)throw Error('Missing selected image');
 const info=page.imageinfo[0],ext=info.extmetadata,url=new URL(info.thumburl||info.url);url.search='';const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(id+': '+r.status);const bytes=new Uint8Array(await r.arrayBuffer());if(!r.headers.get('content-type').startsWith('image/'))throw Error('Not an image');
 await writeFile(new URL('../../web/public/enterprise-images/'+id+'.jpg',import.meta.url),bytes);
 images[id]={url:'/enterprise-images/'+id+'.jpg',alt:id==='hsbc'?'HSBC Tower and neighbouring Canary Wharf buildings':title.replace(/^File:/,'').replace(/\.jpg$/i,''),author:ext.Artist.value.replace(/<[^>]*>/g,'').replace(/\s*\(category\)/,'').trim(),license:ext.LicenseShortName.value,license_url:ext.LicenseUrl.value,source_url:info.descriptionurl,original_url:info.url,download_url:url.href,checked_at:new Date().toISOString(),modifications:'None; Wikimedia-provided thumbnail displayed with CSS cropping.'};console.log(JSON.stringify({id,bytes:bytes.length,license:images[id].license}));
}
await writeFile(new URL('images.json',import.meta.url),JSON.stringify(images,null,2)+'\n');
