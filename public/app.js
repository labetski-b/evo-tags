// Telegram Web App initialization
const tg = window.Telegram.WebApp;
tg.expand();

// Global state
let currentUser = null;
let users = [];
let selectedUserId = null;

// API base URL
const API_BASE = '/api';

// Elements
const userGrid = document.getElementById('userGrid');
const userModal = document.getElementById('userModal');
const reviewModal = document.getElementById('reviewModal');
const loading = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading(true);
        await loadUsers();
        showLoading(false);
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Ошибка при загрузке данных');
        showLoading(false);
    }
});

// Show/hide loading
function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

// Show error message
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// Show success message
function showSuccess(message) {
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    setTimeout(() => {
        successDiv.style.display = 'none';
    }, 3000);
}

// Load users
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`);
        if (!response.ok) throw new Error('Failed to load users');
        
        users = await response.json();
        renderUsers();
    } catch (error) {
        console.error('Error loading users:', error);
        throw error;
    }
}

// Render users grid
function renderUsers() {
    userGrid.innerHTML = '';
    
    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        userCard.onclick = () => openUserModal(user);
        
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
        const username = user.username ? `@${user.username}` : '';
        
        userCard.innerHTML = `
            <div class="user-info">
                <h3>${fullName}</h3>
                ${username ? `<div class="username">${username}</div>` : ''}
            </div>
        `;
        
        userGrid.appendChild(userCard);
    });
}

// Open user modal
async function openUserModal(user) {
    selectedUserId = user.id;
    document.getElementById('modalTitle').textContent = [user.firstName, user.lastName].filter(Boolean).join(' ');
    
    try {
        showLoading(true);
        await loadUserReviews(user.id);
        userModal.style.display = 'block';
        showLoading(false);
    } catch (error) {
        console.error('Error loading user reviews:', error);
        showError('Ошибка при загрузке отзывов');
        showLoading(false);
    }
}

// Load user reviews
async function loadUserReviews(userId) {
    try {
        const response = await fetch(`${API_BASE}/users/${userId}/reviews`);
        if (!response.ok) throw new Error('Failed to load reviews');
        
        const reviews = await response.json();
        renderReviews(reviews);
    } catch (error) {
        console.error('Error loading reviews:', error);
        throw error;
    }
}

// Render reviews
function renderReviews(reviews) {
    const reviewsList = document.getElementById('reviewsList');
    
    if (reviews.length === 0) {
        reviewsList.innerHTML = '<p>Пока нет отзывов об этом человеке</p>';
        return;
    }
    
    reviewsList.innerHTML = reviews.map(review => `
        <div class="review-item">
            <div class="review-question">Таланты, силы, компетенции, темы:</div>
            <div class="review-answer">${review.talentsAnswer}</div>
            
            <div class="review-question">Какого клиента бы привели:</div>
            <div class="review-answer">${review.clientAnswer}</div>
            
            <div class="review-date">${new Date(review.createdAt).toLocaleDateString('ru-RU')}</div>
        </div>
    `).join('');
}

// Open review modal
async function openReviewModal() {
    // Check if user already has a review for this person
    try {
        const telegramData = tg.initData;
        const response = await fetch(`${API_BASE}/reviews/check`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegramData,
                targetUserId: selectedUserId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.review) {
                // Pre-fill form with existing review
                document.getElementById('talentsAnswer').value = data.review.talentsAnswer;
                document.getElementById('clientAnswer').value = data.review.clientAnswer;
            }
        }
    } catch (error) {
        console.error('Error checking existing review:', error);
    }
    
    reviewModal.style.display = 'block';
    userModal.style.display = 'none';
}

// Submit review
async function submitReview(event) {
    event.preventDefault();
    
    const talentsAnswer = document.getElementById('talentsAnswer').value.trim();
    const clientAnswer = document.getElementById('clientAnswer').value.trim();
    
    if (!talentsAnswer || !clientAnswer) {
        showError('Пожалуйста, заполните все поля');
        return;
    }
    
    try {
        showLoading(true);
        
        const telegramData = tg.initData;
        const response = await fetch(`${API_BASE}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegramData,
                targetUserId: selectedUserId,
                talentsAnswer,
                clientAnswer
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit review');
        }
        
        showSuccess('Отзыв успешно сохранен!');
        reviewModal.style.display = 'none';
        document.getElementById('reviewForm').reset();
        
        // Reload reviews for the user
        await loadUserReviews(selectedUserId);
        userModal.style.display = 'block';
        
        showLoading(false);
    } catch (error) {
        console.error('Error submitting review:', error);
        showError(error.message);
        showLoading(false);
    }
}

// Event listeners
document.getElementById('closeModal').onclick = () => {
    userModal.style.display = 'none';
};

document.getElementById('writeReviewBtn').onclick = openReviewModal;

document.getElementById('closeReviewModal').onclick = () => {
    reviewModal.style.display = 'none';
    userModal.style.display = 'block';
};

document.getElementById('cancelReview').onclick = () => {
    reviewModal.style.display = 'none';
    userModal.style.display = 'block';
};

document.getElementById('reviewForm').onsubmit = submitReview;

// Close modals on outside click
window.onclick = (event) => {
    if (event.target === userModal) {
        userModal.style.display = 'none';
    }
    if (event.target === reviewModal) {
        reviewModal.style.display = 'none';
        userModal.style.display = 'block';
    }
};