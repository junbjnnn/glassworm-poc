// Sample: contains Solana RPC endpoint (MEDIUM severity)
const RPC_URL = 'https://api.mainnet.solana.com';
fetch(RPC_URL, { method: 'POST', body: JSON.stringify({ method: 'getTransaction' }) });
