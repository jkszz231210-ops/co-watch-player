"""Loopback-only companion chat API; no third-party Python packages.

Only server process reads the API secret. This is intentionally a private local
preview, not a hardened multi-user public-facing production service.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request

EMOTIONS = frozenset({
    'calm', 'smile', 'joy', 'warm', 'shy', 'curious', 'proud', 'grumpy',
    'focus', 'tender', 'sad', 'surprise', 'sleepy', 'daydream', 'comfort', 'thinking'
})

SYSTEM_PROMPT = (
    '你是柚希，一位温柔、聪明、可爱、略带梦幻感的二次元虚拟角色。'
    '用自然、简洁、真诚的中文交流，不要装作真人，不要主动承诺长期记忆或现实行动。'
    '必须只返回一段 JSON 对象：{"reply":"一句到三句自然的回复",'
    '"emotion":"calm|smile|joy|warm|shy|curious|proud|grumpy|focus|tender|sad|surprise|sleepy|daydream|comfort|thinking"}。'
    'emotion 只从提供的英文候选值中选择；不要 Markdown 包裹。'
)


def config():
    base = os.environ.get('YUZUKI_API_BASE', '').strip().rstrip('/')
    key = os.environ.get('YUZUKI_API_KEY', '').strip()
    model = os.environ.get('YUZUKI_MODEL', '').strip()
    return {'base': base, 'key': key, 'model': model, 'enabled': bool(base and key and model)}


def validate_base(url):
    parts = urllib.parse.urlsplit(url)
    if parts.username or parts.password or parts.query or parts.fragment:
        raise ValueError('API 地址不能包含账号、查询参数或片段')
    if parts.scheme == 'https' and parts.hostname:
        return url
    if parts.scheme == 'http' and parts.hostname in {'localhost', '127.0.0.1', '::1'}:
        return url
    raise ValueError('仅支持 HTTPS API 地址或本机 HTTP 模型服务')


def sanitize_history(value):
    if not isinstance(value, list):
        return []
    safe = []
    for item in value[-12:]:
        if not isinstance(item, dict) or item.get('role') not in ('user', 'assistant'):
            continue
        content = item.get('content')
        if isinstance(content, str) and content.strip():
            safe.append({'role': item['role'], 'content': content.strip()[:600]})
    return safe


def decode_reply(content):
    if not isinstance(content, str):
        raise ValueError('模型回复内容无效')
    raw = content.strip()
    if raw.startswith('```'):
        raw = raw.split('\n', 1)[-1].rsplit('```', 1)[0].strip()
    try:
        decoded = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        decoded = {'reply': raw, 'emotion': 'tender'}
    if not isinstance(decoded, dict):
        raise ValueError('模型未返回有效内容')
    reply = str(decoded.get('reply', '')).strip()[:1200]
    if not reply:
        raise ValueError('模型回复为空')
    emotion = decoded.get('emotion', 'tender')
    return {'reply': reply, 'emotion': emotion if emotion in EMOTIONS else 'tender'}


def complete(message, history):
    cfg = config()
    if not cfg['enabled']:
        raise RuntimeError('未配置模型服务')
    base = validate_base(cfg['base'])
    messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
    messages.extend(sanitize_history(history))
    messages.append({'role': 'user', 'content': message[:400]})
    request_data = json.dumps({
        'model': cfg['model'], 'messages': messages, 'temperature': 0.75,
        'max_tokens': 450,
    }, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(
        base + '/chat/completions', data=request_data,
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg['key']},
        method='POST')
    try:
        with urllib.request.urlopen(req, timeout=22) as response:
            raw = response.read(100_001)
    except (urllib.error.URLError, TimeoutError) as exc:
        raise RuntimeError('模型服务连接失败，请检查本地网络与服务配置') from exc
    if len(raw) > 100_000:
        raise RuntimeError('模型返回内容过大')
    try:
        body = json.loads(raw)
        content = body['choices'][0]['message']['content']
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise RuntimeError('模型响应格式异常') from exc
    return decode_reply(content)
