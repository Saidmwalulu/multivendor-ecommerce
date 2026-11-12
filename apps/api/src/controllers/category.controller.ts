import { Request, Response } from 'express';
import * as categoryService from '../services/category.service';
import { sendSuccess } from '../utils/apiResponse';
import { CategoryQueryInput } from '@repo/shared';

export const createCategory = async (req: Request, res: Response) => {
  const category = await categoryService.createCategory(req.body);
  sendSuccess(res, { statusCode: 201, message: 'Category created successfully', data: { category } });
};

export const listCategories = async (req: Request, res: Response) => {
  const { featured, includeSubCategories } = req.query as unknown as CategoryQueryInput;
  const categories = await categoryService.listCategories({ featured, includeSubCategories });
  sendSuccess(res, { message: 'Categories fetched successfully', data: { categories } });
};

export const getCategory = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const category = await categoryService.getCategoryById(id);
  sendSuccess(res, { message: 'Category fetched successfully', data: { category } });
};

export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const category = await categoryService.updateCategory( id, req.body);
  sendSuccess(res, { message: 'Category updated successfully', data: { category } });
};

export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await categoryService.deleteCategory(id);
  sendSuccess(res, { message: 'Category deleted successfully' });
};
