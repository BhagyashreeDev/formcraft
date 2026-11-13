// 1. In-memory state to store our forms
let allForms = [];

// 2. Grabbing HTML elements from the page (DOM Selection)
const formsContainer = document.getElementById('formsContainer');
const statTotalForms = document.getElementById('statTotalForms');
const statTotalSubmissions = document.getElementById('statTotalSubmissions');
const statSpamCaught = document.getElementById('statSpamCaught');

// 3. Modal Popup Elements
const createModal = document.getElementById('createModal');
const submissionsModal = document.getElementById('submissionsModal');
const embedModal = document.getElementById('embedModal');


// ==========================================
// 4. Fetch All Forms from Express Backend
// ==========================================
async function loadForms() {
  try {
    // Make an HTTP GET request to our Express route
    const res = await fetch('/api/forms');
    const data = await res.json();

    if (!data.success) {
      throw new Error(data.message || 'Failed to load forms');
    }

    // Save the retrieved forms into our state array
    allForms = data.forms;

    // Refresh the UI
    renderForms();
    updateGlobalStats();
  } catch (err) {
    console.error('Error loading forms:', err);
    formsContainer.innerHTML = `
      <div class="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
        Failed to load forms. Make sure the server is running.
      </div>
    `;
  }
}

// ==========================================
// 5. Render Form Cards onto the Screen
// ==========================================
function renderForms() {
  // Empty State: If the user hasn't created any forms yet
  if (allForms.length === 0) {
    formsContainer.innerHTML = `
      <div class="col-span-full p-12 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
        <p class="text-sm font-medium text-gray-900">No forms yet</p>
        <p class="text-xs text-gray-500 mt-1">Click "+ Create Form" above to get your first endpoint.</p>
      </div>
    `;
    return;
  }

  // Transform each form object into an HTML card string
  formsContainer.innerHTML = allForms
    .map((form) => {
      // Dynamic Endpoint URL (automatically adapts to localhost or production domain!)
      const endpoint = `${window.location.origin}/api/submit/${form._id}`;

      return `
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div class="flex items-start justify-between">
              <div>
                <h3 class="font-semibold text-gray-900 text-sm">${escapeHtml(form.name)}</h3>
                <p class="text-xs text-gray-500 mt-0.5">${escapeHtml(form.notificationEmail)}</p>
              </div>
              <span class="text-[11px] font-medium px-2 py-0.5 rounded-full ${form.isActive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'}">
                ${form.isActive ? 'Active' : 'Paused'}
              </span>
            </div>

            <!-- Endpoint bar with copy button -->
            <div class="mt-3 flex items-center bg-gray-50 border border-gray-200 rounded-lg p-1.5 text-xs">
              <span class="font-mono text-gray-600 truncate flex-1 px-2" title="${endpoint}">${endpoint}</span>
              <button onclick="copyToClipboard('${endpoint}', this)" class="bg-white hover:bg-gray-100 text-gray-700 font-medium px-2.5 py-1 rounded border border-gray-200 transition">
                Copy
              </button>
            </div>
          </div>

          <!-- Bottom Actions -->
          <div class="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <div class="flex items-center space-x-2">
              <button onclick="viewSubmissions('${form._id}')" class="bg-gray-900 hover:bg-black text-white font-medium px-3 py-1.5 rounded-md transition">
                View Inbox
              </button>
              <a href="/api/forms/${form._id}/export" class="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-2.5 py-1.5 rounded-md transition border border-gray-200">
                Export CSV
              </a>
              <button onclick="showEmbedModal('${endpoint}')" class="text-gray-600 hover:text-gray-900 px-2 py-1.5 font-mono">
                &lt;/&gt;
              </button>
            </div>

            <button onclick="deleteForm('${form._id}')" class="text-red-600 hover:text-red-700 hover:underline">
              Delete
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

// ==========================================
// 6. Update Global Metrics (Forms, Submissions, Spam)
// ==========================================
async function updateGlobalStats() {
  statTotalForms.textContent = allForms.length;

  let totalSubs = 0;
  let totalSpam = 0;

  // Loop through all forms to calculate total submissions and spam count
  for (const form of allForms) {
    try {
      const res = await fetch(`/api/forms/${form._id}/submissions`);
      const data = await res.json();
      if (data.success && data.submissions) {
        totalSubs += data.submissions.length;
        totalSpam += data.submissions.filter((s) => s.isSpam).length;
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Update the DOM text
  statTotalSubmissions.textContent = totalSubs;
  statSpamCaught.textContent = totalSpam;
}

// ==========================================
// 7. Open Submissions Inbox Modal
// ==========================================
async function viewSubmissions(formId) {
  const targetForm = allForms.find((f) => f._id === formId);
  const formName = targetForm ? targetForm.name : 'Form Submissions';
  document.getElementById('modalFormTitle').textContent = formName;
  const listEl = document.getElementById('submissionsList');

  // Show temporary loading indicator
  listEl.innerHTML = `<div class="p-6 text-center text-xs text-gray-500">Loading messages...</div>`;

  // Open the modal by removing the 'hidden' class!
  submissionsModal.classList.remove('hidden');

  try {
    const res = await fetch(`/api/forms/${formId}/submissions`);
    const data = await res.json();

    if (!data.success || !data.submissions.length) {
      listEl.innerHTML = `<div class="p-8 text-center text-xs text-gray-500">No submissions yet for this form.</div>`;
      return;
    }

    // Render each message card
    listEl.innerHTML = data.submissions
      .map((sub) => {
        const dateStr = new Date(sub.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        // Object.entries turns { name: "Alex", budget: "$95k" } into [ ["name", "Alex"], ["budget", "$95k"] ]
        const fieldsHtml = Object.entries(sub.data || {})
          .map(([key, val]) => `
            <div class="text-xs">
              <span class="font-medium text-gray-500">${escapeHtml(key)}:</span>
              <span class="text-gray-900 ml-1 font-mono">${escapeHtml(String(val))}</span>
            </div>
          `)
          .join('');

        return `
          <div class="p-3.5 rounded-lg border ${sub.isSpam ? 'bg-amber-50/50 border-amber-200' : 'bg-gray-50 border-gray-200'} space-y-2">
            <div class="flex items-center justify-between text-[11px] text-gray-500 pb-2 border-b border-gray-200/60">
              <div>
                <span>${dateStr}</span>
                <span class="mx-1">•</span>
                <span>IP: ${escapeHtml(sub.ipAddress)}</span>
              </div>
              ${sub.isSpam ? '<span class="text-amber-700 bg-amber-100 font-semibold px-2 py-0.5 rounded text-[10px]">SPAM FILTERED</span>' : ''}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${fieldsHtml}
            </div>
          </div>
        `;
      })
      .join('');
  } catch (err) {
    listEl.innerHTML = `<div class="p-6 text-center text-xs text-red-500">Error loading messages.</div>`;
  }
}

// ==========================================
// 8. Delete a Form (Calls our DELETE API)
// ==========================================
async function deleteForm(formId) {
  if (!confirm('Are you sure you want to delete this form and all its messages?')) return;

  try {
    const res = await fetch(`/api/forms/${formId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      // Re-fetch all forms to update the screen
      await loadForms();
    } else {
      alert(data.message || 'Failed to delete');
    }
  } catch (err) {
    alert('Server error deleting form');
  }
}


// ==========================================
// 9. Populate the Target Dropdown in the Sandbox
// ==========================================
function populateSandboxSelect() {
  sandboxFormSelect.innerHTML = allForms.length
    ? allForms.map((f) => `<option value="${f._id}">${escapeHtml(f.name)}</option>`).join('')
    : `<option value="">No forms available</option>`;
}

// ==========================================
// 10. Show Embed Code Snippet Modal
// ==========================================
function showEmbedModal(endpointUrl) {
  const snippet = `<!-- FormCraft HTML Embed -->
<form action="${endpointUrl}" method="POST">
  <!-- Honeypot spam trap (Leave hidden from humans) -->
  <input type="text" name="_gotcha" style="display:none" tabindex="-1" autocomplete="off" />

  <label for="name">Your Name</label>
  <input type="text" id="name" name="name" required />

  <label for="email">Your Email</label>
  <input type="email" id="email" name="email" required />

  <label for="message">Message</label>
  <textarea id="message" name="message" required></textarea>

  <button type="submit">Send</button>
</form>`;

  document.getElementById('embedCodeSnippet').textContent = snippet;
  embedModal.classList.remove('hidden');
}

// Utility: Copy text to clipboard
function copyToClipboard(text, btnElement) {
  navigator.clipboard.writeText(text);
  const orig = btnElement.textContent;
  btnElement.textContent = 'Copied!';
  setTimeout(() => (btnElement.textContent = orig), 1500);
}

// ==========================================
// 11. Modal Open / Close Buttons
// ==========================================
document.getElementById('openCreateModalBtn').onclick = () => createModal.classList.remove('hidden');
document.getElementById('closeCreateModalBtn').onclick = () => createModal.classList.add('hidden');
document.getElementById('cancelCreateModalBtn').onclick = () => createModal.classList.add('hidden');
document.getElementById('closeSubmissionsModalBtn').onclick = () => submissionsModal.classList.add('hidden');
document.getElementById('closeEmbedModalBtn').onclick = () => embedModal.classList.add('hidden');

document.getElementById('copyEmbedBtn').onclick = function () {
  const snippet = document.getElementById('embedCodeSnippet').textContent;
  navigator.clipboard.writeText(snippet);
  this.textContent = 'Copied!';
  setTimeout(() => (this.textContent = 'Copy Snippet'), 1500);
};


// ==========================================
// 12. Create New Form Submission Handler
// ==========================================
document.getElementById('createFormElement').onsubmit = async (e) => {
  // CRUCIAL: e.preventDefault() prevents the browser from reloading the page!
  e.preventDefault();

  const name = document.getElementById('newFormName').value.trim();
  const notificationEmail = document.getElementById('newFormEmail').value.trim();
  const customRedirect = document.getElementById('newFormRedirect').value.trim();

  try {
    const res = await fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, notificationEmail, customRedirect }),
    });
    const data = await res.json();

    if (data.success) {
      createModal.classList.add('hidden');
      document.getElementById('createFormElement').reset();
      // Reload forms list to show the new card immediately!
      await loadForms();
    } else {
      alert(data.message || 'Error creating form');
    }
  } catch (err) {
    alert('Server error creating form');
  }
};


