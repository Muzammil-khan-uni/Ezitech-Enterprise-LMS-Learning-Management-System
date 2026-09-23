const express = require('express');
const Joi = require('joi');
const CourseCategory = require('../../models/CourseCategory.model');
const { Course } = require('../../models/Course.model');
const catchAsync = require('../../utils/catchAsync');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const requireAuth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const { authorize } = require('../../middlewares/rbac.middleware');
const slugify = require('../../utils/slugify');

const router = express.Router();

const createSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  description: Joi.string().trim().max(300).allow('', null),
  parentCategory: Joi.string().hex().length(24).allow(null, ''),
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60),
  description: Joi.string().trim().max(300).allow('', null),
  parentCategory: Joi.string().hex().length(24).allow(null, ''),
}).min(1);

async function assertValidParent(categoryId, parentId) {
  if (!parentId) return;
  if (categoryId && String(parentId) === String(categoryId)) {
    throw ApiError.badRequest('A category cannot be its own parent');
  }
  let cursor = await CourseCategory.findById(parentId);
  if (!cursor) throw ApiError.badRequest('The parent category does not exist');
  while (cursor && cursor.parentCategory) {
    if (categoryId && String(cursor.parentCategory) === String(categoryId)) {
      throw ApiError.badRequest('That parent would create a loop in the category tree');
    }
    cursor = await CourseCategory.findById(cursor.parentCategory);
  }
}

router.get(
  '/',
  catchAsync(async (req, res) => {
    const categories = await CourseCategory.find().sort('name');
    new ApiResponse(200, categories).send(res);
  })
);

router.post(
  '/',
  requireAuth,
  authorize('admin', 'course_manager'),
  validate(createSchema),
  catchAsync(async (req, res) => {
    const { name, description, parentCategory } = req.body;
    await assertValidParent(null, parentCategory);

    const category = await CourseCategory.create({
      name,
      slug: slugify(name),
      description: description || undefined,
      parentCategory: parentCategory || null,
    });
    new ApiResponse(201, category, 'Category created').send(res);
  })
);

router.patch(
  '/:categoryId',
  requireAuth,
  authorize('admin', 'course_manager'),
  validate(updateSchema),
  catchAsync(async (req, res) => {
    const category = await CourseCategory.findById(req.params.categoryId);
    if (!category) throw ApiError.notFound('Category not found');

    if (req.body.parentCategory !== undefined) {
      await assertValidParent(category._id, req.body.parentCategory);
      category.parentCategory = req.body.parentCategory || null;
    }
    if (req.body.name !== undefined) category.name = req.body.name;
    if (req.body.description !== undefined) category.description = req.body.description || undefined;

    await category.save();
    new ApiResponse(200, category, 'Category updated').send(res);
  })
);

router.delete(
  '/:categoryId',
  requireAuth,
  authorize('admin', 'course_manager'),
  catchAsync(async (req, res) => {
    const category = await CourseCategory.findById(req.params.categoryId);
    if (!category) throw ApiError.notFound('Category not found');

    const [courses, children] = await Promise.all([
      Course.countDocuments({ category: category._id }),
      CourseCategory.countDocuments({ parentCategory: category._id }),
    ]);
    if (courses > 0) {
      throw ApiError.conflict(`This category still has ${courses} course${courses === 1 ? '' : 's'}. Move them first.`);
    }
    if (children > 0) {
      throw ApiError.conflict('This category has sub-categories. Move or delete them first.');
    }

    await category.deleteOne();
    new ApiResponse(200, null, 'Category deleted').send(res);
  })
);

module.exports = router;
