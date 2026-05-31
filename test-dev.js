import http from 'https';

const data = JSON.stringify({ text: "hola" });

const options = {
  hostname: 'ais-dev-belublm2zvdwlsukgxgqqy-577098943678.us-east1.run.app',
  port: 443,
  path: '/api/tts-google',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
  },
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(data);
req.end();
