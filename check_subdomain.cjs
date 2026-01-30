const https = require('https');

const options = {
    hostname: 'setonsexecutivesearch.zendesk.com',
    port: 443,
    path: '/api/v2/tickets.json', // Auth required, but 401 means exists. 404/DNS error means doesn't exist.
    method: 'GET'
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    // If 401, it exists. 
    // If 301/302, redirect (maybe to signup?)
    // If matches signup in location header?
    console.log('HEADERS:', JSON.stringify(res.headers));
});

req.on('error', (e) => {
    console.error('DNS/Net Error:', e.message);
});

req.end();
