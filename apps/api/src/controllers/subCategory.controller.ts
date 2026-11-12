import { Request, Response } from 'express';
import * as subCategoryService from '../services/subCategory.service';
import { sendSuccess } from '../utils/apiResponse';
import { SubCategoryQueryInput } from '@repo/shared';

export const createSubCategory = async (req: Request, res: Response) => {
  const subCategory = await subCategoryService.createSubCategory(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Subcategory created successfully', data: { subCategory } });
};

export const listSubCategories = async (req: Request, res: Response) => {
  const { categoryId, featured } = req.query as unknown as SubCategoryQueryInput;
  const subCategories = await subCategoryService.listSubCategories({ categoryId, featured });
  sendSuccess(res, { message: 'Subcategories fetched successfully', data: { subCategories } });
};

export const getSubCategory = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const subCategory = await subCategoryService.getSubCategoryById(id);
  sendSuccess(res, { message: 'Subcategory fetched successfully', data: { subCategory } });
};

export const updateSubCategory = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const subCategory = await subCategoryService.updateSubCategory( id, req.body);
  sendSuccess(res, { message: 'Subcategory updated successfully', data: { subCategory } });
};

export const deleteSubCategory = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await subCategoryService.deleteSubCategory(id);
  sendSuccess(res, { message: 'Subcategory deleted successfully' });
};
