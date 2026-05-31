import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'POST'
};
const req = http.request(options, (res) => { console.log(`STATUS: ${res.statusCode}`); });
req.end();
