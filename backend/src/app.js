const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const healthRouter = require('./routes/health');
const propertiesRouter = require('./routes/properties');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/properties', propertiesRouter);

module.exports = app;
