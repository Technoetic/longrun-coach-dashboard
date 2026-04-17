"""AES-256-GCM 메시지 암호화/복호화"""
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

# 환경변수에서 키 로드 (32바이트 = AES-256)
_KEY_B64 = os.getenv("MSG_ENCRYPT_KEY", "")
if _KEY_B64:
    _KEY = base64.b64decode(_KEY_B64)
else:
    # 키 없으면 SECRET_KEY에서 파생
    import hashlib
    sk = os.getenv("SECRET_KEY", "longrun-default-key")
    _KEY = hashlib.sha256(sk.encode()).digest()


def encrypt(plaintext: str) -> str:
    """평문 → Base64 암호문 (nonce 포함)"""
    nonce = os.urandom(12)
    aesgcm = AESGCM(_KEY)
    ct = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return base64.b64encode(nonce + ct).decode("ascii")


def decrypt(ciphertext_b64: str) -> str:
    """Base64 암호문 → 평문"""
    raw = base64.b64decode(ciphertext_b64)
    nonce = raw[:12]
    ct = raw[12:]
    aesgcm = AESGCM(_KEY)
    return aesgcm.decrypt(nonce, ct, None).decode("utf-8")
