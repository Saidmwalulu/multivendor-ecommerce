import { Request, Response } from 'express';
import * as storeService from '../services/store.service';
import { sendSuccess } from '../utils/apiResponse';
import { StoreFormInput } from '@repo/shared';
import { UnauthorizedError } from '../errors';

// Create or update (upsert) a store
export const upsertStore = async (req: Request, res: Response) => {
  const input = req.body as StoreFormInput;
  const userId = req.user?.id; // assuming you attach user info to req
    if (!userId) {
     throw new UnauthorizedError("user unauthorized");
    }
  const store = await storeService.CreateStore(input, userId);
  sendSuccess(res, {
    statusCode: 201,
    message: 'Store created or updated successfully',
    data: { store },
  });
};

// List stores with optional filters
export const listStores = async (req: Request, res: Response) => {
  const { featured, status } = req.query as { featured?: string; status?: string };
  const stores = await storeService.listStores({
    featured: featured ? featured === 'true' : undefined,
    status,
  });

  sendSuccess(res, {
    message: 'Stores fetched successfully',
    data: { stores },
  });
};

// Get a single store by ID
export const getStore = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const store = await storeService.getStoreById(id);

  sendSuccess(res, {
    message: 'Store fetched successfully',
    data: { store },
  });
};

// Get a single store by URL
export const getStoreUrl = async (req: Request, res: Response) => {
  const { url } = req.params as { url: string };
  const store = await storeService.getStoreByUrl(url);

  sendSuccess(res, {
    message: 'Store fetched successfully',
    data: { store },
  });
};

// Delete a store
export const deleteStore = async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  await storeService.deleteStore(id);

  sendSuccess(res, {
    message: 'Store deleted successfully',
  });
};
