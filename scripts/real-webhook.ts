import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import process from 'node:process'
import { imageMessageFromBuffer, QywxBot } from '../src/index'

const webhook = process.env.QYWX_BOT_WEBHOOK

if (!webhook) {
  throw new Error([
    'Missing QYWX_BOT_WEBHOOK.',
    'PowerShell:',
    '$env:QYWX_BOT_WEBHOOK="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"; pnpm run test:real',
  ].join('\n'))
}

const bot = new QywxBot(webhook)
const marker = new Date().toISOString()

await step('text', () => bot.sendText(`qywxbot real test: text ${marker}`, {
  mentionedMobileList: splitEnv('QYWX_BOT_MENTIONED_MOBILES'),
}))

await step('markdown', () => bot.sendMarkdown([
  '## qywxbot real test',
  `> time: <font color="info">${marker}</font>`,
  '> status: <font color="comment">markdown ok</font>',
].join('\n')))

await step('image', () => bot.send(imageMessageFromBuffer(tinyPng())))

await step('news', () => bot.sendNews([
  {
    title: 'qywxbot real test: news',
    description: `sent at ${marker}`,
    url: 'https://developer.work.weixin.qq.com/document/path/91770',
    picurl: 'https://wework.qpic.cn/wwpic/39750_JJw6SJMpRqSOjJo_1675227001/0',
  },
]))

const uploadedFile = await step('upload file', () => bot.uploadMedia(new Blob([
  `qywxbot real test file\nsent at ${marker}\n`,
], {
  type: 'text/plain',
}), {
  type: 'file',
  filename: 'qywxbot-real-test.txt',
}))

await step('file', () => bot.sendFile(uploadedFile.media_id))

const voiceFile = process.env.QYWX_BOT_VOICE_FILE
if (voiceFile) {
  const voiceBuffer = await readFile(voiceFile)
  const uploadedVoice = await step('upload voice', () => bot.uploadMedia(new Blob([
    toBlobPart(voiceBuffer),
  ], {
    type: 'audio/amr',
  }), {
    type: 'voice',
    filename: basename(voiceFile),
  }))

  await step('voice', () => bot.sendVoice(uploadedVoice.media_id))
}
else {
  console.log('skip voice: set QYWX_BOT_VOICE_FILE to an AMR file path to test voice messages')
}

await step('template card', () => bot.sendTemplateCard({
  card_type: 'text_notice',
  source: {
    icon_url: 'https://wework.qpic.cn/wwpic/39750_JJw6SJMpRqSOjJo_1675227001/0',
    desc: 'qywxbot',
  },
  main_title: {
    title: 'qywxbot real test: template card',
    desc: `sent at ${marker}`,
  },
  card_action: {
    type: 1,
    url: 'https://developer.work.weixin.qq.com/document/path/91770',
  },
}))

console.log('done')

async function step<T>(name: string, run: () => Promise<T>): Promise<T> {
  process.stdout.write(`sending ${name}... `)
  const result = await run()
  console.log('ok')
  return result
}

function splitEnv(name: string): string[] | undefined {
  const value = process.env[name]
  if (!value)
    return undefined

  return value.split(',').map(item => item.trim()).filter(Boolean)
}

function tinyPng(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFAgJ/lP0X6wAAAABJRU5ErkJggg==',
    'base64',
  )
}

function toBlobPart(buffer: Buffer): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(buffer.byteLength)
  copy.set(buffer)
  return copy
}
