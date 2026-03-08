"""Twilio webhook endpoints — the Agentic Inbox entry point."""

import logging

from fastapi import APIRouter, Depends, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.agents.orchestrator import Orchestrator
from app.integrations.twilio.client import send_sms

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/twilio/sms")
async def twilio_sms_webhook(
    From: str = Form(...),
    To: str = Form(...),
    Body: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    """Receive inbound SMS from Twilio -> run through Orchestrator pipeline.

    Twilio expects a TwiML response. We reply with the agent's suggested response.
    """
    logger.info(f"Inbound SMS from {From} to {To}: {Body[:100]}")

    orchestrator = Orchestrator(db)
    state = await orchestrator.handle_sms(to_number=To, from_number=From, body=Body)

    # Build TwiML response
    reply_text = "Got it, thanks!"
    if state.parsed_message and state.parsed_message.get("suggested_response"):
        reply_text = state.parsed_message["suggested_response"]

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{reply_text}</Message>
</Response>"""

    return Response(content=twiml, media_type="application/xml")


@router.post("/twilio/voice")
async def twilio_voice_webhook(
    CallSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(...),
):
    """Receive inbound voice call -> prompt for recording via Deepgram.

    Returns TwiML that records the caller's message for later STT processing.
    """
    logger.info(f"Inbound call from {From} to {To}")

    twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">
        Thank you for calling the project update line.
        Please leave your update after the beep, then hang up.
    </Say>
    <Record
        maxLength="120"
        action="/api/v1/webhooks/twilio/voice/recording"
        transcribe="false"
    />
</Response>"""

    return Response(content=twiml, media_type="application/xml")


@router.post("/twilio/voice/recording")
async def twilio_voice_recording(
    CallSid: str = Form(...),
    From: str = Form(...),
    To: str = Form(...),
    RecordingUrl: str = Form(""),
    db: AsyncSession = Depends(get_db),
):
    """Process a completed voice recording — send to Deepgram STT then Orchestrator."""
    logger.info(f"Recording received for call {CallSid}: {RecordingUrl}")

    # TODO: Integrate Deepgram STT here to transcribe RecordingUrl
    # For now, log the recording for manual processing
    orchestrator = Orchestrator(db)
    state = await orchestrator.handle_sms(
        to_number=To,
        from_number=From,
        body=f"[Voice recording pending transcription: {RecordingUrl}]",
    )

    twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Thank you. Your update has been recorded.</Say>
</Response>"""

    return Response(content=twiml, media_type="application/xml")
