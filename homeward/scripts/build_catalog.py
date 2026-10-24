"""Extract an ODbL place catalogue from the checksum-pinned Aether database."""
from pathlib import Path
import hashlib, json, math, struct

root = Path(__file__).resolve().parents[1]
b = (root/'web/dist/maps/london.ael').read_bytes()
sha = hashlib.sha256(b).hexdigest()
assert sha == 'b6739ab69cad7b75b5a3f8341519c60dcf8640babf8380da57e54749ba3b2719'
counts = struct.unpack_from('<6I', b, 50)
coordinate_bytes, triangle_bytes = struct.unpack_from('<2I', b, 74)
names_start = 114 + counts[0]*64 + coordinate_bytes + counts[2]*4 + triangle_bytes
curated = {
 1137: ('station:bank','Bank',['Bank station','Bank'],['Northern','Central','DLR','Waterloo & City']),
 1763: ('station:waterloo','Waterloo',['Waterloo station','Waterloo'],['Jubilee','Northern','Bakerloo','Waterloo & City']),
 1781: ('station:euston','Euston',['Euston station','Euston'],['Northern','Victoria']),
 2409: ('station:canada-water','Canada Water',['Canada Water'],['Jubilee','Windrush']),
 2321: ('station:canary-wharf-dlr','Canary Wharf · DLR',['Canary Wharf'],['DLR']),
 2635: ('station:canary-wharf-jubilee','Canary Wharf · Jubilee',['Canary Wharf'],['Jubilee']),
 3301: ('station:canary-wharf-elizabeth','Canary Wharf · Elizabeth',['Canary Wharf'],['Elizabeth']),
}
places=[]
for i in range(counts[0]):
 p=114+i*64
 osm_id=struct.unpack_from('<q',b,p)[0];kind=b[p+8]
 rank=struct.unpack_from('<H',b,p+30)[0]
 start=struct.unpack_from('<I',b,p+40)[0];length=struct.unpack_from('<H',b,p+44)[0]
 name=b[names_start+start:names_start+start+length].decode()
 if not name or rank<500 or kind in [3,4]: continue
 bounds=struct.unpack_from('<4i',b,p+48)
 east=(bounds[0]+bounds[2])*0.125;north=(bounds[1]+bounds[3])*0.125
 height=struct.unpack_from('<H',b,p+12)[0]*0.1 if kind==0 else 0
 pid=f'osm:2026-10-12:{i}';aliases=[name];lines=[]
 if i in curated:pid,name,aliases,lines=curated[i]
 if i==48952:aliases += ['Trafalgar Square','Nelsons Column']
 if i==43557:aliases += ['Big Ben']
 places.append(dict(id=pid,name=name,aliases=aliases,lines=lines,feature_index=i,osm_id=osm_id,kind=kind,rank=rank,east=east,north=north,height=height,lat=51.5074+math.degrees(north/6378137),lon=-0.1278+math.degrees(east/(6378137*math.cos(math.radians(51.5074))))))
catalog={'version':'london-2026-10-12-v1','database_sha256':sha,'attribution':'© OpenStreetMap contributors','license':'ODbL 1.0','note':'Station anchors are station locations, not verified accessible entrances. Trafalgar Square resolves to Nelson’s Column as a representative landmark. Canary Wharf line identities checked against public OSM node tags.','places':places}
(root/'data/places.json').write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n')
print(f'Wrote {len(places)} source-backed places; map SHA-256 {sha}')
