document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('profileForm');
  const photoInput = document.getElementById('photoInput');
  const dropArea = document.getElementById('dropArea');
  const previewContainer = document.getElementById('previewContainer');
  const previewImg = document.getElementById('previewImg');
  const previewName = document.getElementById('previewName');
  const previewSize = document.getElementById('previewSize');
  const btnRemovePhoto = document.getElementById('btnRemovePhoto');
  const contentInput = document.getElementById('contentInput');
  const btnGenerate = document.getElementById('btnGenerate');

  const resultCard = document.getElementById('resultCard');
  const generatedUrlInput = document.getElementById('generatedUrlInput');
  const btnCopyLink = document.getElementById('btnCopyLink');
  const btnOpenLink = document.getElementById('btnOpenLink');
  const toast = document.getElementById('toast');

  let selectedFile = null;

  // Drag and Drop Handling
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, () => dropArea.classList.remove('dragover'), false);
  });

  dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  photoInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  function handleFile(file) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, etc.).');
      return;
    }
    selectedFile = file;

    // Read preview
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

  btnRemovePhoto.addEventListener('click', () => {
    selectedFile = null;
    photoInput.value = '';
    previewImg.src = '';
    previewContainer.classList.remove('active');
    dropArea.style.display = 'flex';
  });

  // Form Submit & Link Generation
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rawContent = contentInput.value;
    if (!rawContent.trim()) {
      showToast('Please enter employee information.');
      contentInput.focus();
      return;
    }

    // UI Loading state
    btnGenerate.disabled = true;
    btnGenerate.innerHTML = `
      <div class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
      Generating Link...
    `;

    try {
      const formData = new FormData();
      formData.append('content', rawContent); // exact unmodified plain text
      if (selectedFile) {
        formData.append('photo', selectedFile);
      }

      const response = await fetch('/api/profiles', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate profile link.');
      }

      // Determine final link (Use custom domain if provided, or current window host)
      const customDomain = document.getElementById('customDomainInput')?.value.trim();
      let fullUrl;

      if (customDomain) {
        let cleanDomain = customDomain.replace(/\/+$/, '');
        if (!cleanDomain.startsWith('http://') && !cleanDomain.startsWith('https://')) {
          cleanDomain = 'https://' + cleanDomain;
        }
        fullUrl = `${cleanDomain}/e/${data.id}`;
      } else {
        const currentHost = window.location.host;
        const protocol = window.location.protocol;
        fullUrl = `${protocol}//${currentHost}/e/${data.id}`;
      }

      generatedUrlInput.value = fullUrl;
      btnOpenLink.href = `/e/${data.id}`;

      // Display result card
      resultCard.classList.add('active');
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

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

  // Copy Link Control
  btnCopyLink.addEventListener('click', async () => {
    const url = generatedUrlInput.value;
    if (!url) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        generatedUrlInput.select();
        document.execCommand('copy');
      }

      // Visual Copy Feedback
      btnCopyLink.classList.add('copied');
      btnCopyLink.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied!
      `;

      showToast('Link copied to clipboard!');

      setTimeout(() => {
        btnCopyLink.classList.remove('copied');
        btnCopyLink.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy Link
        `;
      }, 2500);

    } catch (err) {
      console.error('Failed to copy', err);
      showToast('Failed to copy. Please copy manually.');
    }
  });

  // Helper Toast function
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
});
