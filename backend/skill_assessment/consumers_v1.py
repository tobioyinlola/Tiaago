import websockets
import asyncio
import json
import aiohttp
import logging
from django.conf import settings
from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from utils.elevenlabs_handler import elevenlabs_handler, get_universal_agent_id, base_headers
from skill_assessment.models import PreScreeningInterviewQuestionResponse, PreScreeningInterviewSession, GeneralSkillAssessment, JobApplication
from django.utils.timezone import now
from channels.exceptions import DenyConnection

logger = logging.getLogger(__name__)

class PreScreeningInterviewConsumer(AsyncJsonWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.elevenlabs_ws = None
        self.listen_task = None
        self.session = None 

    async def connect(self):
        logger.debug("TEST: This should appear in terminal")
        logger.error("TEST: This error should appear too")
        try:
            self.user = self.scope["user"]
            print(f"[CONNECT] Connection attempt by user: {self.user}")

            if not self.user.is_authenticated:
                print("[CONNECT] Unauthenticated user. Closing connection.")
                await self.close(code=4001)
                return
            
            assessment = await sync_to_async(
                lambda: GeneralSkillAssessment.objects.select_related(
                    "job_application",
                    "job_application__applicant",
                    "job_application__applicant__user"
                ).filter(job_application__applicant__user=self.user).first()
            )()

            self.assessment = assessment

            if not self.assessment:
                print("[CONNECT ERROR] No assessment found for user: %s", self.user)
                await self.close()
                return

            job_application = assessment.job_application
            self.job_application = job_application

            print(f"[CONNECT] Authenticated user ID: {self.user.id}")

            if not await self.has_passed_assessment():
                print(f"[CONNECT] User {self.user.id} failed assessment check")
                await self.close(code=4003)
                return

            await self.setup_elevenlabs_connection()
            await self.accept()
            print(f"[CONNECT] Connection accepted for user {self.user.id}")

        except Exception as e:
            print(f"[CONNECT ERROR] {str(e)}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        logger.info(f"[DISCONNECT] Closing connection. Code: {close_code}")
        try:
            if self.elevenlabs_ws:
                await self.elevenlabs_ws.close()
                logger.info("[DISCONNECT] ElevenLabs WS closed")
            if self.session:
                await self.session.close()
                logger.info("[DISCONNECT] aiohttp session closed")
            if self.listen_task:
                self.listen_task.cancel()
                logger.info("[DISCONNECT] Listen task cancelled")
        except Exception as e:
            logger.exception("[DISCONNECT] Exception while cleaning up")
        # finally:
        #     await self.finalize_interview()


    async def receive_json(self, content, **kwargs):
        try:
            logger.debug(f"[RECEIVE_JSON] Received content: {content}")

            if content.get("type") == "user_audio_chunk":
                base64_audio = content.get("data")

                if self.elevenlabs_ws:
                    logger.debug("[RECEIVE_JSON] Forwarding audio to ElevenLabs")
                    await self.elevenlabs_ws.send_json({
                        "user_audio_chunk": base64_audio
                    })
                    
                    logger.debug("[RECEIVE_JSON] Audio chunk sent")
                else:
                    logger.warning("[RECEIVE_JSON] elevenlabs_ws is not connected!")
            else:
                logger.warning(f"[RECEIVE_JSON] Unknown message type: {content.get('type')}")

        except aiohttp.ClientConnectionError as e:
            logger.error(f"[RECEIVE_JSON] ElevenLabs connection lost: {str(e)}")
            await self.close(code=4004)
        except Exception as e:
            logger.exception(f"[RECEIVE_JSON] Unexpected error")

    async def setup_elevenlabs_connection(self):
        try:
            print("[SETUP] Setting up ElevenLabs WebSocket connection...")
            agent_id = await sync_to_async(get_universal_agent_id)()
            headers = base_headers

            self.session = aiohttp.ClientSession()
            ws_url = f"wss://api.elevenlabs.io/v1/convai/conversation?agent_id={agent_id}"
            print(f"[SETUP] Connecting to ElevenLabs URL: {ws_url}")
            self.elevenlabs_ws = await self.session.ws_connect(ws_url, headers=headers)
            print("[SETUP] ElevenLabs WebSocket connected.")
     
            self.listen_task = asyncio.create_task(self.listen_to_elevenlabs())

        except Exception as e:
            print(f"[SETUP ERROR] ElevenLabs connection failed: {str(e)}")
            await self.close(code=4005)

    async def listen_to_elevenlabs(self):
        try:
            print("[LISTENER] Listening to ElevenLabs WebSocket...")
            async for message in self.elevenlabs_ws:
                print(f"[LISTENER] Received message: {message}")

                if message.type == aiohttp.WSMsgType.TEXT:
                    await self.handle_elevenlabs_message(message.data)

                elif message.type == aiohttp.WSMsgType.CLOSED:
                    print("[LISTENER] ElevenLabs WS closed by server.")
                    break

                elif message.type == aiohttp.WSMsgType.CLOSE:
                    print("[LISTENER] ElevenLabs WS received CLOSE.")
                    break

                elif message.type == aiohttp.WSMsgType.ERROR:
                    print(f"[LISTENER ERROR] WebSocket error: {self.elevenlabs_ws.exception()}")
                    break

                else:
                    print(f"[LISTENER] Unexpected message type: {message.type}")
                    
            print("[LISTENER] Exiting async for loop.")
            print(f"[LISTENER] WebSocket closed: {self.elevenlabs_ws.closed}, close code: {self.elevenlabs_ws.close_code}")


        except aiohttp.ClientConnectionError as e:
            print(f"[LISTENER ERROR] Connection closed unexpectedly: {str(e)}")
            await self.close(code=4004)

        except Exception as e:
            print(f"[LISTENER ERROR] Unexpected exception: {str(e)}")
            await self.close(code=4004)

    async def handle_elevenlabs_message(self, message):
        try:
            print(f"[HANDLE_MSG] Raw message: {message}")
            event = json.loads(message)
            event_type = event.get("type")
            print(f"[HANDLE_MSG] Parsed type: {event_type}")

            if event_type == "conversation_initiation_metadata":
                conversation_event = event.get("conversation_initiation_metadata_event", {})
                conversation_id = conversation_event.get("conversation_id")
                self.conversation_id = conversation_id
                await self.send_json({"type": "conversation_id", "data": conversation_id})
                print(f"[CONVERSATION_ID]- {conversation_id}") #TODO save conversation_id to database
            

            elif event_type == "audio":
                audio_event = event.get("audio_event", {})
                audio_data = audio_event.get("audio_base_64")
                if audio_data:
                    await self.send_json({"type": "audio", "data": audio_data})
                    print("[HANDLE_MSG] Sent audio_chunk to frontend.")
                else:
                    print("[HANDLE_MSG ERROR] 'data' field missing in audio_chunk.")

            elif event_type == "ping":
                ping_event = event.get("ping_event", {})
                event_id = ping_event.get("event_id")

                pong_response = {"type": "pong"}
                if event_id:
                    pong_response["event_id"] = event_id

                await self.elevenlabs_ws.send_str(json.dumps(pong_response))
                print(f"[HANDLE_MSG] Replied with pong to ElevenLabs. Event ID: {event_id}")


            elif event_type == "agent_response":
                agent_event = event.get("agent_response_event", {})
                agent_response = agent_event.get("agent_response")
                
                if agent_response:
                    await self.send_json({"type": "agent_response", "agent_response_event": agent_response})
                    print("[HANDLE_MSG] Sent agent response to frontend.")
                    await self.finalize_interview(
                        agent_response=agent_response
                    )


                    # interview_transcript = agent_event.get("interview_transcript")
                    # if :
                    #     await self.handle_structured_data(structured_data)
                    #     print("[HANDLE_MSG] Handled structured data.")
                else:
                    print("[HANDLE_MSG ERROR] 'agent_response' field missing in 'agent_response_event'.")

            elif event_type == "user_transcript":
                user_event = event.get("user_transcription_event", {})
                user_text = user_event.get("user_transcript")
                if user_text:
                    await self.send_json({"type": "user_transcript", "text": user_text})
                    print("[HANDLE_MSG] Sent user transcript to frontend.")
                else:
                    print("[HANDLE_MSG ERROR] 'user_transcript' missing in 'user_transcription_event'.")

            elif event_type == "interruption":
                reason = event.get("reason", "unknown")
                await self.send_json({"type": "interruption", "reason": reason})
                print(f"[HANDLE_MSG] Sent interruption event to frontend. Reason: {reason}")

            else:
                print(f"[HANDLE_MSG] Unknown event type: {event_type}")

        except json.JSONDecodeError:
            print("[HANDLE_MSG ERROR] Invalid JSON.")
        except KeyError as e:
            print(f"[HANDLE_MSG ERROR] Missing key: {str(e)}")
        except Exception as e:
            print(f"[HANDLE_MSG ERROR] Unexpected error: {str(e)}")

    # async def handle_structured_data(self, data):
    #     print(f"[STRUCTURED_DATA] Received structured data: {data}")
    #     self.session_data.append(data)
    #     self.question_counter += 1

    #     if self.question_counter >= 5:
    #         print("[STRUCTURED_DATA] Finalizing interview...")
    #         await self.finalize_interview()
    #     else:
    #         print("[STRUCTURED_DATA] Saving intermediate response.")
    #         await self.save_response(data)

    # @sync_to_async
    # def save_response(self, data):
    #     try:
    #         print(f"[SAVE_RESPONSE] Data: {data}")
    #         # Implement saving logic here
    #     except Exception as e:
    #         print(f"[SAVE_RESPONSE ERROR] {str(e)}")

    # async def finalize_interview_if_needed(self):
    #     if self.question_counter >= 5 and not hasattr(self, 'interview_finalized'):
    #         print("[FINALIZE_IF_NEEDED] Interview not finalized, calling finalize.")
    #         await self.finalize_interview()

    @sync_to_async
    def finalize_interview(self, agent_response):
        try:
            print("[FINALIZE] Finalizing interview session...")
            if not agent_response:
                print("[FINALIZE] No response data to save.")
                return

            total_points = agent_response.total_points
            evaluation = agent_response.final_evaluation
            summary_comment = agent_response.summary_comment

            conversation_id = getattr(self, "conversation_id", None)
            if not conversation_id:
                print("[FINALIZE] No conversation_id available.")
                return

            PreScreeningInterviewSession.objects.create(
                candidate=self.user.profile,
                job_application=self.job_application,
                assessment=self.assessment,
                conversation_id=conversation_id,
                total_points=total_points,
                final_evaluation=evaluation,
                summary_comment=summary_comment
            )

            self.interview_finalized = True
            print("[FINALIZE] Interview finalized successfully.")

        except Exception as e:
            print(f"[FINALIZE ERROR] {str(e)}")

    # def get_evaluation(self, total_points):
    #     print(f"[EVALUATION] Scoring total: {total_points}")
    #     if total_points >= 12:
    #         return "Excellent Cultural Fit"
    #     if total_points >= 8:
    #         return "Acceptable Cultural Fit with Minor Risks"
    #     return "Poor Cultural Fit"

    # def create_question_response(self, interview, item):
    #     print(f"[CREATE_RESPONSE] Saving question: {item.get('question')}")
    #     PreScreeningInterviewQuestionResponse.objects.create(
    #         session=interview,
    #         question=item["question"],
    #         answer=item["answer"],
    #         follow_up_asked=item["follow_up_asked"],
    #         follow_up_question=item.get("follow_up_question"),
    #         follow_up_response=item.get("follow_up_response"),
    #         value_alignment=item["analysis"]["value_alignment"],
    #         strengths=item["analysis"]["strengths"],
    #         concerns=item["analysis"]["concerns"],
    #         bias_check=item["analysis"]["bias_check"],
    #         relevance=item["scoring"]["relevance"],
    #         alignment=item["scoring"]["alignment"],
    #         self_awareness=item["scoring"]["self_awareness"],
    #         adjustments=item["scoring"]["adjustments"],
    #         total=item["scoring"]["total"],
    #     )

    
