const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.type === 'validation') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  if (err.type === 'not_found') {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message
    });
  }

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong'
  });
};

module.exports = errorHandler;