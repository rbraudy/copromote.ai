const https = require('https');

const data = JSON.stringify({
    issueType: 'Debug Test',
    description: 'Testing connection with CORRECT subdomain',
    customerName: 'Debug Bot 2',
    customerPhone: '555-123-4567'
});

const options = {
    hostname: 'tikocqefwifjcfhgqdyj.supabase.co',
    port: 443,
    path: '/functions/v1/report-issue',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    let chunks = [];

    res.on('data', (d) => {
        chunks.push(d);
    });

    res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        try {
            const json = JSON.parse(body);
            console.log('Parsed Error:', JSON.stringify(json, null, 2));
        } catch {
            console.log('Raw Body:', body);
        }
    });
});

req.on('error', (error) => {
    console.error('REQ ERROR:', error);
});

req.write(data);
req.end();
