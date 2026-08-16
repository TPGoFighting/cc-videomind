/**
 * 抖音支付（直连商户）服务端封装：Native 下单 / 订单查询 / 回调验签与解密
 *
 * 文档：
 * - 签名构造：https://pay.douyinpay.com/wiki/66aa57118a7da602efb9bc2f/66aa574888f38d02f9de20da
 * - 回调验签：https://pay.douyinpay.com/wiki/66aa57118a7da602efb9bc2f/66aa57df29710302ee143340
 * - 回调解密：https://pay.douyinpay.com/wiki/66aa57118a7da602efb9bc2f/66aa582c29710302ee1433d7
 * - Native 下单：https://pay.douyinpay.com/wiki/639fd48f17c2f3021d237f61/65bf88e4fcc2570315fd1457
 *
 * 加解密全部使用 WebCrypto（Node 18+ / Cloudflare Workers 均原生支持）。
 * 私钥格式：PKCS#8 PEM（-----BEGIN PRIVATE KEY-----）
 * 平台公钥格式：SPKI PEM（-----BEGIN PUBLIC KEY-----，可从平台证书导出）
 */

import { fetchWithTimeout, ExternalServiceError } from "@/lib/utils/http";

const API_BASE = "https://api.douyinpay.com";
const NATIVE_PREPAY_PATH = "/v1/trade/transactions/native";
const QUERY_BY_OUT_TRADE_NO_PATH = "/v1/trade/transactions/out-trade-no";

export interface DyPayConfig {
  appId: string;
  mchId: string;
  merchantCertSerial: string;
  merchantPrivateKey: string; // PKCS#8 PEM
  platformPublicKey?: string; // SPKI PEM，用于回调/应答验签（回调必须配置）
  encryptKey?: string; // 接口加密密钥（32 字节字符串，回调解密必须配置）
}

export function getDyPayConfig(): DyPayConfig | null {
  const appId = process.env.DYPAY_APP_ID?.trim();
  const mchId = process.env.DYPAY_MCH_ID?.trim();
  const merchantCertSerial = process.env.DYPAY_CERT_SERIAL?.trim();
  const merchantPrivateKey = process.env.DYPAY_PRIVATE_KEY?.trim();
  if (!appId || !mchId || !merchantCertSerial || !merchantPrivateKey) return null;
  return {
    appId,
    mchId,
    merchantCertSerial,
    merchantPrivateKey,
    platformPublicKey: process.env.DYPAY_PLATFORM_PUBLIC_KEY?.trim() || undefined,
    encryptKey: process.env.DYPAY_ENCRYPT_KEY?.trim() || undefined,
  };
}

export function isDyPayConfigured(): boolean {
  return getDyPayConfig() !== null;
}

/* ------------------------------- PEM / Base64 ------------------------------ */

