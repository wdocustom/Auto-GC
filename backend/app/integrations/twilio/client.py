"""Twilio client wrapper for sending SMS and managing phone numbers."""

from twilio.rest import Client

from app.core.config import settings


def get_twilio_client() -> Client:
    return Client(settings.twilio_account_sid, settings.twilio_auth_token)


async def send_sms(to: str, body: str, from_number: str | None = None) -> str:
    """Send an SMS via Twilio. Returns the message SID."""
    client = get_twilio_client()
    message = client.messages.create(
        body=body,
        from_=from_number or settings.twilio_phone_number,
        to=to,
    )
    return message.sid
