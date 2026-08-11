let notices = [];

function saveNotices() {
  localStorage.setItem('rentshare_notices', JSON.stringify(notices));
}

function loadNotices() {
  const stored = localStorage.getItem('rentshare_notices');
  if (stored) {
    notices = JSON.parse(stored);
  } else {
    notices = [];
    saveNotices();
  }
  renderNotices(notices);
}

function renderNotices(list) {
  const grid = document.getElementById('noticeGrid');
  grid.innerHTML = '';
  
  const validNotices = list.filter(notice => notice.title && notice.title.trim() !== '');
  
  if (validNotices.length === 0) {
    grid.innerHTML = '<p class="empty-msg">No needs posted yet. Be the first!</p>';
    return;
  }
  
  validNotices.forEach(notice => {
    const card = document.createElement('button');
    card.className = 'notice-card';
    card.innerHTML = `  
      <div class="pin"></div>
      <p class="notice-label">Need</p>
      <p class="notice-title">${notice.title}</p>
      <p class="notice-meta">${notice.meta}</p>
      <div class="notice-footer">
        <span class="offer-link">offer it →</span>
        <button class="delete-btn" onclick="event.stopPropagation(); deleteNotice(${notice.id})">✕</button>
      </div>
    `;
    card.addEventListener('click', function() {
      openOfferModal(notice.id);
    });
    grid.appendChild(card);
  });
}

document.getElementById('pinBtn').addEventListener('click', function() {
  const title = document.getElementById('itemName').value.trim();
  const grade = document.getElementById('itemGrade').value;
  const context = document.getElementById('itemContext').value.trim();
  const from = document.getElementById('itemFrom').value;
  const days = document.getElementById('itemDays').value;
  const price = document.getElementById('itemPrice').value;
  
  if (!title || !context || !from || !days || !price) {
    alert('Please fill in all fields.');
    return;
  }
  
  const newNotice = {
    id: Date.now(),
    title: title,
    meta: grade + ' · ' + context,
    grade: grade,
    context: context,
    from: from,
    days: days,
    price: price,
    borrowerEmail: 'yourname@school.edu'
  };
  
  notices.unshift(newNotice);
  saveNotices();
  renderNotices(notices);
  document.getElementById('TNeed').classList.remove('open');
  document.getElementById('itemName').value = '';
  document.getElementById('itemContext').value = '';
  document.getElementById('itemFrom').value = '';
  document.getElementById('itemDays').value = '';
  document.getElementById('itemPrice').value = '';
});

function deleteNotice(id) {
  if (confirm('Are you sure you want to remove this need?')) {
    notices = notices.filter(function(notice) {
      return notice.id !== id;
    });
    saveNotices();
    renderNotices(notices);
  }
}

let currentOfferId = null;

function openOfferModal(noticeId) {
  currentOfferId = noticeId;
  const notice = notices.find(function(n) {
    return n.id === noticeId;
  });
  if (!notice) return;
  
  document.getElementById('offerTitle').textContent = notice.title;
  document.getElementById('offerMeta').textContent = notice.meta;
  document.getElementById('offerFrom').textContent = notice.from || 'Not specified';
  document.getElementById('offerDays').textContent = notice.days || '-';
  document.getElementById('offerPrice').textContent = notice.price ? 'Rs. ' + notice.price + '/day' : '-';
  
  document.getElementById('offerStep1').classList.remove('hidden');
  document.getElementById('offerStep2').classList.add('hidden');
  document.getElementById('offerStep3').classList.add('hidden');
  document.getElementById('offerModal').classList.add('open');
}

function showOfferForm() {
  document.getElementById('offerStep1').classList.add('hidden');
  document.getElementById('offerStep2').classList.remove('hidden');
  document.getElementById('offerName').value = '';
  document.getElementById('offerDate').value = '';
}

function closeOfferModal() {
  document.getElementById('offerModal').classList.remove('open');
  currentOfferId = null;
}

function submitOffer() {
  const name = document.getElementById('offerName').value.trim();
  const grade = document.getElementById('offerGrade').value;
  const date = document.getElementById('offerDate').value.trim();
  
  if (!name || !date) {
    alert('Please fill in all fields.');
    return;
  }
  
  const notice = notices.find(function(n) {
    return n.id === currentOfferId;
  });
  if (!notice) return;
  
  document.getElementById('borrowerEmail').textContent = notice.borrowerEmail || 'borrower@school.edu';
  
  document.getElementById('offerStep2').classList.add('hidden');
  document.getElementById('offerStep3').classList.remove('hidden');
}

function confirmBooking() {
  if (confirm('Are you sure you want to book this need? It will be removed from the board.')) {
    deleteNotice(currentOfferId);
    closeOfferModal();
  }
}

document.getElementById('OpenBtn').addEventListener('click', function() {
  document.getElementById('TNeed').classList.add('open');
});

document.getElementById('cancelBtn').addEventListener('click', function() {
  document.getElementById('TNeed').classList.remove('open');
});

document.getElementById('TNeed').addEventListener('click', function(e) {
  if (e.target === document.getElementById('TNeed')) {
    document.getElementById('TNeed').classList.remove('open');
  }
});

document.getElementById('offerModal').addEventListener('click', function(e) {
  if (e.target === document.getElementById('offerModal')) {
    closeOfferModal();
  }
});

loadNotices();