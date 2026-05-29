import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'

/** 企业微信机器人接口返回的通用结构。 */
export interface QywxBotResponse {
  /** 错误码，0 表示成功。 */
  errcode: number
  /** 错误信息，成功时通常为 ok。 */
  errmsg: string
  /** 允许企业微信在不同接口中返回额外字段。 */
  [key: string]: unknown
}

/** 企业微信机器人素材上传接口返回结构。 */
export interface QywxBotUploadResponse extends QywxBotResponse {
  /** 上传的素材类型。 */
  type: 'file' | 'voice' | string
  /** 素材 ID，有效期通常为三天。 */
  media_id: string
  /** 素材上传时间戳。 */
  created_at: string
}

/** 企业微信机器人文本消息的 @ 配置。 */
export interface TextMessageOptions {
  /** userid 列表，传入 @all 可提醒所有人。 */
  mentionedList?: string[]
  /** 手机号列表，传入 @all 可提醒所有人。 */
  mentionedMobileList?: string[]
}

/** 企业微信机器人文本消息。 */
export interface TextMessage {
  /** 消息类型，固定为 text。 */
  msgtype: 'text'
  /** 文本消息内容。 */
  text: {
    /** 文本内容，企业微信限制最长不超过 2048 字节。 */
    content: string
    /** userid 列表，传入 @all 可提醒所有人。 */
    mentioned_list?: string[]
    /** 手机号列表，传入 @all 可提醒所有人。 */
    mentioned_mobile_list?: string[]
  }
}

/** 企业微信机器人 Markdown 消息。 */
export interface MarkdownMessage {
  /** 消息类型，固定为 markdown。 */
  msgtype: 'markdown'
  /** Markdown 消息内容。 */
  markdown: {
    /** Markdown 内容，企业微信限制最长不超过 4096 字节。 */
    content: string
  }
}

/** 企业微信机器人图片消息。 */
export interface ImageMessage {
  /** 消息类型，固定为 image。 */
  msgtype: 'image'
  /** 图片消息内容。 */
  image: {
    /** 图片内容的 base64 编码，不包含 data URL 前缀。 */
    base64: string
    /** 图片原始二进制内容的 md5 值。 */
    md5: string
  }
}

/** 企业微信机器人图文消息中的单篇文章。 */
export interface NewsArticle {
  /** 标题，企业微信限制最长不超过 128 字节。 */
  title: string
  /** 描述，企业微信限制最长不超过 512 字节。 */
  description?: string
  /** 点击后跳转的链接。 */
  url: string
  /** 图片链接，支持 JPG、PNG。 */
  picurl?: string
}

/** 企业微信机器人图文消息。 */
export interface NewsMessage {
  /** 消息类型，固定为 news。 */
  msgtype: 'news'
  /** 图文消息内容。 */
  news: {
    /** 图文列表，企业微信要求 1 到 8 条。 */
    articles: NewsArticle[]
  }
}

/** 企业微信机器人文件消息。 */
export interface FileMessage {
  /** 消息类型，固定为 file。 */
  msgtype: 'file'
  /** 文件消息内容。 */
  file: {
    /** 文件素材 ID，通过上传接口获得。 */
    media_id: string
  }
}

/** 企业微信机器人语音消息。 */
export interface VoiceMessage {
  /** 消息类型，固定为 voice。 */
  msgtype: 'voice'
  /** 语音消息内容。 */
  voice: {
    /** 语音素材 ID，通过上传接口获得。 */
    media_id: string
  }
}

/** 企业微信机器人模板卡片原始结构。 */
export interface TemplateCardMessage {
  /** 消息类型，固定为 template_card。 */
  msgtype: 'template_card'
  /** 模板卡片内容，字段随 card_type 变化。 */
  template_card: Record<string, unknown> & {
    /** 卡片类型，例如 text_notice 或 news_notice。 */
    card_type: string
  }
}

/** 企业微信机器人支持发送的消息联合类型。 */
export type QywxBotMessage
  = | TextMessage
    | MarkdownMessage
    | ImageMessage
    | NewsMessage
    | FileMessage
    | VoiceMessage
    | TemplateCardMessage

/** 创建企业微信机器人客户端的配置。 */
export interface QywxBotOptions {
  /** 机器人 webhook 完整地址，例如 https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx。 */
  webhook: string | URL
}

/** 上传文件或语音素材的配置。 */
export interface UploadMediaOptions {
  /** 素材类型，普通文件为 file，语音为 voice。 */
  type?: 'file' | 'voice'
  /** 上传到企业微信时展示的文件名。 */
  filename?: string
}

/** 企业微信接口返回非成功结果时抛出的错误。 */
export class QywxBotApiError extends Error {
  /** 企业微信返回的错误码。 */
  errcode?: number

  /** 企业微信返回的错误信息。 */
  errmsg?: string

  /** HTTP 状态码。 */
  status: number

  /** 原始返回数据。 */
  response: unknown

  constructor(message: string, options: { status: number, response: unknown, errcode?: number, errmsg?: string }) {
    super(message)
    this.name = 'QywxBotApiError'
    this.status = options.status
    this.response = options.response
    this.errcode = options.errcode
    this.errmsg = options.errmsg
  }
}

