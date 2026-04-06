"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(err, _req, res, _next) {
    console.error(err);
    const body = {
        error: err.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
    };
    res.status(500).json(body);
}
