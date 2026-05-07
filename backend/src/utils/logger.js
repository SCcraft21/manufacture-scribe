/* Tiny logger wrapper. Replace with pino/winston in production if needed. */
const ts = () => new Date().toISOString();
module.exports = {
  info: (...a) => console.log(`[${ts()}] [INFO]`, ...a),
  warn: (...a) => console.warn(`[${ts()}] [WARN]`, ...a),
  error: (...a) => console.error(`[${ts()}] [ERROR]`, ...a),
};
