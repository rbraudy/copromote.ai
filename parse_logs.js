
const fs = require('fs');
try {
    const raw = fs.readFileSync('latest_logs_utf8.json', 'utf8').trim().replace(/^\uFEFF/, '');
    if (!raw) { console.log('Empty'); process.exit(0); }
    const logs = JSON.parse(raw);
    console.log('Count:', logs.length);
    logs.slice(0, 5).forEach(l => {
        console.log(`[${l.created_at}] ${l.function_name} | ${l.error_type}`);
    });
} catch (e) {
    console.error('Parse Error:', e.message);
}