/**
 * 创建文本消息。
 *
 * @param content 文本内容，必须使用 UTF-8 编码，企业微信限制最长不超过 2048 字节。
 * @param options @ 成员配置。
 */
export function textMessage(content: string, options: TextMessageOptions = {}): TextMessage {
  assertNonEmptyString(content, 'content')

  return {
    msgtype: 'text',
    text: {
      content,
      ...(options.mentionedList ? { mentioned_list: options.mentionedList } : {}),
      ...(options.mentionedMobileList ? { mentioned_mobile_list: options.mentionedMobileList } : {}),
    },
  }
}

/**
 * 创建 Markdown 消息。
 *
 * @param content Markdown 内容，企业微信支持标题、加粗、链接、行内代码、引用和指定颜色的 font 标签。
 */
export function markdownMessage(content: string): MarkdownMessage {
  assertNonEmptyString(content, 'content')

  return {
    msgtype: 'markdown',
    markdown: {
      content,
    },
  }
}

/**
 * 创建图片消息。
 *
 * @param base64 图片内容的 base64 编码，不要包含 data URL 前缀。
 * @param md5 图片原始二进制内容的 md5 值。
 */
export function imageMessage(base64: string, md5: string): ImageMessage {
  assertNonEmptyString(base64, 'base64')
  assertNonEmptyString(md5, 'md5')

  return {
    msgtype: 'image',
    image: {
      base64,
      md5,
    },
  }
}

/**
 * 从二进制内容创建图片消息。
 *
 * @param data 图片原始二进制内容。企业微信要求 base64 前的图片最大不超过 2M，支持 JPG、PNG。
 */
export function imageMessageFromBuffer(data: ArrayBuffer | ArrayBufferView): ImageMessage {
  const buffer = Buffer.from(ArrayBuffer.isView(data) ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data)

  return imageMessage(
    buffer.toString('base64'),
    createHash('md5').update(buffer).digest('hex'),
  )
}

/**
 * 创建图文消息。
 *
 * @param articles 图文列表，企业微信要求 1 到 8 条。
 */
export function newsMessage(articles: NewsArticle[]): NewsMessage {
  if (!Array.isArray(articles) || articles.length < 1 || articles.length > 8)
    throw new TypeError('articles 必须包含 1 到 8 条图文')

  return {
    msgtype: 'news',
    news: {
      articles,
    },
  }
}

/**
 * 创建文件消息。
 *
 * @param mediaId 文件素材 ID，通过 uploadMedia 上传普通文件获得。
 */
export function fileMessage(mediaId: string): FileMessage {
  assertNonEmptyString(mediaId, 'mediaId')

  return {
    msgtype: 'file',
    file: {
      media_id: mediaId,
    },
  }
}

/**
 * 创建语音消息。
 *
 * @param mediaId 语音素材 ID，通过 uploadMedia 上传 AMR 文件获得。
 */
export function voiceMessage(mediaId: string): VoiceMessage {
  assertNonEmptyString(mediaId, 'mediaId')

  return {
    msgtype: 'voice',
    voice: {
      media_id: mediaId,
    },
  }
}

/**
 * 创建模板卡片消息。
 *
 * @param card 模板卡片内容，字段随 card_type 变化。
 */
export function templateCardMessage(card: TemplateCardMessage['template_card']): TemplateCardMessage {
  assertNonEmptyString(card.card_type, 'card.card_type')

  return {
    msgtype: 'template_card',
    template_card: card,
  }
}

/**
 * 从企业微信 webhook 完整地址中提取 key。
 *
 * @param webhook 机器人 webhook 完整地址。
 */
export function extractWebhookKey(webhook: string | URL): string {
  const key = new URL(webhook).searchParams.get('key')
  if (!key)
    throw new TypeError('webhook 中缺少 key 参数')
  return key
}

/**
 * 根据机器人完整 webhook 构造素材上传地址。
 *
 * @param webhook 机器人 webhook 完整地址。
 * @param type 素材类型，普通文件为 file，语音为 voice。
 */
export function createUploadWebhook(webhook: string | URL, type: 'file' | 'voice'): string {
  const url = new URL(webhook)
  const key = extractWebhookKey(url)
  const segments = url.pathname.split('/')

  if (segments.at(-1) === 'send')
    segments[segments.length - 1] = 'upload_media'
  else
    segments.push('upload_media')

  url.pathname = segments.join('/')
  url.search = ''
  url.searchParams.set('key', key)
  url.searchParams.set('type', type)
  return url.toString()
}

/** 企业微信机器人 webhook 客户端。 */
export class QywxBot {
  private readonly sendWebhook: string

  /**
   * 创建机器人客户端。
   *
   * @param options 企业微信机器人完整 webhook，或包含 webhook 的配置对象。
   */
  constructor(options: string | URL | QywxBotOptions) {
    const normalized = normalizeOptions(options)
    extractWebhookKey(normalized.webhook)
    this.sendWebhook = String(normalized.webhook)
  }

