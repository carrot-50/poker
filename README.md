# 세븐포커 (Seven Card Poker)

플레이어 vs AI 2명(김포커, 이올인)으로 진행하는 한국식 세븐포커입니다.

## 카드 이미지 넣는 법
`cards/` 폴더에 아래 규칙으로 PNG 53장을 넣으면 자동 적용됩니다.
이미지가 없어도 CSS 카드로 대체 표시되어 바로 플레이할 수 있습니다.

- 파일명: `랭크_of_무늬.png`
  - 무늬: `spades`, `diamonds`, `hearts`, `clubs`
  - 랭크: `ace, 2~10, jack, queen, king`
  - 예: `ace_of_spades.png`, `10_of_hearts.png`, `king_of_clubs.png`
- 뒷면: `back.png`

파일명 규칙이 다르면 `game.js` 맨 위 `CARD_CONFIG`만 수정하면 됩니다.

## 게임 규칙
1. 앤티 100 → 4장 배분 → 1장 버리기 → 1장 오픈
2. 오픈 카드가 가장 좋은 사람(보스)부터 베팅: 체크 / 삥(100) / 쿼터 / 하프 / 콜 / 다이
3. 5구·6구 오픈 카드, 7구 히든 카드 후 각각 베팅
4. 족보: 로티플 > 백스플 > 스티플 > 포카드 > 풀하우스 > 플러시 > 마운틴 > 백스트레이트 > 스트레이트 > 트리플 > 투페어 > 원페어 > 탑
5. 동점 시 무늬 서열: ♠ > ◆ > ♥ > ♣

## 배포
GitHub Pages에 폴더째 올리고 Tistory에는 iframe으로 임베드하면 됩니다.
```html
<iframe src="https://carrot-50.github.io/seven-poker/" width="100%" height="900" frameborder="0"></iframe>
```
