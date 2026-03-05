const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => { body += d; });
  res.on('end', () => {
    let data = JSON.parse(body);
    let token = data.data ? data.data.token : data.token;
    
    const tokenOpts = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/v1/therapists/profile',
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token
      }
    };
    
    const treq = http.request(tokenOpts, tres => {
      let tbody = '';
      tres.on('data', d => { tbody += d; });
      tres.on('end', () => {
        console.log(JSON.stringify(JSON.parse(tbody), null, 2));
      });
    });
    treq.end();
  });
});

req.write(JSON.stringify({
  provider: 'phone',
  credential: '+919372681410',
  otp: '123456'
}));
req.end();
