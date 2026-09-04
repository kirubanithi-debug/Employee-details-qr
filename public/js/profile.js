document.addEventListener('DOMContentLoaded', async () => {
  const loader = document.getElementById('loader');
  const profileContent = document.getElementById('profileContent');
  const errorState = document.getElementById('errorState');
  const employeeAvatar = document.getElementById('employeeAvatar');
  const exactTextContent = document.getElementById('exactTextContent');

  // Extract ID from pathname: /e/8F72KQ -> 8F72KQ
  const pathParts = window.location.pathname.split('/');
  const profileId = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];

  if (!profileId || profileId === 'e') {
    showError();
    return;
  }

  try {
    const response = await fetch(`/api/profiles/${encodeURIComponent(profileId)}`);
    if (!response.ok) {
      throw new Error('Profile not found');
    }

    const data = await response.json();

    // Set Avatar Photo
    if (data.photoUrl) {
      employeeAvatar.src = data.photoUrl;
    } else {
      employeeAvatar.src = '/assets/default-avatar.svg';
    }

    // Render text with distinct colors for Labels (Name, Email, ID, etc.) and Values
    exactTextContent.innerHTML = renderStyledContent(data.content);

    // Optional page title extraction (non-intrusive)
    const firstLine = (data.content || '').split('\n')[0] || '';
    if (firstLine.includes(':')) {
      const nameVal = firstLine.split(':')[1].trim();
      if (nameVal) {
        document.title = `${nameVal} - Employee Profile`;
      }
    }

    // Hide loader & display content
    loader.style.display = 'none';
    profileContent.style.display = 'block';

  } catch (err) {
    console.error('Failed to load profile:', err);
    showError();
  }

  function showError() {
    loader.style.display = 'none';
    profileContent.style.display = 'none';
    errorState.style.display = 'flex';
  }
});

/**
 * Safely renders exact plain text with distinct color styling for labels (Name, Email, ID, Phone) and content values.
 */
function renderStyledContent(rawText) {
  if (!rawText) return '';
  
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  const lines = rawText.split('\n');
  const renderedLines = lines.map(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const label = line.substring(0, colonIndex + 1);
      const value = line.substring(colonIndex + 1);
      
      let labelClass = 'profile-label';
      let valueClass = 'profile-value';

      const lowerLabel = label.toLowerCase();
      if (lowerLabel.includes('name')) {
        labelClass += ' label-name';
        valueClass += ' value-name';
      } else if (lowerLabel.includes('email')) {
        labelClass += ' label-email';
        valueClass += ' value-email';
      } else if (lowerLabel.includes('phone') || lowerLabel.includes('mobile') || lowerLabel.includes('contact')) {
        labelClass += ' label-phone';
        valueClass += ' value-phone';
      } else if (lowerLabel.includes('id')) {
        labelClass += ' label-id';
        valueClass += ' value-id';
      }

      return `<div class="profile-line"><span class="${labelClass}">${escapeHtml(label)}</span><span class="${valueClass}">${escapeHtml(value)}</span></div>`;
    } else {
      return `<div class="profile-line"><span class="profile-text">${escapeHtml(line)}</span></div>`;
    }
  });

  return renderedLines.join('');
}