  /**
   * 发送任意受支持的机器人消息。
   *
   * @param message 企业微信机器人消息体。
   */
  async send(message: QywxBotMessage): Promise<QywxBotResponse> {
    const response = await fetch(this.sendWebhook, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    return readQywxResponse<QywxBotResponse>(response)
  }

  /**
   * 发送文本消息。
   *
   * @param content 文本内容。
   * @param options @ 成员配置。
   */
  sendText(content: string, options?: TextMessageOptions): Promise<QywxBotResponse> {
    return this.send(textMessage(content, options))
  }

  /**
   * 发送 Markdown 消息。
   *
   * @param content Markdown 内容。
   */
  sendMarkdown(content: string): Promise<QywxBotResponse> {
    return this.send(markdownMessage(content))
  }

  /**
   * 发送图片消息。
   *
   * @param base64 图片内容的 base64 编码。
   * @param md5 图片原始二进制内容的 md5 值。
   */
  sendImage(base64: string, md5: string): Promise<QywxBotResponse> {
    return this.send(imageMessage(base64, md5))
  }

  /**
   * 发送图文消息。
   *
   * @param articles 图文列表，企业微信要求 1 到 8 条。
   */
  sendNews(articles: NewsArticle[]): Promise<QywxBotResponse> {
    return this.send(newsMessage(articles))
  }

  /**
   * 发送文件消息。
   *
   * @param mediaId 文件素材 ID。
   */
  sendFile(mediaId: string): Promise<QywxBotResponse> {
    return this.send(fileMessage(mediaId))
  }

  /**
   * 发送语音消息。
   *
   * @param mediaId 语音素材 ID。
   */
  sendVoice(mediaId: string): Promise<QywxBotResponse> {
    return this.send(voiceMessage(mediaId))
  }

  /**
   * 发送模板卡片消息。
   *
   * @param card 模板卡片内容。
   */
  sendTemplateCard(card: TemplateCardMessage['template_card']): Promise<QywxBotResponse> {
    return this.send(templateCardMessage(card))
  }

  /**
   * 上传普通文件或语音素材。
   *
   * @param media 要上传的 Blob。普通文件最大 20M，语音最大 2M 且仅支持 AMR。
   * @param options 上传配置。
   */
  async uploadMedia(media: Blob, options: UploadMediaOptions = {}): Promise<QywxBotUploadResponse> {
    const type = options.type ?? 'file'
    const multipart = await createMultipartBody(media, options.filename ?? 'media')

    const response = await fetch(createUploadWebhook(this.sendWebhook, type), {
      method: 'POST',
      headers: {
        'content-length': String(multipart.body.byteLength),
        'content-type': `multipart/form-data; boundary=${multipart.boundary}`,
      },
      body: multipart.body,
    })

    return readQywxResponse<QywxBotUploadResponse>(response)
  }
}

/**
 * 创建企业微信机器人客户端。
 *
 * @param options 企业微信机器人完整 webhook，或包含 webhook 的配置对象。
 */
export function createQywxBot(options: string | URL | QywxBotOptions): QywxBot {
  return new QywxBot(options)
}

function normalizeOptions(options: string | URL | QywxBotOptions): QywxBotOptions {
  if (typeof options === 'string')
    return { webhook: options }

  if (options instanceof URL)
    return { webhook: options }

  if (!options.webhook)
    throw new TypeError('必须提供企业微信机器人完整 webhook')

  return options
}

function assertNonEmptyString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0)
    throw new TypeError(`${name} 必须是非空字符串`)
}

async function createMultipartBody(media: Blob, filename: string): Promise<{ boundary: string, body: Uint8Array<ArrayBuffer> }> {
  const boundary = `----qywxbot-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
  const contentType = media.type || 'application/octet-stream'
  const escapedFilename = filename.replaceAll('"', '%22').replaceAll('\r', '').replaceAll('\n', '')
  const head = Buffer.from([
    `--${boundary}`,
    `Content-Disposition: form-data; name="media"; filename="${escapedFilename}"`,
    `Content-Type: ${contentType}`,
    '',
    '',
  ].join('\r\n'))
  const file = Buffer.from(await media.arrayBuffer())
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([head, file, tail])

  return {
    boundary,
    body: new Uint8Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)),
  }
}

async function readQywxResponse<T extends QywxBotResponse>(response: Response): Promise<T> {
  const text = await response.text()
  const data = parseResponseText(text)
  const result = data as Partial<QywxBotResponse>

  if (!response.ok) {
    throw new QywxBotApiError(`企业微信机器人请求失败：HTTP ${response.status}`, {
      status: response.status,
      response: data,
      errcode: result.errcode,
      errmsg: result.errmsg,
    })
  }

  if (typeof result.errcode === 'number' && result.errcode !== 0) {
    throw new QywxBotApiError(`企业微信机器人请求失败：${result.errmsg ?? result.errcode}`, {
      status: response.status,
      response: data,
      errcode: result.errcode,
      errmsg: result.errmsg,
    })
  }

  return data as T
}

function parseResponseText(text: string): unknown {
  if (text.length === 0)
    return {}

  try {
    return JSON.parse(text)
  }
  catch {
    return text
  }
}
