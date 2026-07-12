function _quizCardSkeleton() {
    return `
        <div class="skeleton-card">
            <div class="skeleton-card-image"></div>
            <div class="skeleton-card-body">
                <div class="skeleton skeleton-text skeleton-text-lg" style="width:75%;"></div>
                <div class="skeleton skeleton-text skeleton-text-sm" style="width:55%;"></div>
                <div class="skeleton-card-footer">
                    <div class="skeleton skeleton-text-sm" style="width:45%; margin:0; background:rgba(255,255,255,0.3);"></div>
                    <div class="skeleton skeleton-card-pill"></div>
                </div>
            </div>
        </div>`;
}
function _quizCardVerticalSkeleton() {
    return `
        <div class="skeleton-card skeleton-card--vertical">
            <div class="skeleton-card-image">
                <div class="skeleton-card-badge"></div>
            </div>
            <div class="skeleton-card-body">
                <div class="skeleton skeleton-text skeleton-text-lg" style="width:75%;"></div>
                <div class="skeleton skeleton-text skeleton-text-sm" style="width:100%;"></div>
                <div class="skeleton skeleton-text skeleton-text-sm" style="width:60%; margin:0;"></div>
                <div class="skeleton-card-actions">
                    <div class="skeleton skeleton-btn"></div>
                    <div class="skeleton skeleton-btn-sm"></div>
                </div>
            </div>
        </div>`;
}
function _classCardSkeleton() {
    return `
        <div class="skeleton-class-card">
            <div class="skeleton-class-header">
                <div class="skeleton skeleton-text skeleton-text-lg" style="width:65%;"></div>
                <div class="skeleton skeleton-text skeleton-text-sm" style="width:40%;"></div>
            </div>
            <div class="skeleton-class-avatar"></div>
            <div class="skeleton-class-body"></div>
            <div class="skeleton-class-footer">
                <div class="skeleton skeleton-text-sm" style="width:90px; margin:0;"></div>
                <div class="skeleton-class-menu-btn"></div>
            </div>
        </div>`;
}
function _statCardSkeleton() {
    return `
        <div class="skeleton-stat-card">
            <div class="skeleton skeleton-circle" style="width:44px; height:44px;"></div>
            <div class="skeleton skeleton-text" style="width:50px; height:28px; margin:0;"></div>
            <div class="skeleton skeleton-text-sm" style="width:70px; margin:0;"></div>
        </div>`;
}
function _missionItemSkeleton() {
    return `
        <div class="skeleton-mission-item">
            <div class="skeleton-mission-check"></div>
            <div class="skeleton-mission-info">
                <div class="skeleton skeleton-text" style="width:65%; height:14px;"></div>
                <div class="skeleton skeleton-text-sm" style="width:45%; height:10px; margin:0;"></div>
            </div>
            <div class="skeleton-mission-xp"></div>
        </div>`;
}
function _quizPreviewCardSkeleton() {
    return `
        <div class="skeleton-preview-card">
            <div class="skeleton-preview-badges">
                <div class="skeleton-preview-index"></div>
                <div class="skeleton-preview-timer"></div>
            </div>
            <div class="skeleton-preview-inner">
                <div class="skeleton" style="width:100%; height:56px; border-radius:16px;"></div>
                <div class="skeleton" style="flex:1; border-radius:14px; min-height:60px;"></div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <div class="skeleton" style="height:36px; border-radius:14px;"></div>
                    <div class="skeleton" style="height:36px; border-radius:14px;"></div>
                    <div class="skeleton" style="height:36px; border-radius:14px;"></div>
                    <div class="skeleton" style="height:36px; border-radius:14px;"></div>
                </div>
            </div>
        </div>`;
}
function _settingsRowSkeleton() {
    return `
        <div class="skeleton-settings-row">
            <div>
                <div class="skeleton skeleton-text" style="width:180px; height:16px;"></div>
                <div class="skeleton skeleton-text-sm" style="width:260px; height:12px; margin:0;"></div>
            </div>
            <div class="skeleton" style="width:110px; height:36px; border-radius:12px;"></div>
        </div>`;
}
function _profileCardSkeleton() {
    return `
        <div style="display:flex; flex-direction:column; align-items:center; gap:14px; padding:20px 0;">
            <div class="skeleton-avatar" style="width:120px; height:120px;"></div>
            <div class="skeleton skeleton-text skeleton-text-lg" style="width:140px;"></div>
            <div class="skeleton" style="width:100px; height:28px; border-radius:14px;"></div>
            <div class="skeleton-xp-bar" style="width:100%; max-width:220px;"></div>
            <div class="skeleton skeleton-text-sm" style="width:160px; margin:0;"></div>
            <div class="skeleton" style="width:160px; height:42px; border-radius:14px; margin-top:6px;"></div>
        </div>`;
}
function _bioCardSkeleton() {
    return `
        <div style="padding:16px;">
            <div class="skeleton skeleton-text" style="width:80px; height:14px;"></div>
            <div class="skeleton skeleton-text-sm" style="width:100%;"></div>
            <div class="skeleton skeleton-text-sm" style="width:70%; margin:0;"></div>
        </div>`;
}
function _showcaseSkeleton() {
    return `
        <div style="display:flex; gap:16px; overflow:hidden;">
            ${Array(3).fill(0).map(() => `
                <div class="skeleton-card" style="min-width:200px; flex-shrink:0;">
                    <div class="skeleton-card-image" style="aspect-ratio:16/10;"></div>
                    <div class="skeleton-card-body" style="padding:12px;">
                        <div class="skeleton skeleton-text" style="width:80%; height:14px;"></div>
                        <div class="skeleton skeleton-text-sm" style="width:50%; margin:0;"></div>
                    </div>
                </div>
            `).join('')}
        </div>`;
}
function _postCardSkeleton() {
    return `
        <div class="skeleton-post-card">
            <div class="skeleton-post-header">
                <div class="skeleton skeleton-circle" style="width:42px; height:42px; flex-shrink:0;"></div>
                <div style="flex:1;">
                    <div class="skeleton skeleton-text" style="width:120px; height:14px;"></div>
                    <div class="skeleton skeleton-text-sm" style="width:80px; height:10px; margin:0;"></div>
                </div>
            </div>
            <div class="skeleton-post-body">
                <div class="skeleton skeleton-text" style="width:100%;"></div>
                <div class="skeleton skeleton-text" style="width:75%;"></div>
                <div class="skeleton skeleton-text-sm" style="width:40%; margin:0;"></div>
            </div>
        </div>`;
}
function _assignmentCardSkeleton() {
    return `
        <div class="skeleton-assignment-card">
            <div class="skeleton-assignment-left">
                <div class="skeleton skeleton-circle" style="width:40px; height:40px;"></div>
            </div>
            <div class="skeleton-assignment-body">
                <div class="skeleton skeleton-text" style="width:60%; height:16px;"></div>
                <div class="skeleton skeleton-text-sm" style="width:40%; height:12px;"></div>
                <div class="skeleton skeleton-text-sm" style="width:30%; height:10px; margin:0;"></div>
            </div>
            <div class="skeleton-assignment-right">
                <div class="skeleton" style="width:80px; height:32px; border-radius:12px;"></div>
            </div>
        </div>`;
}
export function showSkeleton(containerEl, type, count = 4) {
    if (!containerEl) return;
    let html = '';
    switch (type) {
        case 'quiz-cards':
            html = `<div class="skeleton-grid skeleton-grid-quiz">
                ${Array(count).fill(0).map(() => _quizCardSkeleton()).join('')}
            </div>`;
            break;
        case 'quiz-cards-vertical':
            html = `<div class="skeleton-grid skeleton-grid-quiz">
                ${Array(count).fill(0).map(() => _quizCardVerticalSkeleton()).join('')}
            </div>`;
            break;
        case 'carousel':
            html = `<div class="skeleton-carousel">
                ${Array(count).fill(0).map(() => _quizCardSkeleton()).join('')}
            </div>`;
            break;
        case 'class-cards':
            html = `<div class="skeleton-grid skeleton-grid-classes">
                ${Array(count).fill(0).map(() => _classCardSkeleton()).join('')}
            </div>`;
            break;
        case 'stats-row':
            html = `<div class="skeleton-grid skeleton-grid-stats">
                ${Array(count).fill(0).map(() => _statCardSkeleton()).join('')}
            </div>`;
            break;
        case 'missions':
            html = Array(count).fill(0).map(() => _missionItemSkeleton()).join('');
            break;
        case 'profile':
            html = _profileCardSkeleton();
            break;
        case 'bio':
            html = _bioCardSkeleton();
            break;
        case 'showcase':
            html = _showcaseSkeleton();
            break;
        case 'quiz-preview':
            html = `<div class="skeleton-grid" style="grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));">
                ${Array(count).fill(0).map(() => _quizPreviewCardSkeleton()).join('')}
            </div>`;
            break;
        case 'settings':
            html = Array(count).fill(0).map(() => _settingsRowSkeleton()).join('');
            break;
        case 'text-lines':
            html = Array(count).fill(0).map((_, i) =>
                `<div class="skeleton skeleton-text" style="width:${85 - i * 12}%;"></div>`
            ).join('');
            break;
        case 'hero-card':
            html = `
                <div style="display:grid; grid-template-columns: 400px 1fr; gap:40px; align-items:center;">
                    <div class="skeleton" style="width:100%; aspect-ratio:16/10; border-radius:16px;"></div>
                    <div>
                        <div class="skeleton skeleton-text skeleton-text-lg" style="width:70%; height:32px;"></div>
                        <div style="display:flex; gap:16px; margin:16px 0;">
                            <div class="skeleton skeleton-circle" style="width:40px; height:40px;"></div>
                            <div class="skeleton skeleton-text" style="width:120px;"></div>
                        </div>
                        <div class="skeleton skeleton-text" style="width:100%; height:60px; border-radius:12px;"></div>
                        <div style="display:flex; gap:12px; margin-top:20px;">
                            <div class="skeleton" style="flex:1; height:56px; border-radius:16px;"></div>
                            <div class="skeleton" style="flex:1; height:56px; border-radius:16px;"></div>
                            <div class="skeleton" style="width:60px; height:56px; border-radius:16px;"></div>
                        </div>
                    </div>
                </div>`;
            break;
        case 'greeting':
            html = `
                <div style="text-align:center; padding:10px 0;">
                    <div class="skeleton skeleton-text skeleton-text-lg" style="width:200px; height:32px; margin:0 auto 10px;"></div>
                    <div class="skeleton skeleton-text" style="width:240px; margin:0 auto;"></div>
                </div>`;
            break;
        case 'post-cards':
            html = Array(count).fill(0).map(() => _postCardSkeleton()).join('');
            break;
        case 'assignment-cards':
            html = Array(count).fill(0).map(() => _assignmentCardSkeleton()).join('');
            break;
        case 'hero-text':
            html = `
                <div class="skeleton-hero-text">
                    <div class="skeleton" style="width:240px; height:36px; border-radius:12px; background:rgba(255,255,255,0.3);"></div>
                    <div class="skeleton" style="width:120px; height:18px; border-radius:8px; background:rgba(255,255,255,0.2); margin-top:8px;"></div>
                </div>`;
            break;
        default:
            html = `<div class="skeleton" style="width:100%; height:60px;"></div>`;
    }
    containerEl.innerHTML = html;
}
export function hideSkeleton(containerEl) {
    if (!containerEl) return;
    containerEl.style.display = 'none';
    containerEl.innerHTML = '';
}
