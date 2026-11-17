module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    status: 'online',
    symbol: 'EUR/USD',
    provider: 'Dukascopy (Swiss Forex Bank)',
    runtime: 'vercel-serverless',
  });
};
