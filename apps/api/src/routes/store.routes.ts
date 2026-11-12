import { Router } from 'express';
import * as storeController from '../controllers/store.controller';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { uploadStoreImages } from '../middlewares/upload'; 
import { Role } from '../constants/roles';
import { StoreFormSchema } from '@repo/shared';

const router = Router();

// List stores
router.get('/', storeController.listStores);

// Get a single store by id
router.get('/:id', storeController.getStore);

// Get a single store by url
router.get('/url/:url', storeController.getStoreUrl);

// Upsert (create or update) store
router.post(
  '/',
  authenticate,
  authorize(Role.SELLER),
  uploadStoreImages, // handles logo + cover uploads
  validate(StoreFormSchema),
  storeController.upsertStore
);

// Delete store
router.delete(
  '/:id',
  authenticate,
  authorize(Role.SELLER),
  storeController.deleteStore
);

export default router;
