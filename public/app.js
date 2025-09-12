// Telegram Web App initialization
const tg = window.Telegram.WebApp;
tg.expand();

// Global state
let currentUser = null;
let users = [];
let selectedUserId = null;
let currentTab = 'all-users';
let myReviews = [];
let reviewStatuses = {};

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
        await loadCurrentUser();
        setupTabNavigation();
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
        const initials = getInitials(fullName);
        
        userCard.innerHTML = `
            ${getStatusBadge(user.id)}
            <div class="user-header">
                <div class="user-avatar">
                    ${user.photoUrl ? 
                        `<img src="${user.photoUrl}" alt="${fullName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                         <div style="display: none; align-items: center; justify-content: center; width: 100%; height: 100%;">${initials}</div>` :
                        initials
                    }
                </div>
                <div class="user-info">
                    <h3>${fullName}</h3>
                </div>
            </div>
        `;
        
        userGrid.appendChild(userCard);
    });
}

// Get user initials for avatar fallback
function getInitials(name) {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Setup tab navigation
function setupTabNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
}

// Switch between tabs
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Update active content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabName);
    });
    
    // Load data for specific tab
    if (tabName === 'about-me') {
        // Всегда перезагружаем данные при переходе на вкладку "Про меня"
        loadMyReviews();
    }
}

// Load current user data
async function loadCurrentUser() {
    try {
        const telegramData = tg.initData;
        console.log('Telegram init data:', telegramData); // Debug log
        
        if (!telegramData) {
            console.warn('No Telegram data available');
            return;
        }

        const response = await fetch(`${API_BASE}/users/me`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ telegramData })
        });
        
        if (response.ok) {
            currentUser = await response.json();
            console.log('Current user loaded:', currentUser); // Debug log
            await loadReviewStatuses();
        } else {
            console.error('Failed to load current user:', response.status);
        }
    } catch (error) {
        console.error('Error loading current user:', error);
    }
}

// Load review statuses for all users
async function loadReviewStatuses() {
    if (!currentUser) return;
    
    try {
        // Reset statuses
        reviewStatuses = {};
        
        // Check which users I've reviewed
        for (const user of users) {
            if (user.id === currentUser.id) continue;
            
            const response = await fetch(`${API_BASE}/reviews/check`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegramData: tg.initData,
                    targetUserId: user.id
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                reviewStatuses[user.id] = data.review ? 'reviewed' : 'pending';
            }
        }
        
        // Re-render users with status badges
        renderUsers();
    } catch (error) {
        console.error('Error loading review statuses:', error);
    }
}

// Load my reviews
async function loadMyReviews() {
    const container = document.getElementById('myReviewsContainer');
    
    // Показать загрузку
    container.innerHTML = `
        <div class="empty-state">
            <h3>🔄 Обновление...</h3>
            <p>Загружаем актуальные отзывы</p>
        </div>
    `;
    
    try {
        // Всегда загружаем свежие данные пользователя с отзывами
        const telegramData = tg.initData;
        if (!telegramData) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>⚠️ Данные недоступны</h3>
                    <p>Попробуйте перезапустить приложение</p>
                </div>
            `;
            return;
        }

        const response = await fetch(`${API_BASE}/users/me`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ telegramData })
        });
        
        if (response.ok) {
            const userData = await response.json();
            currentUser = userData; // Обновляем текущего пользователя
            const reviews = userData.receivedReviews || [];
            renderMyReviews(reviews);
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>❌ Ошибка загрузки</h3>
                    <p>Не удалось загрузить отзывы</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading my reviews:', error);
        container.innerHTML = `
            <div class="empty-state">
                <h3>❌ Ошибка загрузки</h3>
                <p>Проверьте подключение к интернету</p>
            </div>
        `;
    }
}

// Render my reviews
function renderMyReviews(reviews) {
    const container = document.getElementById('myReviewsContainer');
    
    if (reviews.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>🌟 Пока нет отзывов</h3>
                <p>Когда коллеги оставят отзывы о вас, они появятся здесь</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = reviews.map(review => `
        <div class="my-review-card">
            <div class="review-from">Анонимный отзыв • ${new Date(review.createdAt).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</div>
            
            <div class="review-item">
                <div class="review-question">💡 Таланты, силы, компетенции, темы:</div>
                <div class="review-answer">${review.talentsAnswer}</div>
                
                <div class="review-question">🎯 Какого клиента бы привели:</div>
                <div class="review-answer">${review.clientAnswer}</div>
            </div>
        </div>
    `).join('');
}

// Get status badge for user
function getStatusBadge(userId) {
    if (!currentUser || userId === currentUser.id) return '';
    
    const status = reviewStatuses[userId];
    if (status === 'reviewed') {
        return '<div class="status-badge status-reviewed">✓</div>';
    }
    
    return ''; // Убираем лишние метки
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
        reviewsList.innerHTML = `
            <div class="empty-state">
                <h3>🌟 Пока нет отзывов</h3>
                <p>Станьте первым, кто оставит отзыв об этом человеке!</p>
            </div>
        `;
        return;
    }
    
    reviewsList.innerHTML = reviews.map(review => `
        <div class="review-item">
            <div class="review-question">💡 Таланты, силы, компетенции, темы:</div>
            <div class="review-answer">${review.talentsAnswer}</div>
            
            <div class="review-question">🎯 Какого клиента бы привели:</div>
            <div class="review-answer">${review.clientAnswer}</div>
            
            <div class="review-date">${new Date(review.createdAt).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}</div>
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
        
        // Update review statuses for all users
        await loadReviewStatuses();
        
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