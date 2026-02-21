# 콘텐츠 가로 폭 제한 문제 — 원인 분석 보고서

> **작성일**: 2026-02-21  
> **현상**: CSS 수정 후에도 저장된 페이지 콘텐츠가 동일한 좁은 폭으로만 표시됨  
> **관련 파일**: `webPageByEmail/script.js`, `webPageByEmail/style.css`, `css/style.css`

---

## 1. 현상

`.tool-container`의 `max-width: 600px` → `none`, `.post-content`에 `width: 100%`를 적용했으나 콘텐츠 영역의 가로 폭이 변하지 않음.

---

## 2. 근본 원인

`webPageByEmail/script.js`의 `cleanHtml()` 함수(281번 라인)에서, 외부 웹 페이지를 정제한 최종 HTML을 반환할 때 **인라인 스타일에 `max-width: 800px`가 하드코딩**되어 있음:

```javascript
// cleanHtml() 반환부 (281~287번 라인)
return `
    <div style="font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 800px;      ← ★ 근본 원인!
                margin: 0 auto;        ← 가운데 정렬 (양쪽 마진 발생)
                padding: 20px;
                background: #fff;">
        <p>Source: ...</p>
        <div class="cleaned-content">
            ${doc.body.innerHTML}
        </div>
    </div>
`;
```

---

## 3. 발생 경로 추적

```
[1] 사용자가 URL 입력 후 "Save to Board" 클릭
         │
[2] fetchWithFallback(url) → 원본 HTML 가져옴
         │
[3] cleanHtml(html, url) → 정제 + 래핑
         │
         └─ ★ 여기서 max-width: 800px 인라인 스타일이 삽입됨
         │
[4] Firestore에 저장 (content 필드에 래핑된 HTML 포함)
         │
[5] loadBoardREST() → DB에서 content 로드
         │
[6] renderBoard() → li.querySelector('.post-content') 안에 삽입
         │
[7] sanitizeHtml(post.content) → 인라인 style 속성은 제거하지 않음
         │
[8] 화면에 표시 → max-width: 800px가 그대로 적용됨
```

---

## 4. CSS 수정이 효과 없었던 이유

| 계층 | 적용 스타일 | 역할 |
|---|---|---|
| `.tool-container` | `max-width: none; width: 90%` | ✅ 바깥 컨테이너는 넓어짐 |
| `.post-content` | `width: 100%` | ✅ 아코디언 영역은 넓어짐 |
| **콘텐츠 내부 `<div>`** | **`max-width: 800px; margin: 0 auto`** | ❌ **인라인 스타일이 최우선 적용** |

CSS 우선순위: **인라인 style > CSS 파일** 이므로, 아무리 외부 CSS를 수정해도 콘텐츠 내부의 인라인 `max-width: 800px`가 이김.

---

## 5. 추가 발견: `sanitizeHtml()`은 `style` 속성을 제거하지 않음

```javascript
// sanitizeHtml() — 위험 속성 제거 로직 (111~131번 라인)
doc.querySelectorAll('*').forEach(el => {
    for (let i = 0; i < el.attributes.length; i++) {
        const attr = el.attributes[i];
        if (attr.name.startsWith('on')) {   // on* 이벤트만 제거
            attrsToRemove.push(attr.name);
        }
    }
    // style 속성은 제거 대상이 아님!
});
```

→ `cleanHtml()`이 삽입한 인라인 `style="max-width: 800px"`가 `sanitizeHtml()`을 통과하여 그대로 렌더링됨.

---

## 6. 수정 방안

### 방안 A: `cleanHtml()`의 래퍼 div에서 `max-width: 800px` 제거 (권장)

```javascript
// 변경 전
<div style="... max-width: 800px; margin: 0 auto; padding: 20px; ...">

// 변경 후
<div style="... max-width: 100%; margin: 0; padding: 20px; ...">
```

**장점**: 근본 원인 해결, 새로 저장하는 콘텐츠부터 즉시 적용  
**단점**: 이미 DB에 저장된 기존 포스트는 여전히 `max-width: 800px`가 포함됨

### 방안 B: CSS에서 `!important`로 강제 재정의 (기존 데이터 호환)

```css
/* webPageByEmail/style.css */
.post-content > div {
    max-width: 100% !important;
    margin: 0 !important;
}
```

**장점**: 기존 DB 데이터도 즉시 넓어짐  
**단점**: `!important` 남용은 유지보수성 저하

### 방안 C: A + B 동시 적용 (권장)

- 새 데이터: 방안 A로 근본 해결
- 기존 데이터: 방안 B로 호환 보장

---

## 7. 영향 분석

| 항목 | 영향 |
|---|---|
| **이메일 전송 기능** | `processAndSend()`도 동일한 `cleanHtml()` 사용 → 이메일에도 800px 제한 적용 중. 단, 이메일은 800px가 적절할 수 있음 |
| **기존 저장 데이터** | DB에 이미 `max-width: 800px`가 포함된 HTML이 저장됨 → 방안 B 없이는 기존 데이터 폭 변경 불가 |
| **보안** | `style` 속성 수정이므로 보안 영향 없음 |

---

*문서 끝*
