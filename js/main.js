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
                    // [UX] alert() 대신 더 나은 UX를 위해 status 표시 (현재는 alert 유지 — 루트 페이지에 statusArea 없음)
                    alert("Login Required.\nPlease sign in with Google to access tools.");
                }
            });
        });
    });

})();
