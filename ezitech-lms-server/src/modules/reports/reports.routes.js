const express = require('express');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const requireAuth = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const { getReportData, REPORT_TYPES } = require('./reports.service');
const { toCsv, toExcelBuffer, streamPdfTable } = require('../../utils/exporters');

const router = express.Router();

router.use(requireAuth, authorize('admin', 'course_manager'));

router.get(
  '/:type',
  catchAsync(async (req, res) => {
    const { type } = req.params;
    const format = (req.query.format || 'csv').toLowerCase();

    if (!REPORT_TYPES.includes(type)) {
      throw ApiError.badRequest(`Unknown report type. Valid types: ${REPORT_TYPES.join(', ')}`);
    }

    const { dateFrom, dateTo, courseId, instructorId, categoryId, studentId } = req.query;
    for (const [key, value] of Object.entries({ dateFrom, dateTo })) {
      if (value && Number.isNaN(Date.parse(value))) {
        throw ApiError.badRequest(`${key} must be a valid date`);
      }
    }
    const filters = { dateFrom, dateTo, courseId, instructorId, categoryId, studentId };

    const report = await getReportData(type, filters);
    const filename = `${type}-report`;

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(toCsv(report));
    }

    if (format === 'excel' || format === 'xlsx') {
      const buffer = await toExcelBuffer(report, report.title);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      return res.send(buffer);
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      return streamPdfTable(report, res);
    }

    throw ApiError.badRequest('format must be one of: csv, excel, pdf');
  })
);

module.exports = router;
