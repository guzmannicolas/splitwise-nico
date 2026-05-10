import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function makeResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ── Base64url ──────────────────────────────────────────────────────────────────

function toBase64Url(buf: ArrayBuffer | Uint8Array): string {
  const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const byte of b) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(b64 + pad);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// ── HKDF ──────────────────────────────────────────────────────────────────────

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    keyMaterial,
    length * 8
  );
  return new Uint8Array(bits);
}

// ── VAPID JWT (RFC 8292) ───────────────────────────────────────────────────────

async function signVapidJwt(endpoint: string): Promise<{ jwt: string; pubKeyBase64: string }> {
  const { protocol, host } = new URL(endpoint);
  const audience = `${protocol}//${host}`;
  const now = Math.floor(Date.now() / 1000);

  const pubBytes = fromBase64Url(VAPID_PUBLIC_KEY);
  const x = toBase64Url(pubBytes.slice(1, 33));
  const y = toBase64Url(pubBytes.slice(33, 65));

  const signingKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: VAPID_PRIVATE_KEY, x, y },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const headerB64 = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  );
  const claimsB64 = toBase64Url(
    new TextEncoder().encode(
      JSON.stringify({ aud: audience, exp: now + 43200, sub: VAPID_SUBJECT })
    )
  );
  const sigInput = `${headerB64}.${claimsB64}`;
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    signingKey,
    new TextEncoder().encode(sigInput)
  );

  return { jwt: `${sigInput}.${toBase64Url(sig)}`, pubKeyBase64: VAPID_PUBLIC_KEY };
}

// ── Web Push Encryption (RFC 8291 / aes128gcm) ────────────────────────────────

async function encryptPayload(
  clientPubKey: Uint8Array,
  authSecret: Uint8Array,
  plaintext: Uint8Array
): Promise<Uint8Array> {
  const serverKP = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const serverPubJwk = await crypto.subtle.exportKey('jwk', serverKP.publicKey);
  const serverPubRaw = new Uint8Array(65);
  serverPubRaw[0] = 0x04;
  serverPubRaw.set(fromBase64Url(serverPubJwk.x!), 1);
  serverPubRaw.set(fromBase64Url(serverPubJwk.y!), 33);

  const clientKey = await crypto.subtle.importKey(
    'raw',
    clientPubKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, serverKP.privateKey, 256)
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || clientPub || serverPub)
  const prkInfo = new Uint8Array(144);
  prkInfo.set(new TextEncoder().encode('WebPush: info'), 0);
  prkInfo[13] = 0x00;
  prkInfo.set(clientPubKey, 14);
  prkInfo.set(serverPubRaw, 79);
  const prk = await hkdf(authSecret, sharedSecret, prkInfo, 32);

  // CEK = HKDF(salt, prk, "Content-Encoding: aes128gcm\0", 16)
  const cekInfo = new Uint8Array(28);
  cekInfo.set(new TextEncoder().encode('Content-Encoding: aes128gcm'), 0);
  cekInfo[27] = 0x00;
  const cek = await hkdf(salt, prk, cekInfo, 16);

  // Nonce = HKDF(salt, prk, "Content-Encoding: nonce\0", 12)
  const nonceInfo = new Uint8Array(24);
  nonceInfo.set(new TextEncoder().encode('Content-Encoding: nonce'), 0);
  nonceInfo[23] = 0x00;
  const nonce = await hkdf(salt, prk, nonceInfo, 12);

  // Pad: append 0x02 delimiter (single record)
  const padded = new Uint8Array(plaintext.length + 1);
  padded.set(plaintext);
  padded[plaintext.length] = 0x02;

  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, padded)
  );

  // aes128gcm record header: salt(16) + rs(4 BE) + idlen(1) + serverPubRaw
  const rs = ciphertext.length;
  const header = new Uint8Array(21 + serverPubRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = serverPubRaw.length;
  header.set(serverPubRaw, 21);

  const result = new Uint8Array(header.length + ciphertext.length);
  result.set(header);
  result.set(ciphertext, header.length);
  return result;
}

// ── Handler ───────────────────────────────────────────────────────────────────

async function handler(req: Request): Promise<Response> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return makeResponse({ error: 'Missing Supabase env vars' }, 500);
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return makeResponse({ error: 'Missing VAPID env vars' }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    body = req.method === 'POST' ? await req.json() : {};
  } catch {
    return makeResponse({ error: 'Invalid JSON body' }, 400);
  }

  const groupId = (body.groupId as string) ?? null;
  const targetUserId = (body.targetUserId as string) ?? null;

  // Accept both flat {title, body, ...} and nested {payload: {...}}
  const payload = (body.payload as Record<string, unknown>) ?? {
    title: body.title,
    body: body.body,
    icon: body.icon,
    badge: body.badge,
    tag: body.tag,
    data: body.data,
  };

  if (!groupId && !targetUserId) {
    return makeResponse({ error: 'groupId or targetUserId required' }, 400);
  }

  // Fetch subscriptions filtered by group members or specific user
  let query = supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh_key, auth_key');

  if (targetUserId) {
    query = query.eq('user_id', targetUserId);
  } else {
    const { data: members, error: memberError } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', groupId);

    if (memberError) return makeResponse({ error: 'Error fetching group members' }, 500);
    const memberIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
    if (memberIds.length === 0) return makeResponse({ message: 'No members', sent: 0 });
    query = query.in('user_id', memberIds);
  }

  const { data: subs, error: subsError } = await query;
  if (subsError) return makeResponse({ error: 'Error fetching subscriptions', detail: subsError.message }, 500);
  if (!subs || subs.length === 0) return makeResponse({ message: 'No subscriptions found', sent: 0 });

  const plaintextBytes = new TextEncoder().encode(JSON.stringify(payload));
  const results: { success: boolean; status?: number; error?: string; endpoint: string }[] = [];
  const toDelete: string[] = [];

  for (const sub of subs) {
    try {
      const clientPub = fromBase64Url(sub.p256dh_key);
      const authSecret = fromBase64Url(sub.auth_key);
      const encrypted = await encryptPayload(clientPub, authSecret, plaintextBytes);
      const { jwt, pubKeyBase64 } = await signVapidJwt(sub.endpoint);

      const resp = await fetch(sub.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `vapid t=${jwt},k=${pubKeyBase64}`,
          'Content-Encoding': 'aes128gcm',
          'Content-Type': 'application/octet-stream',
          TTL: '60',
          Urgency: 'normal',
        },
        body: encrypted,
      });

      if (resp.status === 410 || resp.status === 404) toDelete.push(sub.id);
      results.push({ success: resp.ok, status: resp.status, endpoint: sub.endpoint });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ success: false, error: msg, endpoint: sub.endpoint });
    }
  }

  if (toDelete.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', toDelete);
  }

  return makeResponse({
    sent: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}

export default handler;
