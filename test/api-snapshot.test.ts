import { Buffer } from 'node:buffer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createUploadWebhook,
  extractWebhookKey,
  fileMessage,
  imageMessage,
  imageMessageFromBuffer,
  markdownMessage,
  newsMessage,
  QywxBot,
  templateCardMessage,
  textMessage,
  voiceMessage,
} from '../src/index'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('message builders', () => {
  it('creates text payload with mentioned lists', () => {
    expect(textMessage('广州今日天气：29度', {
      mentionedList: ['wangqing', '@all'],
      mentionedMobileList: ['13800001111'],
    })).toMatchInlineSnapshot(`
      {
        "msgtype": "text",
        "text": {
          "content": "广州今日天气：29度",
          "mentioned_list": [
            "wangqing",
            "@all",
          ],
          "mentioned_mobile_list": [
            "13800001111",
          ],
        },
      }
    `)
  })

  it('creates markdown payload', () => {
    expect(markdownMessage('实时新增用户反馈<font color="warning">132例</font>')).toEqual({
      msgtype: 'markdown',
      markdown: {
        content: '实时新增用户反馈<font color="warning">132例</font>',
      },
    })
  })

  it('creates image payload from explicit fields and binary content', () => {
    expect(imageMessage('DATA', 'MD5')).toEqual({
      msgtype: 'image',
      image: {
        base64: 'DATA',
        md5: 'MD5',
      },
    })

    expect(imageMessageFromBuffer(Buffer.from('hello'))).toEqual({
      msgtype: 'image',
      image: {
        base64: 'aGVsbG8=',
        md5: '5d41402abc4b2a76b9719d911017c592',
      },
    })
  })

  it('creates news, file, voice and template card payloads', () => {
    expect(newsMessage([
      {
        title: '中秋节礼品领取',
        description: '今年中秋节公司有豪礼相送',
        url: 'https://example.com',
        picurl: 'https://example.com/pic.png',
      },
    ])).toMatchInlineSnapshot(`
      {
        "msgtype": "news",
        "news": {
          "articles": [
            {
              "description": "今年中秋节公司有豪礼相送",
              "picurl": "https://example.com/pic.png",
              "title": "中秋节礼品领取",
              "url": "https://example.com",
            },
          ],
        },
      }
    `)

    expect(fileMessage('file-media-id')).toEqual({
      msgtype: 'file',
      file: { media_id: 'file-media-id' },
    })
    expect(voiceMessage('voice-media-id')).toEqual({
      msgtype: 'voice',
      voice: { media_id: 'voice-media-id' },
    })
    expect(templateCardMessage({
      card_type: 'text_notice',
      main_title: {
        title: '欢迎使用企业微信',
      },
    })).toEqual({
      msgtype: 'template_card',
      template_card: {
        card_type: 'text_notice',
        main_title: {
          title: '欢迎使用企业微信',
        },
      },
    })
  })

  it('rejects invalid news article count', () => {
    expect(() => newsMessage([])).toThrow('articles 必须包含 1 到 8 条图文')
    expect(() => newsMessage(Array.from({ length: 9 }, (_, index) => ({
      title: `title-${index}`,
      url: 'https://example.com',
    })))).toThrow('articles 必须包含 1 到 8 条图文')
  })
})

describe('webhook helpers', () => {
  it('extracts key and builds upload url from full webhook', () => {
    const webhook = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc'

    expect(extractWebhookKey(webhook)).toBe('abc')
    expect(createUploadWebhook(webhook, 'file')).toBe('https://qyapi.weixin.qq.com/cgi-bin/webhook/upload_media?key=abc&type=file')
    expect(createUploadWebhook('https://proxy.example.com/wecom/send?key=abc', 'voice')).toBe('https://proxy.example.com/wecom/upload_media?key=abc&type=voice')
  })
})

describe('qywx bot', () => {
  it('sends json payload with global fetch', async () => {
    const calls: Array<{ input: string, init?: RequestInit }> = []
    const fetchMock: typeof fetch = async (input, init) => {
      calls.push({ input: String(input), init })
      return new Response(JSON.stringify({ errcode: 0, errmsg: 'ok' }))
    }
    vi.stubGlobal('fetch', fetchMock)

    const bot = new QywxBot('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=robot-key')

    await expect(bot.sendText('hello', {
      mentionedMobileList: ['13800001111'],
    })).resolves.toEqual({ errcode: 0, errmsg: 'ok' })

    expect(calls).toHaveLength(1)
    expect(calls[0]?.input).toBe('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=robot-key')
    expect(calls[0]?.init?.method).toBe('POST')
    expect(calls[0]?.init?.headers).toEqual({ 'content-type': 'application/json' })
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      msgtype: 'text',
      text: {
        content: 'hello',
        mentioned_mobile_list: ['13800001111'],
      },
    })
  })

  it('uploads media with key extracted from webhook', async () => {
    const calls: Array<{ input: string, init?: RequestInit }> = []
    const fetchMock: typeof fetch = async (input, init) => {
      calls.push({ input: String(input), init })
      return new Response(JSON.stringify({
        errcode: 0,
        errmsg: 'ok',
        type: 'file',
        media_id: 'media-id',
        created_at: '1380000000',
      }))
    }
    vi.stubGlobal('fetch', fetchMock)

    const bot = new QywxBot('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=robot-key')

    await expect(bot.uploadMedia(new Blob(['hello world']), {
      filename: 'hello.txt',
    })).resolves.toMatchObject({
      errcode: 0,
      media_id: 'media-id',
    })

    expect(calls[0]?.input).toBe('https://qyapi.weixin.qq.com/cgi-bin/webhook/upload_media?key=robot-key&type=file')
    expect(calls[0]?.init?.method).toBe('POST')
    expect(calls[0]?.init?.headers).toMatchObject({
      'content-length': expect.any(String),
      'content-type': expect.stringMatching(/^multipart\/form-data; boundary=----qywxbot-/),
    })
    expect(calls[0]?.init?.body).toBeInstanceOf(Uint8Array)
    expect(Buffer.from(calls[0]?.init?.body as Uint8Array).toString()).toContain('name="media"; filename="hello.txt"')
  })

  it('throws api error when qywx response is not ok', async () => {
    const fetchMock: typeof fetch = async () => {
      return new Response(JSON.stringify({
        errcode: 93000,
        errmsg: 'invalid webhook',
      }))
    }
    vi.stubGlobal('fetch', fetchMock)

    const bot = new QywxBot('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=robot-key')

    await expect(bot.sendMarkdown('告警')).rejects.toMatchObject({
      name: 'QywxBotApiError',
      status: 200,
      errcode: 93000,
      errmsg: 'invalid webhook',
    })
  })
})
