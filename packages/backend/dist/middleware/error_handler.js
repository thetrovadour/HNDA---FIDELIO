"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    // Malformed JSON body
    if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({ error: 'Invalid JSON', code: 'BAD_REQUEST' });
        return;
    }
    // Body too large
    if (err.type === 'entity.too.large') {
        res.status(413).json({ error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' });
        return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
