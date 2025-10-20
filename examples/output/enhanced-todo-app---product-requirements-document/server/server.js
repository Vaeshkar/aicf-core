const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const todoRoutes = require('./routes/todos');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const validator = require('./middleware/validator');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(helmet());
app.use(logger);
app.use(validator);

app.use('/api/todos', todoRoutes);

app.use(errorHandler);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});