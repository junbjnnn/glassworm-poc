// Sample: contains eval + Buffer decode pattern (HIGH severity)
const data = "aGVsbG8gd29ybGQ="; // base64 "hello world"
eval(Buffer.from(data, 'base64').toString('utf-8'));
