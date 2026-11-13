import express from 'express';
import {
  createForm,
  submitToForm,
  getAllForms,
  getFormSubmissions,
  exportSubmissionsCSV,
  deleteForm,
} from '../controllers/formController.js';

const router = express.Router();

// Form management endpoints
router.post('/forms', createForm);
router.get('/forms', getAllForms);

// Submissions endpoints
router.post('/submit/:formId', submitToForm);
router.get('/forms/:formId/submissions', getFormSubmissions);
router.get('/forms/:formId/export', exportSubmissionsCSV);

// Route 6: Delete a form and its submissions
router.delete('/forms/:formId', deleteForm);

export default router;