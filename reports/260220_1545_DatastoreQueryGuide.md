# Firestore (Datastore Mode) 데이터 조회 가이드

현재 우리 앱은 데이터를 **중첩된 구조(Nested Collection)**로 저장하고 있습니다.
따라서 최상위에서 단순히 `web_clipper`를 찾으면 데이터가 보이지 않습니다.

### 1. 데이터 저장 구조
```
users (최상위 컬렉션)
└── [사용자 UID] (문서)
    └── web_clipper (하위 컬렉션) <- 여기에 데이터가 있음!
        ├── [문서 ID 1]
        ├── [문서 ID 2]
        ...
```

### 2. 올바른 조회 방법 (Collection Group Query)
모든 사용자의 `web_clipper` 데이터를 한 번에 보고 싶다면, **Collection Group** 쿼리를 사용해야 합니다.

콘솔의 쿼리 입력창에 다음 명령어를 입력하고 **Run**을 눌러보세요:

```javascript
// 모든 'web_clipper' 컬렉션을 찾아서 조회
db.pipeline().collectionGroup('web_clipper').limit(100)
```

만약 특정 사용자의 데이터만 보고 싶다면, 경로를 명시해야 합니다:

```javascript
// 특정 사용자의 web_clipper 조회 (UID를 알아야 함)
db.pipeline().collection('users/[사용자UID]/web_clipper').limit(100)
```

### 3. 그래도 안 보인다면?
가장 확실한 방법은 **'users' 컬렉션부터 타고 들어가는 것**입니다.

1.  쿼리창에 `db.pipeline().collection('users').limit(100)` 입력 후 **Run**.
2.  결과 목록에서 본인의 **Key (UID)**를 클릭.
3.  상세 화면에서 하위 컬렉션(Subcollections) 목록에 **`web_clipper`**가 보일 것입니다. 그것을 클릭하세요.