// ==========================================
// 13. Testing Sandbox Submit Handler
// ==========================================
document.getElementById('sandboxForm').onsubmit = async (e) => {
  e.preventDefault();
  const formId = sandboxFormSelect.value;
  if (!formId) return alert('Select a form first');

  const btn = document.getElementById('sandboxSubmitBtn');
  btn.textContent = 'Submitting...';
  btn.disabled = true;

  const payload = {
    visitorName: document.getElementById('sandboxName').value,
    visitorEmail: document.getElementById('sandboxEmail').value,
    message: document.getElementById('sandboxMessage').value,
  };

  // If the honeypot spam checkbox is checked, attach _gotcha to test spam detection
  if (document.getElementById('sandboxIsSpamTest').checked) {
    payload._gotcha = 'I am an automated spam bot';
  }

  try {
    const res = await fetch(`/api/submit/${formId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      alert('🎉 Message sent and saved to MongoDB!');
      document.getElementById('sandboxMessage').value = '';
      // Refresh the metrics and forms immediately!
      await loadForms();
    } else {
      alert(data.message || 'Submission failed');
    }
  } catch (err) {
    alert('Server error submitting test message');
  } finally {
    btn.textContent = 'Submit Test Message';
    btn.disabled = false;
  }
};

// ==========================================
// 14. Start the Application!
// ==========================================
loadForms();

// Security helper: Prevents Cross-Site Scripting (XSS) attacks
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

