import {writeFile} from 'node:fs/promises';
const queries={shell:'Shell Centre London tower',barclays:'One Churchill Place London',hsbc:'8 Canada Square London',jpmorgan:'25 Bank Street London',google:'6 Pancras Square Google', 'morgan-stanley':'25 Cabot Square Morgan Stanley'};
for(const [id,query] of Object.entries(queries)){
 const u=new URL('https://commons.wikimedia.org/w/api.php');for(const [k,v] of Object.entries({action:'query',generator:'search',gsrsearch:query,gsrnamespace:6,gsrlimit:2,prop:'imageinfo',iiprop:'url|extmetadata',iiurlwidth:900,format:'json'}))u.searchParams.set(k,v);
 const response=await fetch(u,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(id+': '+response.status);const result=await response.json();await writeFile(new URL('osm/image-'+id+'.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 for(const x of Object.values(result.query?.pages||{})){const i=x.imageinfo?.[0],e=i?.extmetadata;console.log(JSON.stringify({id,title:x.title,url:i?.thumburl,source:i?.descriptionurl,artist:e?.Artist?.value.replace(/<[^>]*>/g,''),license:e?.LicenseShortName?.value,licenseUrl:e?.LicenseUrl?.value}));}
}
