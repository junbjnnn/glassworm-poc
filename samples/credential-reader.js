// Sample: reads sensitive credential files (HIGH severity)
const fs = require('fs');
const os = require('os');

const sshKeys = fs.readFileSync(os.homedir() + '/.ssh/known_hosts', 'utf-8');
const npmrc = fs.readFileSync(os.homedir() + '/.npmrc', 'utf-8');
