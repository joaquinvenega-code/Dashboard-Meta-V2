import https from 'https';

https.get({
  hostname: 'api.github.com',
  path: '/repos/mgaitan/departamentos_argentina/git/trees/master?recursive=1',
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).tree?.map((t:any) => t.path).filter((p:string)=>p.includes('provincia'))));
});
