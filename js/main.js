/**
 * Main Root Script
 * index.html의 인라인 스크립트에서 분리된 파일입니다.
 * [개선] CSP unsafe-inline 의존도 감소를 위해 외부 파일로 분리
 *
 * - Firebase Auth 상태 리스너 등록
 * - 카드 클릭 시 인증 가드 (미로그인 차단)
 */

(function () {
    "use strict";

    /**
     * [UX-02] 토스트 메시지 표시 (alert() 대체)
     * @param {string} message - 표시할 메시지
     * @param {number} duration - 표시 시간(ms), 기본 3초
     */
    function showToast(message, duration = 3000) {
        // 기존 토스트 제거
        const existing = document.getElementById('globalToast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'globalToast';
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        // 표시 애니메이션
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // 자동 숨김
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Auth 상태 리스너 등록
        if (window.registerAuthListener) {
            window.registerAuthListener((user) => {
                console.log("[Main Page] User state:", user ? "Logged In" : "Logged Out");
            });
        }

        // Auth Guard for Navigation Cards
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                const user = firebase.auth().currentUser;

                if (!user) {
                    e.preventDefault(); // Stop navigation
                    // [UX-02] alert() 대체 → 토스트 메시지
                    showToast("🔒 로그인이 필요합니다. Google 로그인 후 이용해주세요.");
                }
            });
        });
    });

})();
