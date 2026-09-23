const winston = require('winston');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProduction ? winston.format.json() : winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, stack }) => {
        return `${timestamp} [${level}]: ${stack || message}`;
      })
    )
  ),
  transports: isProduction
    ? [new winston.transports.Console()]
    : [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: path.join('logs', 'error.log'),
          level: 'error',
        }),
        new winston.transports.File({
          filename: path.join('logs', 'combined.log'),
        }),
      ],
  exitOnError: false,
});

module.exports = logger;
