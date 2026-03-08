"""QR Code generation service — links physical sites to their Digital Twin."""

import io
import uuid
from pathlib import Path

import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer

from app.core.config import settings


def generate_project_qr(project_id: uuid.UUID) -> tuple[bytes, str]:
    """Generate a QR code that links to the project's QR Hub page.

    Returns:
        Tuple of (png_bytes, hub_url)
    """
    hub_url = f"{settings.frontend_url}/projects/{project_id}/hub"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(hub_url)
    qr.make(fit=True)

    img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        fill_color="#0f172a",
        back_color="#ffffff",
    )

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue(), hub_url


def generate_qr_data_uri(project_id: uuid.UUID) -> tuple[str, str]:
    """Generate a QR code as a base64 data URI for embedding.

    Returns:
        Tuple of (data_uri, hub_url)
    """
    import base64

    png_bytes, hub_url = generate_project_qr(project_id)
    b64 = base64.b64encode(png_bytes).decode("utf-8")
    data_uri = f"data:image/png;base64,{b64}"
    return data_uri, hub_url
