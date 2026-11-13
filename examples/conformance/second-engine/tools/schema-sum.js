const fs=require('fs');const s=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
function t(n){if(!n)return'?';if(n.$ref)return n.$ref.replace('#/$defs/','@');let ty=n.type;if(Array.isArray(ty))ty=ty.join('|');
 if(n.enum)return 'enum('+n.enum.join(',')+')';if(n.const!==undefined)return 'const '+JSON.stringify(n.const);
 if(n.oneOf||n.anyOf)return (n.oneOf||n.anyOf).map(t).join(' / ');
 if(ty==='array')return '['+t(n.items)+']';return ty||'obj';}
function show(n,ind,name){const req=new Set(n.required||[]);
 if(n.properties)for(const[k,v]of Object.entries(n.properties)){console.log(ind+k+(req.has(k)?'*':'')+': '+t(v)+(v.default!==undefined?' ='+JSON.stringify(v.default):''));
  if(v.type==='object'&&v.properties)show(v,ind+'  ');
  if(v.type==='array'&&v.items&&v.items.properties)show(v.items,ind+'  ');}}
const only=process.argv[3];
if(!only){console.log('TOP');show(s,'  ');}
for(const[k,v]of Object.entries(s.$defs||{})){if(only&&only!==k)continue;if(k==='referential_rules')continue;console.log('\n@'+k+' '+t(v));show(v,'  ');
 if(v.items&&v.items.properties)show(v.items,'  ');}
