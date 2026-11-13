const s=JSON.parse(require('fs').readFileSync(process.argv[2],'utf8'));
let n=s;for(const p of process.argv[3].split('.')){n=n[p];}
console.log(JSON.stringify(n,(k,v)=>k==='description'?undefined:v));
