import mongoose from 'mongoose';
import Form from '../models/Form.js';
import Submission from '../models/Submission.js';

// @desc    Create a new form endpoint
// @route   POST /api/forms
export const createForm = async (req, res) => {
    try {
        const { name, notificationEmail, customRedirect } = req.body;

        // Validate that the required fields are provided
        if (!name || !notificationEmail) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both form name and notification email',
            });
        }

        // Create and save the new form in MongoDB
        const form = await Form.create({
            name,
            notificationEmail,
            customRedirect: customRedirect || null,
        });

        // Return the created form with its unique endpoint URL
        res.status(201).json({
            success: true,
            message: 'Form endpoint created successfully!',
            data: {
                formId: form._id,
                name: form.name,
                notificationEmail: form.notificationEmail,
                endpointUrl: `${req.protocol}://${req.get('host')}/api/submit/${form._id}`,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error while creating form',
            error: error.message,
        });
    }
};


// @desc    Submit data to a form from ANY external website
// @route   POST /api/submit/:formId
export const submitToForm = async (req, res) => {
    try {
        const { formId } = req.params;

        // Validate MongoDB ObjectId format
        if (!mongoose.isValidObjectId(formId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Form ID format. Must be a 24-character hexadecimal ID.',
            });
        }

        // 1. Look up the form in MongoDB
        const form = await Form.findById(formId);

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found. Please verify your form endpoint URL.',
            });
        }

        // 2. Check if the form owner has paused this form
        if (!form.isActive) {
            return res.status(403).json({
                success: false,
                message: 'This form is currently closed to new submissions.',
            });
        }

        // 3. Honeypot Spam Protection Check
        // Automated bots fill in every field they find. Humans can't see the hidden _gotcha field.
        const isSpam = Boolean(req.body._gotcha);

        // Make a copy of submitted data and remove internal fields
        const formData = { ...req.body };
        delete formData._gotcha;

        // Check if the submission is completely empty
        if (Object.keys(formData).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Form submission is empty.',
            });
        }

        // 4. Extract Visitor Metadata (IP & Browser info)
        const ipAddress =
            req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
        const userAgent = req.headers['user-agent'] || 'Unknown';

        // 5. Save the submission into MongoDB
        const submission = await Submission.create({
            formId: form._id,
            data: formData,
            ipAddress,
            userAgent,
            isSpam,
        });

        // 6. Handle the response (Redirect or JSON)
        // If the form owner set a custom redirect URL (e.g. their own thank-you page):
        if (form.customRedirect) {
            return res.redirect(form.customRedirect);
        }

        // Check if request is an AJAX/Fetch call or standard HTML form submission
        const acceptsHtml = req.accepts('html');
        if (acceptsHtml && req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
            // Return a clean HTML Thank You page for standard form submissions
            return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Submission Received</title>
            <style>
              body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f4f6f8; }
              .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
              h1 { color: #10b981; margin-bottom: 10px; }
              p { color: #4b5563; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>✓ Thank You!</h1>
              <p>Your submission has been received successfully.</p>
            </div>
          </body>
        </html>
      `);
        }

        // Otherwise, return JSON (for modern fetch / React frontend forms)
        res.status(201).json({
            success: true,
            message: 'Submission received successfully!',
            submissionId: submission._id,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error processing submission',
            error: error.message,
        });
    }
};

// @desc    Get all submissions for a specific form
// @route   GET /api/forms/:formId/submissions
export const getFormSubmissions = async (req, res) => {
    try {
        const { formId } = req.params;

        if (!mongoose.isValidObjectId(formId)) {
            return res.status(400).json({ success: false, message: 'Invalid Form ID format' });
        }

        // 1. Verify the form exists
        const form = await Form.findById(formId);
        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found',
            });
        }

        // 2. Fetch submissions belonging to this form
        // .sort({ createdAt: -1 }) brings the newest messages first
        const submissions = await Submission.find({ formId: form._id })
            .sort({ createdAt: -1 });

        // 3. Return the submissions with count summary
        res.status(200).json({
            success: true,
            formName: form.name,
            totalCount: submissions.length,
            submissions,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error retrieving submissions',
            error: error.message,
        });
    }
};

// @desc    Get all forms
// @route   GET /api/forms
export const getAllForms = async (req, res) => {
    try {
        const forms = await Form.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            totalForms: forms.length,
            forms,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error retrieving forms',
            error: error.message,
        });
    }
};

// @desc    Export all submissions for a form as a downloadable CSV file
// @route   GET /api/forms/:formId/export
export const exportSubmissionsCSV = async (req, res) => {
    try {
        const { formId } = req.params;

        if (!mongoose.isValidObjectId(formId)) {
            return res.status(400).json({ success: false, message: 'Invalid Form ID format' });
        }

        // 1. Verify the form exists
        const form = await Form.findById(formId);
        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form not found'
            });
        }

        // 2. Fetch all submissions for this form
        const submissions = await Submission.find({ formId: form._id }).sort({ createdAt: -1 });
        if (submissions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No submissions found to export.',
            });
        }

        // 3. Collect all unique field keys across all submissions
        const allKeys = new Set();
        submissions.forEach((sub) => {
            Object.keys(sub.data || {}).forEach((key) => allKeys.add(key));
        });

        const dynamicColumns = Array.from(allKeys);
        // Combine standard columns with the dynamic columns
        const headers = ['Submission Date', 'IP Address', ...dynamicColumns, 'Is Spam'];


        // 4. Build CSV Rows
        const csvRows = [];
        // Push the header line first
        csvRows.push(headers.map((h) => `"${h}"`).join(','));

        // Push each submission as a comma-separated line
        submissions.forEach((sub) => {
            const row = [
                `"${new Date(sub.createdAt).toLocaleString()}"`,
                `"${sub.ipAddress || 'Unknown'}"`,
                ...dynamicColumns.map((col) => {
                    // Replace any internal double quotes with single quotes so CSV doesn't break
                    const val = sub.data[col] !== undefined ? String(sub.data[col]).replace(/"/g, '""') : '';
                    return `"${val}"`;
                }),
                `"${sub.isSpam ? 'Yes' : 'No'}"`,
            ];
            csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\n');

        // 5. Send CSV file with download headers
        // Clean filename: replaces spaces with dashes
        const safeFilename = `${form.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-submissions.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
        res.status(200).send(csvContent);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error exporting CSV',
            error: error.message,
        });
    }
};


// @desc    Delete a form and all of its associated submissions (Cascade Delete)
// @route   DELETE /api/forms/:formId
export const deleteForm = async (req, res) => {
  try {
    const { formId } = req.params;

    if (!mongoose.isValidObjectId(formId)) {
      return res.status(400).json({ success: false, message: 'Invalid Form ID format' });
    }

    // 1. Verify the form exists
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found',
      });
    }

    // 2. Cascade delete: Delete all submissions linked to this form
    const deleteSubmissionsResult = await Submission.deleteMany({ formId: form._id });

    // 3. Delete the form document itself
    await Form.findByIdAndDelete(form._id);

    res.status(200).json({
      success: true,
      message: 'Form and all associated submissions deleted successfully',
      deletedSubmissionsCount: deleteSubmissionsResult.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error deleting form',
      error: error.message,
    });
  }
};