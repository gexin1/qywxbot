# qywxbot

企业微信群机器人 Webhook 客户端，支持文本、Markdown、图片、图文、文件、语音和模板卡片消息。

## 特性

- 原生 ESM，TypeScript 类型内置。
- 直接使用运行时全局 `fetch`，不额外引入请求库。
- 提供常用消息构造函数，也可以直接通过 `QywxBot` 发送。
- 文件、语音素材上传和 `media_id` 发送流程内置。
- 企业微信接口错误会抛出带 `errcode`、`errmsg` 和 HTTP 状态码的异常。

## 安装

```bash
pnpm add qywxbot
```

也可以使用 npm 或 yarn：

```bash
npm install qywxbot
yarn add qywxbot
```

## 运行环境

需要运行时提供全局 `fetch`、`Blob`、`URL` 和 `Response`。推荐 Node.js 18+，或现代浏览器 / 边缘运行时。

本包是 ESM 包：

```ts
import { QywxBot } from 'qywxbot'
```

## 快速开始

先在企业微信群里添加「群机器人」，复制完整 webhook。地址通常形如：

```txt
https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

然后创建客户端并发送消息：

```ts
import { QywxBot } from 'qywxbot'

const bot = new QywxBot(process.env.QYWX_BOT_WEBHOOK!)

await bot.sendText('广州今日天气：29度', {
  mentionedList: ['wangqing'],
  mentionedMobileList: ['13800001111'],
})

await bot.sendMarkdown('实时新增用户反馈<font color="warning">132例</font>')
```

也可以使用工厂函数：

```ts
import { createQywxBot } from 'qywxbot'

const bot = createQywxBot('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx')
await bot.sendText('hello')
```

## 发送消息

### 文本

```ts
await bot.sendText('服务发布完成', {
  mentionedList: ['@all'],
})
```

`mentionedList` 是 userid 列表，`mentionedMobileList` 是手机号列表。传入 `@all` 可以提醒所有人。

### Markdown

```ts
await bot.sendMarkdown([
  '## 发布通知',
  '> 项目 qywxbot 已发布',
  '',
  '版本：<font color="info">1.0.0</font>',
].join('\n'))
```

Markdown 消息如需 @ 成员，请在内容中使用企业微信支持的 `<@userid>` 语法。

### 图片

企业微信图片消息需要原始二进制内容的 base64 和 md5。本包提供 `imageMessageFromBuffer` 辅助生成消息体：

```ts
import { readFile } from 'node:fs/promises'
import { imageMessageFromBuffer } from 'qywxbot'

const image = imageMessageFromBuffer(await readFile('./screenshot.png'))
await bot.send(image)
```

如果你已经有 base64 和 md5，也可以直接发送：

```ts
await bot.sendImage(base64, md5)
```

### 图文

```ts
await bot.sendNews([
  {
    title: '发布说明',
    description: '查看本次发布的变更内容',
    url: 'https://example.com/changelog',
    picurl: 'https://example.com/cover.png',
  },
])
```

企业微信要求图文消息包含 1 到 8 篇文章。

### 文件

文件需要先上传素材获取 `media_id`，再发送文件消息：

```ts
import { readFile } from 'node:fs/promises'

const file = new Blob([await readFile('./report.xlsx')])
const uploaded = await bot.uploadMedia(file, {
  type: 'file',
  filename: 'report.xlsx',
})

await bot.sendFile(uploaded.media_id)
```

### 语音

语音同样需要先上传素材。企业微信语音素材通常要求 AMR 格式：

```ts
import { readFile } from 'node:fs/promises'

const voice = new Blob([await readFile('./notice.amr')], {
  type: 'audio/amr',
})

const uploaded = await bot.uploadMedia(voice, {
  type: 'voice',
  filename: 'notice.amr',
})

await bot.sendVoice(uploaded.media_id)
```

### 模板卡片

模板卡片字段随 `card_type` 变化，客户端会保留原始结构发送给企业微信：

```ts
await bot.sendTemplateCard({
  card_type: 'text_notice',
  main_title: {
    title: '服务告警',
    desc: '接口错误率超过阈值',
  },
  emphasis_content: {
    title: '12.5%',
    desc: '错误率',
  },
})
```

## 使用消息构造函数

除了 `bot.sendText()` 这类便捷方法，也可以先构造消息体，再统一调用 `bot.send()`：

```ts
import { markdownMessage, textMessage } from 'qywxbot'

await bot.send(textMessage('任务完成'))
await bot.send(markdownMessage('**任务完成**'))
```

导出的构造函数包括：

- `textMessage`
- `markdownMessage`
- `imageMessage`
- `imageMessageFromBuffer`
- `newsMessage`
- `fileMessage`
- `voiceMessage`
- `templateCardMessage`

## 错误处理

当 HTTP 请求失败，或企业微信返回非 0 `errcode` 时，会抛出 `QywxBotApiError`：

```ts
import { QywxBotApiError } from 'qywxbot'

try {
  await bot.sendText('hello')
}
catch (error) {
  if (error instanceof QywxBotApiError) {
    console.error(error.status, error.errcode, error.errmsg)
  }
  else {
    throw error
  }
}
```

## 工具函数

```ts
import { createUploadWebhook, extractWebhookKey } from 'qywxbot'

const webhook = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=robot-key'

extractWebhookKey(webhook)
// => robot-key

createUploadWebhook(webhook, 'file')
// => https://qyapi.weixin.qq.com/cgi-bin/webhook/upload_media?key=robot-key&type=file
```

## 本地开发

```bash
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build
```

项目提供了手动集成测试脚本，会依次发送文本、Markdown、图片、图文、文件和模板卡片消息：

```powershell
$env:QYWX_BOT_WEBHOOK="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
pnpm run test:real
```

如果要测试文本消息 @ 手机号：

```powershell
$env:QYWX_BOT_MENTIONED_MOBILES="13800001111,13900002222"
pnpm run test:real
```

语音消息需要准备真实 AMR 文件：

```powershell
$env:QYWX_BOT_VOICE_FILE="D:\tmp\test.amr"
pnpm run test:real
```

## 发布

```bash
pnpm run test
pnpm publish
```

`prepublishOnly` 会在发布前自动执行构建，发布内容由 `files` 字段限制为 `dist`。

## 注意事项

- 请保护好机器人 webhook，不要提交到 GitHub 或公开日志。
- 企业微信限制每个机器人每分钟最多发送 20 条消息。
- 图片消息需要提供原始二进制的 base64 和 md5。
- 文件素材和语音素材需要先通过 `uploadMedia()` 上传，再使用返回的 `media_id` 发送。

## License

[MIT](./LICENSE) License
