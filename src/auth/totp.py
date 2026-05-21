import base64
import io

import pyotp
import qrcode


def generate_secret() -> str:
    return pyotp.random_base32()


def get_qr_base64(email: str, secret: str) -> str:
    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=email, issuer_name="EventAnalytics"
    )
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def verify_code(secret: str, code: str) -> bool:
    return pyotp.TOTP(secret).verify(code, valid_window=4)
