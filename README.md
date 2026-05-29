# qywxbot

企业微信群机器人 Webhook 客户端，支持文本、Markdown、图片、图文、文件、语音和模板卡片消息。

## 安装

```bash
pnpm add qywxbot
```

## 使用

```ts
import { QywxBot } from 'qywxbot'

const bot = new QywxBot(process.env.QYWX_BOT_WEBHOOK!)

await bot.sendText('广州今日天气：29度', {
  mentionedList: ['wangqing'],
  mentionedMobileList: ['13800001111'],
})

await bot.sendMarkdown('实时新增用户反馈<font color="warning">132例</font>')
```

完整 webhook 通常形如：

```txt
https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 文件和语音

文件、语音需要先上传素材获得 `media_id`，再发送对应消息。

```ts
const uploaded = await bot.uploadMedia(new Blob(['hello world']), {
  type: 'file',
  filename: 'hello.txt',
})

await bot.sendFile(uploaded.media_id)
```

## 注意事项

- 请保护好机器人 webhook，不要提交到 GitHub 或公开日志。
- 企业微信限制每个机器人每分钟最多发送 20 条消息。
- 图片消息需要提供原始二进制的 base64 和 md5，本包提供 `imageMessageFromBuffer` 方便生成。
- Markdown 消息如需 @ 成员，请在内容里使用企业微信支持的 `<@userid>` 语法。

## License

[MIT](./LICENSE) License
