require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

