# Firestore (Datastore Mode) 데이터 모델 이해하기

### 1. "Collection does not exist"의 의미
콘솔에서 `Root > users`에 들어갔는데 **"This collection does not exist"**라고 뜨는 것은, **`users` 컬렉션 바로 아래에 문서가 하나도 없다**는 뜻이 아닙니다.

정확히는 **"당신이 볼 수 있는 문서가 없다"**는 뜻에 가깝습니다.

### 2. 왜 이런 일이 발생하는가?
Firestore의 데이터 모델은 **계층형(Hierarchy)**입니다.
`users/user1/web_clipper/post1` 경로에 데이터를 저장하면,
Firestore는 `users` 컬렉션과 `user1` 문서를 자동으로 생성해주지 않습니다. (이를 **Phantom Document**라고 합니다.)

데이터는 `post1`이라는 리프 노드에만 존재하고, 상위 경로는 단지 논리적인 주소일 뿐입니다.

### 3. 확인 방법
Datastore Mode 콘솔은 이 "없는 상위 문서"를 보여주는 데 인색합니다.

하지만 **GQL(Google Query Language)**을 사용하면 강제로 데이터를 끄집어낼 수 있습니다.
다시 한번 **GQL Query** 탭을 찾아서 아래 명령어를 시도해 보세요.

```sql
SELECT * FROM web_clipper
```
(이 명령어는 상위 경로(`users`)가 있든 말든 상관없이, 실존하는 `web_clipper` 데이터를 모조리 찾아냅니다.)

### 4. 결론
*   데이터는 안전하게 있습니다. (쿼리 결과 7개가 증명함)
*   단지 Datastore Mode 콘솔의 UI가 계층형 데이터를 탐색하기에 불편하게 되어 있을 뿐입니다.
*   가장 확실한 조회 방법은 **GQL Query**를 사용하는 것입니다.