function pemToBytes(pem: string): Uint8Array {
  const b64 = pem
    .replace(/-----(BEGIN|END)[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/** Uint8Array → ArrayBuffer（WebCrypto BufferSource 兼容，处理 TS 5.7 泛型差异） */
function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/* --------------------------------- RSA 签名 -------------------------------- */

let cachedPrivateKey: { pem: string; key: CryptoKey } | null = null;

async function importMerchantPrivateKey(pem: string): Promise<CryptoKey> {
  if (cachedPrivateKey && cachedPrivateKey.pem === pem) return cachedPrivateKey.key;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    toBufferSource(pemToBytes(pem)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  cachedPrivateKey = { pem, key };
  return key;
}

async function importPlatformPublicKey(pem: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "spki",
    toBufferSource(pemToBytes(pem)),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/** SHA256withRSA 签名，返回 Base64 */
export async function rsaSha256Sign(privateKeyPem: string, message: string): Promise<string> {
  const key = await importMerchantPrivateKey(privateKeyPem);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    toBufferSource(new TextEncoder().encode(message))
  );
  return bytesToBase64(new Uint8Array(signature));
}

/** 用平台公钥验签（回调 / 应答），签名值为 Base64 */
export async function rsaSha256Verify(
  publicKeyPem: string,
  message: string,
  signatureBase64: string
): Promise<boolean> {
  try {
    const key = await importPlatformPublicKey(publicKeyPem);
    const sigBinary = atob(signatureBase64);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) sigBytes[i] = sigBinary.charCodeAt(i);
    return crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      toBufferSource(sigBytes),
      toBufferSource(new TextEncoder().encode(message))
    );
  } catch {
    return false;
  }
}

/* ------------------------------ AES-256-GCM 解密 ---------------------------- */

/** 解密回调 resource.ciphertext：key 为 32 字节接口加密密钥，nonce 12 字节 */
export async function aesGcmDecrypt(
  encryptKey: string,
  nonce: string,
  associatedData: string | undefined,
  ciphertextBase64: string
): Promise<string> {
  const keyBytes = new TextEncoder().encode(encryptKey);
  if (keyBytes.length !== 32) {
    throw new Error(`无效的接口加密密钥长度：${keyBytes.length}（必须为 32 字节）`);
  }
  const aesKey = await crypto.subtle.importKey("raw", toBufferSource(keyBytes), "AES-GCM", false, [
    "decrypt",
  ]);
  const cipherBinary = atob(ciphertextBase64);
  const cipherBytes = new Uint8Array(cipherBinary.length);
  for (let i = 0; i < cipherBinary.length; i++) cipherBytes[i] = cipherBinary.charCodeAt(i);
  const params: AesGcmParams = {
    name: "AES-GCM",
    iv: toBufferSource(new TextEncoder().encode(nonce)),
    tagLength: 128,
  };
  if (associatedData) params.additionalData = toBufferSource(new TextEncoder().encode(associatedData));
  const plain = await crypto.subtle.decrypt(params, aesKey, toBufferSource(cipherBytes));
  return new TextDecoder().decode(plain);
}

/* -------------------------------- 请求签名头 ------------------------------- */

function randomNonce(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const random = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i++) out += chars[random[i] % chars.length];
  return out;
}

/**
 * 构造 Authorization 头：
 * DouyinPay-RSA mchid="...",nonce_str="...",timestamp="...",serial_no="...",signature="..."
 * 签名串：METHOD\nURL(不含域名，含查询串)\n时间戳\n随机串\n请求体\n
 */
async function buildAuthorizationHeader(
  config: DyPayConfig,
  method: "GET" | "POST",
  canonicalUrl: string,
  body: string
): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomNonce(32);
  const message = `${method}\n${canonicalUrl}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = await rsaSha256Sign(config.merchantPrivateKey, message);
  return (
    `DouyinPay-RSA mchid="${config.mchId}",` +
    `nonce_str="${nonce}",` +
    `timestamp="${timestamp}",` +
    `serial_no="${config.merchantCertSerial}",` +
    `signature="${signature}"`
  );
}

/* ------------------------------- 业务 API 封装 ------------------------------ */

export interface NativePrepayParams {
  outTradeNo: string;
  description: string;
  amountTotal: number; // 单位：分
  notifyUrl: string;
  timeExpire: string; // RFC3339，如 2026-08-16T20:00:00+08:00
  attach?: string;
}

export interface NativePrepayResult {
  codeUrl: string; // 二维码链接（约 2 分钟有效期），前端渲染成二维码
}

interface DyPayErrorBody {
  code?: string;
  message?: string;
  detail?: unknown;
}

/** Native 下单：返回 code_url。参数必须确定性生成（同一 out_trade_no 重试需参数完全一致） */
export async function nativePrepay(params: NativePrepayParams): Promise<NativePrepayResult> {
  const config = getDyPayConfig();
  if (!config) throw new ExternalServiceError("DouyinPay is not configured", "douyinpay");

  const bodyObj: Record<string, unknown> = {
    appid: config.appId,
    mchid: config.mchId,
    description: params.description,
    out_trade_no: params.outTradeNo,
    notify_url: params.notifyUrl,
    amount: { currency: "CNY", total: params.amountTotal },
    time_expire: params.timeExpire,
  };
  if (params.attach) bodyObj.attach = params.attach;
  const body = JSON.stringify(bodyObj);

  const authorization = await buildAuthorizationHeader(config, "POST", NATIVE_PREPAY_PATH, body);
  const response = await fetchWithTimeout(`${API_BASE}${NATIVE_PREPAY_PATH}`, {
    method: "POST",
    service: "douyinpay",
    timeoutMs: 15000,
    headers: {
      Authorization: authorization,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body,
  });

  const data = (await response.json()) as { code_url?: string } & DyPayErrorBody;
  if (!data.code_url) {
    throw new ExternalServiceError(
      `DouyinPay prepay failed: ${data.code ?? "UNKNOWN"} ${data.message ?? ""}`,
      "douyinpay",
      response.status
    );
  }
  return { codeUrl: data.code_url };
}

export interface DyPayOrderQueryResult {
  tradeState: "SUCCESS" | "NOTPAY" | "CLOSED" | "REFUND" | "USERPAYING" | "PAYERROR";
  transactionId?: string;
  successTime?: string;
  amountTotal?: number;
  outTradeNo: string;
  raw: Record<string, unknown>;
}

/** 按商户订单号查单；订单不存在（404）返回 null */
export async function queryOrderByOutTradeNo(outTradeNo: string): Promise<DyPayOrderQueryResult | null> {
  const config = getDyPayConfig();
  if (!config) throw new ExternalServiceError("DouyinPay is not configured", "douyinpay");

  const canonicalUrl = `${QUERY_BY_OUT_TRADE_NO_PATH}/${encodeURIComponent(outTradeNo)}?mchid=${encodeURIComponent(config.mchId)}`;
  const authorization = await buildAuthorizationHeader(config, "GET", canonicalUrl, "");

  let response: Response;
  try {
    response = await fetchWithTimeout(`${API_BASE}${canonicalUrl}`, {
      method: "GET",
      service: "douyinpay",
      timeoutMs: 15000,
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    if (error instanceof ExternalServiceError && error.status === 404) return null;
    throw error;
  }

  const data = (await response.json()) as Record<string, unknown> & DyPayErrorBody;
  const tradeState = data.trade_state as DyPayOrderQueryResult["tradeState"] | undefined;
  if (!tradeState) {
    throw new ExternalServiceError(
      `DouyinPay query failed: ${data.code ?? "UNKNOWN"} ${data.message ?? ""}`,
      "douyinpay",
      response.status
    );
  }
  const amount = data.amount as { total?: number } | undefined;
  return {
    tradeState,
    transactionId: (data.transaction_id as string | undefined) ?? undefined,
    successTime: (data.success_time as string | undefined) ?? undefined,
    amountTotal: amount?.total,
    outTradeNo: (data.out_trade_no as string | undefined) ?? outTradeNo,
    raw: data,
  };
}

/* --------------------------------- 回调处理 -------------------------------- */

export interface DyPayCallbackResource {
  algorithm?: string;
  ciphertext?: string;
  nonce?: string;
  associated_data?: string;
}

export interface DyPayCallbackBody {
  id?: string;
  create_time?: string;
  event_type?: string;
  resource_type?: string;
  summary?: string;
  resource?: DyPayCallbackResource;
}

export interface DyPayCallbackPayload {
  /** 通知 ID（幂等键） */
  id: string;
  eventType: string;
  /** resource 解密后的业务数据（如订单支付结果） */
  data: Record<string, unknown>;
}

/**
 * 处理抖音支付回调通知：
 * 1. 用平台公钥验证 Douyinpay-Signature（时间戳\n随机串\n原始报文\n）
 * 2. AES-256-GCM 解密 resource.ciphertext
 * 失败直接抛错（由路由返回非 2xx 触发抖音重试）。
 */
export async function parseDyPayCallback(
  rawBody: string,
  headers: Headers
): Promise<DyPayCallbackPayload> {
  const config = getDyPayConfig();
  if (!config?.platformPublicKey || !config.encryptKey) {
    throw new ExternalServiceError(
      "DouyinPay platform public key / encrypt key not configured",
      "douyinpay"
    );
  }

  const timestamp = headers.get("douyinpay-timestamp") ?? "";
  const nonce = headers.get("douyinpay-nonce") ?? "";
  const signature = headers.get("douyinpay-signature") ?? "";
  if (!timestamp || !nonce || !signature) {
    throw new ExternalServiceError("DouyinPay callback missing signature headers", "douyinpay", 401);
  }

  const verified = await rsaSha256Verify(
    config.platformPublicKey,
    `${timestamp}\n${nonce}\n${rawBody}\n`,
    signature
  );
  if (!verified) {
    throw new ExternalServiceError("DouyinPay callback signature verification failed", "douyinpay", 401);
  }

  const body = JSON.parse(rawBody) as DyPayCallbackBody;
  if (!body.id || !body.event_type || !body.resource?.ciphertext || !body.resource.nonce) {
    throw new ExternalServiceError("DouyinPay callback malformed body", "douyinpay", 400);
  }

  const plain = await aesGcmDecrypt(
    config.encryptKey,
    body.resource.nonce,
    body.resource.associated_data,
    body.resource.ciphertext
  );
  const data = JSON.parse(plain) as Record<string, unknown>;
  return { id: body.id, eventType: body.event_type, data };
}

/* --------------------------------- 工具函数 -------------------------------- */

const OUT_TRADE_NO_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** 生成商户订单号：TP + 时间戳 base36 + 8 位随机，共 18 字符（限制 6-32） */
export function generateOutTradeNo(): string {
  const random = crypto.getRandomValues(new Uint8Array(8));
  let suffix = "";
  for (let i = 0; i < 8; i++) suffix += OUT_TRADE_NO_CHARS[random[i] % OUT_TRADE_NO_CHARS.length];
  return `TP${Date.now().toString(36)}${suffix}`;
}

/** Date → RFC3339 东八区字符串（yyyy-MM-ddTHH:mm:ss+08:00），抖音支付 time_expire 要求格式 */
export function toRfc3339Plus8(date: Date): string {
  const shifted = new Date(date.getTime() + 8 * 3600 * 1000);
  return shifted.toISOString().replace(/\.\d{3}Z$/, "+08:00");
}
