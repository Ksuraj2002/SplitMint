// Vercel serverless handler: forwards all /api/* requests to the Express app.
module.exports = (req, res) => {
  return import('../server/app.js').then(({ default: app }) => {
    return new Promise((resolve, reject) => {
      res.once('finish', resolve);
      res.once('error', reject);
      app(req, res);
    });
  });
};
