const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/requestLogger');
const healthRouter = require('./routes/health');
const propertiesRouter = require('./routes/properties');
const openhousesRouter = require('./routes/openhouses');
const chatRouter = require('./routes/chat');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/properties', propertiesRouter);
app.use('/api/openhouses', openhousesRouter);
app.use('/api/chat', chatRouter);

module.exports = app;
