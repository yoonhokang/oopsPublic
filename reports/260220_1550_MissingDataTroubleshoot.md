# Firestore 데이터 누락 원인 분석 및 해결

`collectionGroup` 쿼리를 실행했는데 데이터가 일부만 보이는 현상은 99% **"인덱스(Index) 설정"** 문제입니다.

### 1. 원인: 인덱스 부재 (Missing Index)
Firestore에서 `collectionGroup` 쿼리를 사용하려면, 해당 컬렉션 ID(`web_clipper`)에 대한 **단일 필드 인덱스 면제(Single-field index exemptions)** 설정이나 **복합 인덱스(Composite Index)**가 필요할 수 있습니다.
특히 Datastore Mode에서는 쿼리 패턴에 맞는 인덱스가 없으면 결과가 아예 안 나오거나 일부만 나올 수 있습니다.

### 2. 확인 및 해결 방법

#### 방법 A: 콘솔에서 경고 확인 (가장 확실)
1.  Firebase Console > Firestore Database > **Indexes** 탭으로 이동합니다.
2.  **Single-field** 또는 **Composite** 탭에서 `web_clipper`와 관련된 인덱스가 있는지 확인합니다.
3.  만약 없다면, 쿼리 실행 시 에러 메시지(콘솔 하단이나 로그)에 **"Index required"**라는 링크가 떴을 수도 있습니다. 그 링크를 누르면 자동으로 생성이 됩니다.

#### 방법 B: 직접 경로로 확인 (데이터 존재 여부 검증)
인덱스 문제인지 진짜 데이터가 없는 건지 확인하기 위해, 상위 컬렉션부터 하나씩 들어가 봅니다.

1.  쿼리창에 `db.pipeline().collection('users').limit(10)` 입력 후 **Run**.
2.  결과에 **사용자 문서(UID)** 2개가 모두 뜨는지 확인하세요.
3.  각 사용자 문서의 **Key**를 클릭해서 상세 화면으로 들어갑니다.
4.  하위 컬렉션 `web_clipper`에 문서들이 들어있는지 눈으로 확인합니다.

### 3. 결론
만약 **방법 B**로 확인했을 때 데이터가 다 있다면, 데이터는 안전하게 저장된 것입니다.
`collectionGroup` 쿼리가 안 먹는 건 **인덱스 생성**이 필요하기 때문이니, 운영상 꼭 필요한 기능이 아니라면(단순 확인용이라면) **방법 B**처럼 개별 사용자로 들어가서 확인하는 것을 권장합니다.
