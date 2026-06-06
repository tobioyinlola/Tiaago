import logging
import requests
from django.conf import settings
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class ConvertKitAPI:
    """
    ConvertKit API integration for handling marketing automation tasks.
    
    This class provides methods to interact with the ConvertKit API:
    - Subscribe users to forms
    - Add tags to subscribers
    - Update subscriber information
    """
    def __init__(self):
        self.api_key = settings.CONVERTKIT_API_KEY
        self.api_secret = settings.CONVERTKIT_API_SECRET
        self.base_url = "https://api.convertkit.com/v3"
        
        # Validate that API key is configured
        if not self.api_key:
            logger.warning("CONVERTKIT_API_KEY is not configured. ConvertKit API calls will fail.")

    def _make_request(self, method: str, endpoint: str, data: Optional[Dict[str, Any]] = None) -> Dict:
        """
        Make a request to the ConvertKit API.
        
        Args:
            method: HTTP method (GET, POST, PUT, etc.)
            endpoint: API endpoint (relative to base_url)
            data: Optional dictionary of data to send in request body
            
        Returns:
            Dict: JSON response from ConvertKit API
            
        Raises:
            requests.exceptions.RequestException: If the API request fails
        """
        url = f"{self.base_url}/{endpoint}"
        params = {"api_key": self.api_key}
        
        try:
            response = requests.request(
                method=method,
                url=url,
                params=params,
                json=data,
                timeout=10
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            logger.error(f"ConvertKit API HTTP error for {endpoint}: {str(e)} - Response: {response.text}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"ConvertKit API error for {endpoint}: {str(e)}")
            raise

    def subscribe_to_form(self, email: str, form_id: str, metadata: Dict[str, Any]) -> Dict:
        """
        Subscribe a user to a ConvertKit form with additional metadata.
        
        Args:
            email: User's email address
            form_id: ConvertKit form ID to subscribe to
            metadata: Dictionary of additional data to send with the subscription
            
        Returns:
            Dict: Response from ConvertKit API
        """
        endpoint = f"forms/{form_id}/subscribe"
        
        # Prepare the data payload
        # ConvertKit expects first_name as a separate field
        data = {
            "email": email,
            "first_name": metadata.get("first_name", ""),
        }
        
        # Add remaining metadata as custom fields (excluding first_name)
        fields = {k: v for k, v in metadata.items() if k != "first_name"}
        if fields:
            data["fields"] = fields
            
        logger.debug(f"Subscribing {email} to form {form_id} with data: {data}")
        return self._make_request("POST", endpoint, data)

    def add_tag_to_subscriber(self, email: str, tag_id: str, metadata: Optional[Dict[str, Any]] = None) -> Dict:
        """
        Add a tag to a subscriber in ConvertKit.
        
        Args:
            email: User's email address
            tag_id: ConvertKit tag ID to add
            metadata: Optional additional data to send with the tag
            
        Returns:
            Dict: Response from ConvertKit API
        """
        endpoint = f"tags/{tag_id}/subscribe"
        data = {
            "email": email,
            "first_name": metadata.get("first_name", "") if metadata else ""
        }
        
        # Add additional fields if provided
        if metadata and len(metadata) > 1:
            data["fields"] = {k: v for k, v in metadata.items() if k != "first_name"}
            
        logger.debug(f"Adding tag {tag_id} to subscriber {email}")
        return self._make_request("POST", endpoint, data)

    def update_subscriber(self, subscriber_id: str, metadata: Dict[str, Any]) -> Dict:
        """
        Update subscriber metadata in ConvertKit.
        
        Args:
            subscriber_id: ConvertKit subscriber ID
            metadata: Dictionary of fields to update
            
        Returns:
            Dict: Response from ConvertKit API
        """
        endpoint = f"subscribers/{subscriber_id}"
        logger.debug(f"Updating subscriber {subscriber_id} with data: {metadata}")
        return self._make_request("PUT", endpoint, metadata)