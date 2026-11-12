import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate, validateQuery } from '../middlewares/validate';
import { uploadCategoryImage } from '../middlewares/upload';
import { Role } from '../constants/roles';
import { createCategorySchema, updateCategorySchema, categoryQuerySchema } from '@repo/shared';

const router = Router();

router.get('/', validateQuery(categoryQuerySchema), categoryController.listCategories);
router.get('/:id', categoryController.getCategory);

router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  uploadCategoryImage,
  validate(createCategorySchema),
  categoryController.createCategory
);

router.patch(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  uploadCategoryImage,
  validate(updateCategorySchema),
  categoryController.updateCategory
);

router.delete('/:id', authenticate, authorize(Role.ADMIN), categoryController.deleteCategory);

export default router;
