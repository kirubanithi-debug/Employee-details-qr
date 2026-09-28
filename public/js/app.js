document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('profileForm');
  const photoInput = document.getElementById('photoInput');
  const dropArea = document.getElementById('dropArea');
  const previewContainer = document.getElementById('previewContainer');
  const previewImg = document.getElementById('previewImg');
  const previewName = document.getElementById('previewName');
  const previewSize = document.getElementById('previewSize');
  const btnRemovePhoto = document.getElementById('btnRemovePhoto');

  const companyLogoInput = document.getElementById('companyLogoInput');
  const companyDropArea = document.getElementById('companyDropArea');
  const companyPreviewContainer = document.getElementById('companyPreviewContainer');
  const companyPreviewImg = document.getElementById('companyPreviewImg');
  const companyPreviewName = document.getElementById('companyPreviewName');
  const companyPreviewSize = document.getElementById('companyPreviewSize');
  const btnRemoveCompanyLogo = document.getElementById('btnRemoveCompanyLogo');

  const contentInput = document.getElementById('contentInput');
  const btnGenerate = document.getElementById('btnGenerate');

  const resultCard = document.getElementById('resultCard');
  const generatedUrlInput = document.getElementById('generatedUrlInput');
  const btnCopyLink = document.getElementById('btnCopyLink');
  const btnOpenLink = document.getElementById('btnOpenLink');
  const toast = document.getElementById('toast');

  // History & Modal Elements
  const historyList = document.getElementById('historyList');
  const historySearchInput = document.getElementById('historySearchInput');
  const historyCountBadge = document.getElementById('historyCountBadge');
  const btnRefreshHistory = document.getElementById('btnRefreshHistory');

  const qrModal = document.getElementById('qrModal');
  const modalQrId = document.getElementById('modalQrId');
  const modalQrUrl = document.getElementById('modalQrUrl');
  const qrCanvas = document.getElementById('qrCanvas');
  const btnCloseQrModal = document.getElementById('btnCloseQrModal');
  const btnDownloadQr = document.getElementById('btnDownloadQr');
  const btnCopyModalUrl = document.getElementById('btnCopyModalUrl');

  const editModal = document.getElementById('editModal');
  const editModalId = document.getElementById('editModalId');
  const editProfileIdInput = document.getElementById('editProfileIdInput');
  const editContentInput = document.getElementById('editContentInput');
  const editPhotoInput = document.getElementById('editPhotoInput');
  const editCompanyLogoInput = document.getElementById('editCompanyLogoInput');
  const editCurrentPhotoPreview = document.getElementById('editCurrentPhotoPreview');
  const editCurrentLogoPreview = document.getElementById('editCurrentLogoPreview');
  const btnCloseEditModal = document.getElementById('btnCloseEditModal');
  const btnCancelEdit = document.getElementById('btnCancelEdit');
  const editProfileForm = document.getElementById('editProfileForm');
  const btnSaveEdit = document.getElementById('btnSaveEdit');

  let selectedFile = null;
  let selectedCompanyLogoFile = null;
  let allProfiles = [];
  let currentQrData = { id: '', url: '' };

  // Drag and Drop Handling - Employee Photo
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    if (dropArea) dropArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (dropArea) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
    });

    dropArea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) handleFile(files[0]);
    });
  }

  if (photoInput) {
    photoInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) handleFile(e.target.files[0]);
    });
  }

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, etc.).');
      return;
    }
    selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewName.textContent = file.name;
      previewSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
      
      dropArea.style.display = 'none';
      previewContainer.classList.add('active');
    };
    reader.readAsDataURL(file);
  }

  if (btnRemovePhoto) {
    btnRemovePhoto.addEventListener('click', () => {
      selectedFile = null;
      photoInput.value = '';
      previewImg.src = '';
      previewContainer.classList.remove('active');
      dropArea.style.display = 'flex';
    });
  }

  // Drag and Drop Handling - Company Logo
  if (companyDropArea && companyLogoInput) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      companyDropArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      companyDropArea.addEventListener(eventName, () => companyDropArea.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      companyDropArea.addEventListener(eventName, () => companyDropArea.classList.remove('dragover'), false);
    });

    companyDropArea.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) handleCompanyLogoFile(files[0]);
    });

    companyLogoInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) handleCompanyLogoFile(e.target.files[0]);
    });

    function handleCompanyLogoFile(file) {
      if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file for company logo.');
        return;
      }
      selectedCompanyLogoFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        companyPreviewImg.src = e.target.result;
        companyPreviewName.textContent = file.name;
        companyPreviewSize.textContent = (file.size / 1024).toFixed(1) + ' KB';
        
        companyDropArea.style.display = 'none';
        companyPreviewContainer.classList.add('active');
      };
      reader.readAsDataURL(file);
    }

    if (btnRemoveCompanyLogo) {
      btnRemoveCompanyLogo.addEventListener('click', () => {
        selectedCompanyLogoFile = null;
        companyLogoInput.value = '';
        companyPreviewImg.src = '';
        companyPreviewContainer.classList.remove('active');
        companyDropArea.style.display = 'flex';
      });
    }
  }

  // Helper for generating absolute link
  function getFullProfileUrl(id) {
    const customDomain = document.getElementById('customDomainInput')?.value.trim();
    if (customDomain) {
      let cleanDomain = customDomain.replace(/\/+$/, '');
      if (!cleanDomain.startsWith('http://') && !cleanDomain.startsWith('https://')) {
        cleanDomain = 'https://' + cleanDomain;
      }
      return `${cleanDomain}/e/${id}`;
    }
    const currentHost = window.location.host;
    const protocol = window.location.protocol;
    return `${protocol}//${currentHost}/e/${id}`;
  }

  // Form Submit & Link Generation
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const rawContent = contentInput.value;
      if (!rawContent.trim()) {
        showToast('Please enter employee information.');
        contentInput.focus();
        return;
      }

      btnGenerate.disabled = true;
      btnGenerate.innerHTML = `
        <div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
        Generating Link...
      `;

      try {
        const formData = new FormData();
        formData.append('content', rawContent);
        if (selectedFile) formData.append('photo', selectedFile);
        if (selectedCompanyLogoFile) formData.append('companyLogo', selectedCompanyLogoFile);

        const response = await fetch('/api/profiles', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate profile link.');
        }

        const fullUrl = getFullProfileUrl(data.id);
        generatedUrlInput.value = fullUrl;
        btnOpenLink.href = `/e/${data.id}`;

        resultCard.classList.add('active');
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        showToast('Profile created successfully!');
        loadHistory(); // Refresh history list immediately

      } catch (err) {
        console.error(err);
        showToast(err.message || 'An error occurred. Please try again.');
      } finally {
        btnGenerate.disabled = false;
        btnGenerate.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          Generate Link
        `;
      }
    });
  }

  // Copy Link Control
  if (btnCopyLink) {
    btnCopyLink.addEventListener('click', async () => {
      const url = generatedUrlInput.value;
      if (!url) return;
      copyToClipboard(url);
    });
  }

  // Load Profile History
  async function loadHistory() {
    if (!historyList) return;

    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      allProfiles = data.profiles || [];
      renderHistory();
    } catch (err) {
      console.error('Failed to load history:', err);
      historyList.innerHTML = `<div class="empty-history-state"><p>Failed to load profile history.</p></div>`;
    }
  }

  function renderHistory() {
    if (!historyList) return;

    const searchTerm = (historySearchInput?.value || '').toLowerCase().trim();
    const filtered = allProfiles.filter(p => {
      if (!searchTerm) return true;
      return (
        p.id.toLowerCase().includes(searchTerm) ||
        (p.content || '').toLowerCase().includes(searchTerm)
      );
    });

    if (historyCountBadge) {
      historyCountBadge.textContent = `${filtered.length} Profile${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
          </svg>
          <p>${searchTerm ? 'No matching profiles found.' : 'No profiles generated yet.'}</p>
        </div>
      `;
      return;
    }

    historyList.innerHTML = filtered.map(p => {
      const fullUrl = getFullProfileUrl(p.id);
      const firstLine = (p.content || '').split('\n').find(l => l.trim().length > 0) || 'Employee Profile';
      const createdDate = p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'Recently';

      return `
        <div class="history-item-card" data-id="${p.id}">
          <div class="history-avatar-group">
            <img class="history-avatar" src="${p.photoUrl || '/assets/default-avatar.svg'}" alt="Avatar" onerror="this.src='/assets/default-avatar.svg'">
            <img class="history-logo-badge" src="${p.companyLogoUrl || '/assets/isdd-logo-light.png'}" alt="Logo" onerror="this.src='/assets/isdd-logo-light.png'">
          </div>
          
          <div class="history-info">
            <div class="history-item-header">
              <span class="badge-id">${escapeHtml(p.id)}</span>
              <span class="history-time">${escapeHtml(createdDate)}</span>
            </div>
            <div class="history-preview-text" title="${escapeHtml(p.content)}">
              ${escapeHtml(firstLine)}
            </div>
          </div>

          <div class="history-actions">
            <a href="/e/${p.id}" target="_blank" class="btn-icon-action" title="View Profile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              View
            </a>
            <button type="button" class="btn-icon-action btn-copy-item" data-url="${fullUrl}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy
            </button>
            <button type="button" class="btn-icon-action btn-qr-item" data-id="${p.id}" data-url="${fullUrl}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
              QR Code
            </button>
            <button type="button" class="btn-icon-action btn-icon-edit btn-edit-item" data-id="${p.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit Live
            </button>
            <button type="button" class="btn-icon-action btn-icon-delete btn-delete-item" data-id="${p.id}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach Action Listeners
    historyList.querySelectorAll('.btn-copy-item').forEach(btn => {
      btn.addEventListener('click', () => copyToClipboard(btn.dataset.url));
    });

    historyList.querySelectorAll('.btn-qr-item').forEach(btn => {
      btn.addEventListener('click', () => openQrModal(btn.dataset.id, btn.dataset.url));
    });

    historyList.querySelectorAll('.btn-edit-item').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });

    historyList.querySelectorAll('.btn-delete-item').forEach(btn => {
      btn.addEventListener('click', () => deleteProfile(btn.dataset.id));
    });
  }

  if (historySearchInput) {
    historySearchInput.addEventListener('input', renderHistory);
  }

  if (btnRefreshHistory) {
    btnRefreshHistory.addEventListener('click', () => {
      loadHistory();
      showToast('Profile history refreshed.');
    });
  }

  // QR Modal Functions
  function openQrModal(id, url) {
    currentQrData = { id, url };
    modalQrId.textContent = `ID: ${id}`;
    modalQrUrl.textContent = url;

    // Generate QR Code onto Canvas using QRCode library if available
    if (window.QRCode && window.QRCode.toCanvas) {
      window.QRCode.toCanvas(qrCanvas, url, {
        width: 220,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' }
      }, function (error) {
        if (error) console.error('QR generation error:', error);
      });
    } else {
      // Fallback Google Charts API image on Canvas
      const ctx = qrCanvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
      img.onload = () => {
        qrCanvas.width = 220;
        qrCanvas.height = 220;
        ctx.drawImage(img, 0, 0, 220, 220);
      };
    }

    qrModal.classList.add('active');
  }

  if (btnCloseQrModal) {
    btnCloseQrModal.addEventListener('click', () => qrModal.classList.remove('active'));
  }

  if (btnCopyModalUrl) {
    btnCopyModalUrl.addEventListener('click', () => copyToClipboard(currentQrData.url));
  }

  if (btnDownloadQr) {
    btnDownloadQr.addEventListener('click', () => {
      if (!qrCanvas) return;
      const imageURI = qrCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `QRCode-${currentQrData.id}.png`;
      link.href = imageURI;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Downloaded QRCode-${currentQrData.id}.png`);
    });
  }

  // Live Edit Modal Functions
  function openEditModal(id) {
    const profile = allProfiles.find(p => p.id === id);
    if (!profile) return;

    editModalId.textContent = `ID: ${id}`;
    editProfileIdInput.value = id;
    editContentInput.value = profile.content || '';
    editCurrentPhotoPreview.src = profile.photoUrl || '/assets/default-avatar.svg';
    editCurrentLogoPreview.src = profile.companyLogoUrl || '/assets/isdd-logo-light.png';
    editPhotoInput.value = '';
    editCompanyLogoInput.value = '';

    editModal.classList.add('active');
  }

  if (btnCloseEditModal) {
    btnCloseEditModal.addEventListener('click', () => editModal.classList.remove('active'));
  }
  if (btnCancelEdit) {
    btnCancelEdit.addEventListener('click', () => editModal.classList.remove('active'));
  }

  if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = editProfileIdInput.value;
      const content = editContentInput.value;

      if (!content.trim()) {
        showToast('Profile content cannot be empty.');
        return;
      }

      btnSaveEdit.disabled = true;
      btnSaveEdit.textContent = 'Saving Changes...';

      try {
        const formData = new FormData();
        formData.append('content', content);
        if (editPhotoInput.files && editPhotoInput.files[0]) {
          formData.append('photo', editPhotoInput.files[0]);
        }
        if (editCompanyLogoInput.files && editCompanyLogoInput.files[0]) {
          formData.append('companyLogo', editCompanyLogoInput.files[0]);
        }

        const res = await fetch(`/api/profiles/${id}`, {
          method: 'PUT',
          body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to update profile.');
        }

        showToast(`Profile ${id} updated live successfully!`);
        editModal.classList.remove('active');
        loadHistory();

      } catch (err) {
        console.error('Error updating profile:', err);
        showToast(err.message || 'Failed to update profile.');
      } finally {
        btnSaveEdit.disabled = false;
        btnSaveEdit.textContent = 'Save Live Changes';
      }
    });
  }

  // Delete Profile Function
  async function deleteProfile(id) {
    if (!confirm(`Are you sure you want to delete profile ${id}? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete profile');
      }

      showToast(`Profile ${id} deleted.`);
      loadHistory();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to delete profile.');
    }
  }

  // Helper Toast & Clipboard Functions
  async function copyToClipboard(url) {
    if (!url) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const dummy = document.createElement('input');
        document.body.appendChild(dummy);
        dummy.value = url;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
      }
      showToast('Link copied to clipboard!');
    } catch (e) {
      showToast('Failed to copy link.');
    }
  }

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial load
  loadHistory();
});
