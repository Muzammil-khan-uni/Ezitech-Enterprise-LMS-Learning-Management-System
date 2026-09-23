const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');
const mongoSanitize = require('./middlewares/mongoSanitize.middleware');
const { createRateLimiter } = require('./middlewares/rateLimiter');

const env = require('./config/env');
const { redisClient } = require('./config/redis');
const logger = require('./utils/logger');
const ApiResponse = require('./utils/ApiResponse');
const errorMiddleware = require('./middlewares/error.middleware');
const notFoundMiddleware = require('./middlewares/notFound.middleware');
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const coursesRoutes = require('./modules/courses/courses.routes');
const categoriesRoutes = require('./modules/courses/categories.routes');
const learningPathsRoutes = require('./modules/learning-paths/learning-paths.routes');
const enrollmentsRoutes = require('./modules/enrollments/enrollments.routes');
const progressRoutes = require('./modules/progress/progress.routes');
const assessmentsRoutes = require('./modules/assessments/assessments.routes');
const certificatesRoutes = require('./modules/certificates/certificates.routes');
const certificateTemplatesRoutes = require('./modules/certificates/certificate-templates.routes');
const discussionsRoutes = require('./modules/discussions/discussions.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const reportsRoutes = require('./modules/reports/reports.routes');
const couponsRoutes = require('./modules/coupons/coupons.routes');
const subscriptionsRoutes = require('./modules/subscriptions/subscriptions.routes');
const liveClassesRoutes = require('./modules/live-classes/live-classes.routes');
const scormRoutes = require('./modules/scorm/scorm.routes');
const uploadsRoutes = require('./modules/uploads/uploads.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const reviewsRoutes = require('./modules/reviews/reviews.routes');

const app = express();

app.set('trust proxy', env.trustProxy);

app.get('/health', (req, res) => {
  new ApiResponse(200, {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }, 'OK').send(res);
});

app.get('/health/ready', async (req, res) => {
  const checks = {
    mongo: mongoose.connection.readyState === 1,
    redis: false,
  };
  try {
    checks.redis = (await redisClient.ping()) === 'PONG';
  } catch {
    checks.redis = false;
  }
  const ready = checks.mongo && checks.redis;
  new ApiResponse(ready ? 200 : 503, checks, ready ? 'Ready' : 'Not ready').send(res);
});

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());
app.use(mongoSanitize);

app.use(
  morgan(env.isDevelopment ? 'dev' : 'combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

app.use(
  createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
    prefix: 'global',
  })
);

const configRouter = express.Router();
configRouter.get('/', (req, res) => {
  new ApiResponse(200, { paymentsEnabled: env.paymentsEnabled }).send(res);
});

const apiRouter = express.Router();
apiRouter.get('/', (req, res) => {
  new ApiResponse(200, { name: 'Ezitech LMS API', version: env.apiVersion }).send(res);
});

const openApiPath = path.join(__dirname, '..', 'openapi.yaml');

apiRouter.get('/openapi.yaml', (req, res) => {
  if (!fs.existsSync(openApiPath)) {
    return res.status(404).json({ success: false, message: 'openapi.yaml not found' });
  }
  res.type('application/yaml').sendFile(openApiPath);
});

apiRouter.get(
  '/docs',
  (req, res, next) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https://unpkg.com; connect-src 'self'"
    );
    next();
  },
  (req, res) => {
    res.type('html').send(`<!DOCTYPE html>
<html>
  <head>
    <title>Ezitech LMS API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({
        url: 'openapi.yaml',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
      });
    </script>
  </body>
</html>`);
  }
);

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/courses', coursesRoutes);
apiRouter.use('/course-categories', categoriesRoutes);
apiRouter.use('/config', configRouter);
apiRouter.use('/learning-paths', learningPathsRoutes);
apiRouter.use('/enrollments', enrollmentsRoutes);
apiRouter.use('/progress', progressRoutes);
apiRouter.use('/assessments', assessmentsRoutes);
apiRouter.use('/certificates', certificatesRoutes);
apiRouter.use('/certificate-templates', certificateTemplatesRoutes);
apiRouter.use('/discussions', discussionsRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/coupons', couponsRoutes);
apiRouter.use('/subscriptions', subscriptionsRoutes);
apiRouter.use('/live-classes', liveClassesRoutes);
apiRouter.use('/scorm', scormRoutes);
apiRouter.use('/uploads', uploadsRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/reviews', reviewsRoutes);

app.use(`/api/${env.apiVersion}`, apiRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
