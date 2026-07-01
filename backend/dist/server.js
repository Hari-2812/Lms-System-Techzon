"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Configurations
dotenv_1.default.config({ path: path_1.default.join(__dirname, '.env') });
const db_1 = require("./config/db");
const logger_1 = __importDefault(require("./config/logger"));
// Routing
const api_1 = __importDefault(require("./routes/api"));
// Seeding utilities
const planController_1 = require("./controllers/planController");
const courseController_1 = require("./controllers/courseController");
const analyticsController_1 = require("./controllers/analyticsController");
const expiryJob_1 = require("./jobs/expiryJob");
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});
const PORT = process.env.PORT || 5000;
// Connect Database
(0, db_1.connectDB)().then(async () => {
    try {
        // Run automated seeding
        await (0, planController_1.seedDefaultPlans)();
        await (0, courseController_1.seedDefaultCourses)();
        await (0, analyticsController_1.seedDefaultSettings)();
        (0, expiryJob_1.startExpiryScheduler)();
    }
    catch (error) {
        logger_1.default.error('Database seeding failed:', error);
    }
});
// Middleware Stack
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
// Rate Limiting (Prevent Brute Force)
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes' },
});
app.use('/api/', limiter);
// JSON Body Parser & URL Encoding
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Custom Zero-Dependency Cookie Parser Middleware
app.use((req, res, next) => {
    const list = {};
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        cookieHeader.split(';').forEach((cookie) => {
            const parts = cookie.split('=');
            const key = parts.shift()?.trim();
            const val = parts.join('=')?.trim();
            if (key) {
                list[key] = decodeURIComponent(val);
            }
        });
    }
    req.cookies = list;
    next();
});
// API Routes mounting
app.use('/api/v1', api_1.default);
// Base Check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: new Date(),
        uptime: process.uptime(),
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    logger_1.default.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
    });
});
// Socket.IO communication
io.on('connection', (socket) => {
    logger_1.default.info(`Socket client connected: ${socket.id}`);
    // Broadcast announcements
    socket.on('send_announcement', (data) => {
        io.emit('announcement_received', data);
    });
    socket.on('disconnect', () => {
        logger_1.default.info(`Socket client disconnected: ${socket.id}`);
    });
});
// Run server
server.listen(PORT, () => {
    logger_1.default.info(`Techzon LMS Backend server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
