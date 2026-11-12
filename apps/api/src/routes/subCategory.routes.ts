import { Router } from 'express';
import * as subCategoryController from '../controllers/subCategory.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate, validateQuery } from '../middlewares/validate';
import { uploadSubCategoryImage } from '../middlewares/upload';
import { Role } from '../constants/roles';
import {
  createSubCategorySchema,
  updateSubCategorySchema,
  subCategoryQuerySchema,
} from '@repo/shared';

const router = Router();

router.get('/', validateQuery(subCategoryQuerySchema), subCategoryController.listSubCategories);
router.get('/:id', subCategoryController.getSubCategory);

router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  uploadSubCategoryImage,
  validate(createSubCategorySchema),
  subCategoryController.createSubCategory
);

router.patch(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  uploadSubCategoryImage,
  validate(updateSubCategorySchema),
  subCategoryController.updateSubCategory
);

router.delete('/:id', authenticate, authorize(Role.ADMIN), subCategoryController.deleteSubCategory);

export default router;
