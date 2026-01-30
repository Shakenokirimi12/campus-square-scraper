# Campus Square Scraper

[![npm version](https://badge.fury.io/js/campus-square-scraper.svg)](https://badge.fury.io/js/campus-square-scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**CampusSquare Scraper** は、大学のポータルサイトシステム「CampusSquare」から成績情報やカレンダー情報を取得するための、Node.js用スクレイピングライブラリです。
セッション管理を自動化し、シンプルなAPIでデータにアクセスできます。

## 特徴

- 🎓 **成績取得**: 全成績データをJSON形式で取得
- 📅 **カレンダー連携**: 授業や試験スケジュールのICS（iCal）URLを取得
- 🔐 **セッション管理**: ログインセッションの維持・再利用が容易
- 🛡️ **TypeScript**: 型定義完備で安全な開発が可能
- 🚀 **軽量**: 依存関係を最小限に抑え、Node.js標準の `fetch` を使用

## インストール

```bash
npm install campus-square-scraper
```

## 使い方

### 1. 初期化

```typescript
import { CampusSquareService } from 'campus-square-scraper';

const service = new CampusSquareService({
  baseUrl: 'https://csweb.u-aizu.ac.jp/campusweb', // 大学のCampusSquare URL
  // userAgent: 'MyBot/1.0', // 任意
});
```

### 2. ログインとデータ取得（推奨）

`login` メソッドで認証を行い、セッションオブジェクトを取得します。このセッションを使って各種データを取得します。

```typescript
async function main() {
  try {
    // ログイン
    const session = await service.login('s1234567', 'password');
    console.log('Login success. SID:', session.sid);

    // 成績情報の取得
    const grades = await session.fetchGrades();
    console.log(`取得した成績: ${grades.length} 件`);
    grades.forEach(g => console.log(`${g.subject}: ${g.grade}`));

    // カレンダーURL（ICS）の取得
    const { calendarUrl } = await session.fetchCalendarUrl();
    console.log('Calendar ICS URL:', calendarUrl);
    
    // カレンダーイベントの取得
    const events = await session.fetchCalendarEvents(calendarUrl);
    console.log(`イベント数: ${events.length}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
```

### 3. 既存のセッションIDを利用する場合

既にブラウザや他の処理で取得した `JSESSIONID` がある場合、ログインをスキップして利用できます。

```typescript
const session = service.fromSessionId('EXISTING_JSESSIONID_XYZ');
const grades = await session.fetchGrades();
```

### 4. ログインのみ（セッションID取得）

```typescript
const { sid } = await service.login('user', 'pass');
console.log(sid); // 認証済みセッションID
```

## 設定オプション

`CampusSquareService` コンストラクタのオプション:

| オプション | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `baseUrl` | `string` | ✅ | CampusSquareのベースURL (例: `.../campusweb`) |
| `userAgent` | `string` | | リクエスト時に使用するUser-Agent |
| `debugNotify` | `function` | | デバッグログを受け取るコールバック関数 |

## 要件

- Node.js v18 以上 (標準 `fetch` APIを使用するため)

## ライセンス

[MIT](LICENSE)