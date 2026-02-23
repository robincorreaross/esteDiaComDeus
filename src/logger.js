const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Garante que a pasta de logs existe
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      const lvl = level.toUpperCase().padEnd(5);
      return stack
        ? `[${timestamp}] ${lvl} | ${message}\n${stack}`
        : `[${timestamp}] ${lvl} | ${message}`;
    })
  ),
  transports: [
    // Log no console com cores
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          return stack
            ? `[${timestamp}] ${level} | ${message}\n${stack}`
            : `[${timestamp}] ${level} | ${message}`;
        })
      ),
    }),
    // Log em arquivo
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 7, // mantém 7 arquivos de log
      tailable: true,
    }),
    // Log de erros separado
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
      tailable: true,
    }),
  ],
});

module.exports = logger;
