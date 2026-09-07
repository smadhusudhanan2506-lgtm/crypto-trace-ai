const ALCHEMY_API_KEY = 'alch_XuxqHoJ1rsyd2y4Fv33wF';

async function fetchAlchemyAssetTransfers(address, chain, direction = 'from') {
  const alchemyBaseMap = {
    sepolia: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    ethereum: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    polygon: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    base: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    optimism: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
  };

  const url = alchemyBaseMap[chain.toLowerCase()];
  if (!url) return [];

  try {
    const paramObj = {
      fromBlock: '0x0',
      toBlock: 'latest',
      category: ['external', 'erc20'],
      maxCount: '0x10',
      order: 'desc',
    };
    if (direction === 'from') {
      paramObj.fromAddress = address;
    } else {
      paramObj.toAddress = address;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [paramObj],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.result?.transfers && Array.isArray(data.result.transfers)) {
        return data.result.transfers.map((t) => ({
          hash: t.hash,
          from: (t.from || '').toLowerCase(),
          to: (t.to || '').toLowerCase(),
          value: typeof t.value === 'number' ? t.value : 0,
          asset: t.asset || (chain === 'polygon' ? 'MATIC' : 'ETH'),
          category: t.category,
          blockNum: t.blockNum,
        }));
      }
    }
  } catch (e) {
    console.error(`Error on ${chain}:`, e.message);
  }
  return [];
}

async function testWalletTrace(wallet) {
  console.log(`Testing wallet trace for: ${wallet}`);
  const chains = ['ethereum', 'polygon', 'arbitrum', 'base', 'sepolia'];
  const probePromises = chains.map(async (chain) => {
    const [outTxs, inTxs] = await Promise.all([
      fetchAlchemyAssetTransfers(wallet, chain, 'from'),
      fetchAlchemyAssetTransfers(wallet, chain, 'to'),
    ]);
    return { chain, count: outTxs.length + inTxs.length, outTxs, inTxs };
  });

  const results = await Promise.all(probePromises);
  results.sort((a, b) => b.count - a.count);
  const best = results[0];
  console.log(`Best detected chain: ${best.chain} with ${best.count} transfers.`);
  console.log('Outflows count:', best.outTxs.length);
  if (best.outTxs.length > 0) {
    console.log('Sample outflow:', best.outTxs[0]);
  }
  console.log('Inflows count:', best.inTxs.length);
  if (best.inTxs.length > 0) {
    console.log('Sample inflow:', best.inTxs[0]);
  }
}

testWalletTrace('0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
