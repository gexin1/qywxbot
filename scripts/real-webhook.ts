import { Buffer } from 'node:buffer'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import process from 'node:process'
import { deflateSync } from 'node:zlib'
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

await step('image', () => bot.send(imageMessageFromBuffer(testPng())))

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

function testPng(): Buffer {
  const width = 160
  const height = 80
  const rows: Buffer[] = []

  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3)
    row[0] = 0

    for (let x = 0; x < width; x++) {
      const offset = 1 + x * 3
      row[offset] = 40 + Math.floor((x / width) * 120)
      row[offset + 1] = 130 + Math.floor((y / height) * 80)
      row[offset + 2] = 210
    }

    rows.push(row)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    pngChunk('IHDR', Buffer.concat([
      u32(width),
      u32(height),
      Buffer.from([8, 2, 0, 0, 0]),
    ])),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuffer, data])

  return Buffer.concat([
    u32(data.length),
    body,
    u32(crc32(body)),
  ])
}

function u32(value: number): Buffer {
  const buffer = Buffer.alloc(4)
  buffer.writeUInt32BE(value)
  return buffer
}

function crc32(buffer: Buffer): number {
  let crc = 0xFFFFFFFF

  for (const byte of buffer) {
    crc ^= byte
    for (let index = 0; index < 8; index++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
  }

  return (crc ^ 0xFFFFFFFF) >>> 0
}

function toBlobPart(buffer: Buffer): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(buffer.byteLength)
  copy.set(buffer)
  return copy
}
