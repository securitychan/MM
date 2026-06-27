# 주식 기간손익 분석기

엑셀 또는 CSV 기간손익 파일을 브라우저에서 읽어 종목별 수익률, 일별 수익, 월별 실적, 분기별 실적을 계산하는 정적 웹앱입니다.

## 업로드

이 폴더 안의 파일과 폴더 전체를 GitHub 저장소 맨 위에 올립니다.

```text
index.html
.github
public
scripts
.gitignore
package.json
README.md
server.js
start.ps1
```

GitHub 저장소 `Settings > Pages`에서 Source를 `GitHub Actions`로 선택하면 됩니다.

## 로컬 실행

```powershell
.\start.ps1
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:4175
```

## 파일 형식

- `.xlsx`, `.xls`, `.csv`, `.tsv` 지원
- 기간손익 파일 기본 컬럼:
  `매매일`, `종목번호`, `종목명`, `청산수량`, `매입평균가`, `매도평균가`, `손익금액`, `수익률(%)`
- 매수/매도 체결내역 파일도 사용할 수 있으며, 이 경우 FIFO 방식으로 실현손익을 계산합니다.
- 엑셀 파일은 브라우저에서 SheetJS CDN을 불러와 읽습니다.
- 거래내역과 기간손익 파일은 외부 서버로 전송되지 않고 브라우저 안에서만 처리됩니다.
