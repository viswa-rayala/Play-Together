/**
 * Legacy entrypoint wrapper for backward compatibility with existing hosting configurations.
 * Delegates execution to the modular server architecture located in server/src/server.js.
 */
import('../server/src/server.js').catch((err) => {
  console.error('[Play-Together] Failed to bootstrap unified server:', err);
  process.exit(1);
});