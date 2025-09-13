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
        
        // Timeout для защиты от зависания
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
        );
        
        await Promise.race([
            (async () => {
                await loadCurrentUser(); // Сначала загружаем данные пользователя
                await loadUsers(); // Потом загружаем всех пользователей
                setupTabNavigation();
            })(),
            timeoutPromise
        ]);
        
        showLoading(false);
        
        // Если нет пользователей, показываем сообщение
        if (users.length === 0) {
            document.getElementById('userGrid').innerHTML = `
                <div class="empty-state">
                    <h3>👥 Пока никого нет</h3>
                    <p>Участники появятся после регистрации в боте</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError(error.message === 'Timeout' ? 
            'Долгая загрузка. Попробуйте перезапустить приложение' : 
            'Ошибка при загрузке данных'
        );
        showLoading(false);
        
        // Показываем базовый интерфейс даже при ошибке
        setupTabNavigation();
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
        renderUsers(); // Сначала рендерим без статусов
        
        // Затем загружаем статусы и перерендериваем
        if (currentUser) {
            await loadReviewStatuses();
        }
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
    } else if (tabName === 'feed') {
        // Загружаем ленту отзывов
        loadFeed();
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
        } else {
            console.error('Failed to load current user:', response.status);
        }
    } catch (error) {
        console.error('Error loading current user:', error);
    }
}

// Load review statuses for all users
async function loadReviewStatuses() {
    if (!currentUser) {
        console.log('No current user, skipping review statuses');
        return;
    }
    
    console.log('Loading review statuses for', users.length, 'users');
    
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
                if (data.review) {
                    console.log('Found review for user:', user.firstName);
                }
            }
        }
        
        console.log('Review statuses loaded:', reviewStatuses);
        
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
        console.log('Loading my reviews with Telegram data:', telegramData ? 'present' : 'missing');
        
        if (!telegramData) {
            console.error('No Telegram init data available');
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
        
        console.log('My reviews API response status:', response.status);
        
        if (response.ok) {
            const userData = await response.json();
            console.log('My reviews loaded:', userData);
            currentUser = userData; // Обновляем текущего пользователя
            const reviews = userData.receivedReviews || [];
            console.log('Found reviews:', reviews.length);
            renderMyReviews(reviews);
        } else {
            const errorData = await response.text();
            console.error('Failed to load my reviews:', response.status, errorData);
            container.innerHTML = `
                <div class="empty-state">
                    <h3>❌ Ошибка загрузки</h3>
                    <p>Статус: ${response.status}. Попробуйте позже.</p>
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
            <div class="profile-card">
                <div class="profile-avatar">
                    ${currentUser?.photoUrl ? 
                        `<img src="${currentUser.photoUrl}" alt="${currentUser.firstName || 'Вы'}">` : 
                        getInitials([currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 'Вы')
                    }
                </div>
                <div class="profile-info">
                    <div class="profile-name">${[currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 'Ваш профиль'}</div>
                    <div class="profile-stats">0 отзывов</div>
                </div>
            </div>
            <div class="empty-state">
                <h3>🌟 Пока нет отзывов</h3>
                <p>Когда коллеги оставят отзывы о вас, они появятся здесь</p>
            </div>
        `;
        return;
    }
    
    // Profile card + reviews
    const profileCard = `
        <div class="profile-card">
            <div class="profile-avatar">
                ${currentUser?.photoUrl ? 
                    `<img src="${currentUser.photoUrl}" alt="${currentUser.firstName || 'Вы'}">` : 
                    getInitials([currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 'Вы')
                }
            </div>
            <div class="profile-info">
                <div class="profile-name">${[currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || 'Ваш профиль'}</div>
                <div class="profile-stats">${reviews.length} ${getReviewsWordForm(reviews.length)}</div>
            </div>
        </div>
    `;
    
    const reviewsHtml = reviews.map(review => `
        <div class="feed-item">
            <div class="feed-content">
                <div class="feed-type">💡 Таланты и компетенции</div>
                <div>${review.talentsAnswer}</div>
            </div>
            
            <div class="feed-content" style="margin-top: 0.75rem;">
                <div class="feed-type">🎯 Подходящие клиенты</div>
                <div>${review.clientAnswer}</div>
            </div>
            
            <div class="review-date-only">
                ${new Date(review.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                })}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = profileCard + reviewsHtml;
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
        hideNavigation();
        showFloatingButton();
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

// Render reviews in tabs
function renderReviews(reviews) {
    const talentsContainer = document.getElementById('talentsReviewsList');
    const clientsContainer = document.getElementById('clientsReviewsList');
    
    if (reviews.length === 0) {
        const emptyState = `
            <div class="empty-reviews-state">
                <div class="icon">⭐</div>
                <h3>Пока нет отзывов</h3>
                <p>Станьте первым, кто оставит<br>отзыв об этом человеке!</p>
            </div>
        `;
        talentsContainer.innerHTML = emptyState;
        clientsContainer.innerHTML = emptyState;
        return;
    }
    
    // Render talents reviews
    talentsContainer.innerHTML = reviews.map(review => `
        <div class="review-block">
            <div class="review-content">${review.talentsAnswer}</div>
        </div>
    `).join('');
    
    // Render clients reviews
    clientsContainer.innerHTML = reviews.map(review => `
        <div class="review-block">
            <div class="review-content">${review.clientAnswer}</div>
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

// Navigation control functions
function hideNavigation() {
    const navTabs = document.querySelector('.nav-tabs');
    navTabs.classList.add('hidden');
}

function showNavigation() {
    const navTabs = document.querySelector('.nav-tabs');
    navTabs.classList.remove('hidden');
}

// Floating button control functions
function showFloatingButton() {
    const floatingButton = document.getElementById('floatingReviewButton');
    floatingButton.style.display = 'block';
    setTimeout(() => {
        floatingButton.classList.add('show');
    }, 50);
}

function hideFloatingButton() {
    const floatingButton = document.getElementById('floatingReviewButton');
    floatingButton.classList.remove('show');
    setTimeout(() => {
        floatingButton.style.display = 'none';
    }, 300);
}

// Event listeners
document.getElementById('closeModal').onclick = () => {
    userModal.style.display = 'none';
    showNavigation();
    hideFloatingButton();
};

// Updated floating button event listener
document.getElementById('writeReviewFloatingBtn').onclick = () => {
    hideFloatingButton();
    openReviewModal();
};

document.getElementById('closeReviewModal').onclick = () => {
    reviewModal.style.display = 'none';
    userModal.style.display = 'block';
    hideNavigation(); // Keep navigation hidden when returning to user modal
    showFloatingButton(); // Show floating button when returning to user modal
};

document.getElementById('cancelReview').onclick = () => {
    reviewModal.style.display = 'none';
    userModal.style.display = 'block';
    hideNavigation(); // Keep navigation hidden when returning to user modal
    showFloatingButton(); // Show floating button when returning to user modal
};

document.getElementById('reviewForm').onsubmit = submitReview;

// Close modals on outside click
window.onclick = (event) => {
    if (event.target === userModal) {
        userModal.style.display = 'none';
        showNavigation();
        hideFloatingButton();
    }
    if (event.target === reviewModal) {
        reviewModal.style.display = 'none';
        userModal.style.display = 'block';
        hideNavigation(); // Keep navigation hidden when returning to user modal
        showFloatingButton(); // Show floating button when returning to user modal
    }
};

// Handle keyboard visibility for mobile
function handleKeyboardVisibility() {
    let keyboardOpen = false;
    
    // Detect when keyboard opens/closes by monitoring viewport height changes
    function checkViewportHeight() {
        const currentHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
        const fullHeight = window.screen.height;
        const keyboardThreshold = fullHeight * 0.7; // Keyboard likely open if viewport < 70% of screen
        
        const isKeyboardOpen = currentHeight < keyboardThreshold;
        
        if (isKeyboardOpen !== keyboardOpen) {
            keyboardOpen = isKeyboardOpen;
            
            const modalContents = document.querySelectorAll('.modal-content');
            modalContents.forEach(modal => {
                if (isKeyboardOpen) {
                    modal.classList.add('keyboard-open');
                } else {
                    modal.classList.remove('keyboard-open');
                }
            });
            
            // Scroll focused input into view when keyboard opens
            if (isKeyboardOpen) {
                setTimeout(() => {
                    const activeElement = document.activeElement;
                    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                        activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }
        }
    }
    
    // Listen for viewport changes
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', checkViewportHeight);
    } else {
        window.addEventListener('resize', checkViewportHeight);
    }
    
    // Also listen for focus events on form elements
    document.addEventListener('focusin', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            setTimeout(() => checkViewportHeight(), 300);
        }
    });
    
    document.addEventListener('focusout', () => {
        setTimeout(() => checkViewportHeight(), 300);
    });
}

// Initialize keyboard handling
handleKeyboardVisibility();

// Modal tabs functionality
function initModalTabs() {
    const modalTabs = document.querySelectorAll('.modal-tab');
    const modalPanels = document.querySelectorAll('.modal-tab-panel');
    
    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPanel = tab.getAttribute('data-modal-tab');
            
            // Remove active class from all tabs and panels
            modalTabs.forEach(t => t.classList.remove('active'));
            modalPanels.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding panel
            tab.classList.add('active');
            document.getElementById(`${targetPanel}-panel`).classList.add('active');
        });
    });
}

// Initialize modal tabs when DOM is loaded
initModalTabs();

// Helper function for correct Russian word forms
function getReviewsWordForm(count) {
    if (count % 10 === 1 && count % 100 !== 11) {
        return 'отзыв';
    } else if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) {
        return 'отзыва';
    } else {
        return 'отзывов';
    }
}

// Load feed
async function loadFeed() {
    const container = document.getElementById('feedContainer');
    
    // Показать загрузку
    container.innerHTML = `
        <div class="empty-state">
            <h3>🔄 Загрузка...</h3>
            <p>Загружаем ленту отзывов</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/reviews/feed`);
        
        if (response.ok) {
            const reviews = await response.json();
            console.log('Feed loaded:', reviews);
            renderFeed(reviews);
        } else {
            const errorData = await response.text();
            console.error('Failed to load feed:', response.status, errorData);
            container.innerHTML = `
                <div class="empty-state">
                    <h3>❌ Ошибка загрузки</h3>
                    <p>Не удалось загрузить ленту отзывов</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading feed:', error);
        container.innerHTML = `
            <div class="empty-state">
                <h3>❌ Ошибка загрузки</h3>
                <p>Проверьте подключение к интернету</p>
            </div>
        `;
    }
}

// Render feed
function renderFeed(reviews) {
    const container = document.getElementById('feedContainer');
    
    if (reviews.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>📝 Пока нет отзывов</h3>
                <p>Как только кто-то оставит отзыв, он появится в ленте</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reviews.map(review => {
        const targetName = [review.target?.firstName, review.target?.lastName].filter(Boolean).join(' ') || 'Неизвестно';
        const targetInitials = getInitials(targetName);
        
        return `
            <div class="feed-item">
                <div class="feed-header">
                    <div class="feed-avatar">
                        ${review.target?.photoUrl ? 
                            `<img src="${review.target.photoUrl}" alt="${targetName}">` : 
                            targetInitials
                        }
                    </div>
                    <div class="feed-info">
                        <div class="feed-names">${targetName}</div>
                        <div class="feed-context">получил новый отзыв</div>
                    </div>
                </div>
                
                <div class="feed-content">
                    <div class="feed-type">💡 Таланты и компетенции</div>
                    <div>${review.talentsAnswer}</div>
                </div>
                
                <div class="feed-content" style="margin-top: 0.75rem;">
                    <div class="feed-type">🎯 Подходящие клиенты</div>
                    <div>${review.clientAnswer}</div>
                </div>
            </div>
        `;
    }).join('');
}