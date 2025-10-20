const validator = (req, res, next) => {
  if (req.method === 'POST' && !req.body.text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  next();
};

module.exports = validator;