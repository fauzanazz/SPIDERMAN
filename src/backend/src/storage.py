import os
import shutil
from typing import Optional
from pathlib import Path
import logging
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from botocore.config import Config

logger = logging.getLogger(__name__)

class StorageManager:
    def __init__(self):
        self.local_base_dir = Path("content_classification")
        self.s3_client = None
        self.s3_resource = None
        self.bucket_name = None
        self.endpoint_url = None
        self._contabu_initialized = False

    def _ensure_contabu_client(self):
        """
        Initializes the B2 client on-demand to avoid startup race conditions.
        """
        if self._contabu_initialized:
            return

        project_root = Path(__file__).parent.parent.parent
        env_path = project_root / ".env"
        if env_path.exists():
            load_dotenv(env_path, override=True)
            logger.info(f"Loaded environment variables from {env_path}")

        self.endpoint_url = os.getenv("CONTABU_BUCKET_URL")
        access_key = os.getenv("CONTABU_ACCESS_KEY")
        secret_key = os.getenv("CONTABU_SECRET_KEY")
        self.bucket_name = os.getenv("CONTABU_BUCKET_NAME")
        
        self._contabu_initialized = True

        is_contabu_configured = all([self.endpoint_url, access_key, secret_key, self.bucket_name])
        logger.info(f"--- B2 On-Demand Check: Is B2 configured? {is_contabu_configured} ---")

        if is_contabu_configured:
            try:
                # Initialize both resource and client
                self.s3_resource = boto3.resource(
                    's3',
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=access_key,
                    aws_secret_access_key=secret_key,
                    region_name='us-west-1',
                    config=Config(signature_version='s3')
                )
                
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=access_key,
                    aws_secret_access_key=secret_key,
                    region_name='us-west-1',
                    config=Config(signature_version='s3')
                )
                
                logger.info("✓ B2 OSS resource and client initialized successfully on-demand.")
            except Exception as e:
                logger.error(f"Failed to initialize B2 resource on-demand: {e}. Falling back to local storage.")
                self.s3_resource = None
                self.s3_client = None
        else:
            logger.warning("B2 OSS not fully configured. Using local storage as default.")

    def _get_oss_key(self, relative_path: str) -> str:
        return relative_path.replace(os.sep, '/').lstrip('/')

    async def save_file(self, source_filepath: str, destination_relative_path: str) -> str:
        """
        Save file to B2 OSS and return the OSS key (not the full URL)
        """
        self._ensure_contabu_client()

        source_path = Path(source_filepath)
        if not source_path.exists():
            logger.error(f"Source file not found: {source_filepath}")
            raise FileNotFoundError(f"Source file not found: {source_filepath}")

        if self.s3_resource:
            oss_key = self._get_oss_key(destination_relative_path)
            logger.info(f"Attempting to upload to B2 OSS. Bucket: {self.bucket_name}, Key: {oss_key}")
            try:
                bucket = self.s3_resource.Bucket(self.bucket_name)
                # Upload file to B2 OSS
                bucket.upload_file(source_filepath, oss_key)
                logger.info(f"✓ File successfully uploaded to B2 OSS with key: {oss_key}")
                
                # Return the OSS key instead of the full URL
                # This allows the controller to generate presigned URLs when needed
                return oss_key
                
            except ClientError as e:
                logger.error(f"Error uploading to B2 OSS: {e}. File will NOT be saved locally. Raising error.")
                raise e
            except Exception as e:
                logger.error(f"Unexpected error uploading to B2 OSS: {e}. Raising error.")
                raise e
        else:
            logger.error("B2 client not available or not configured. File will NOT be saved locally. Raising error.")
            raise RuntimeError("B2 OSS not configured or not available. Cannot upload file.")

    def generate_presigned_url(self, oss_key: str, expiration: int = 3600) -> str:
        """
        Generate a presigned URL for accessing an object in B2 OSS
        
        Args:
            oss_key: The object key in OSS (returned by save_file)
            expiration: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Presigned URL string
        """
        self._ensure_contabu_client()
        
        if not self.s3_client:
            logger.error("B2 S3 client not available. Cannot generate presigned URL.")
            raise RuntimeError("B2 OSS not configured or not available. Cannot generate presigned URL.")
        
        try:
            # Clean the OSS key to ensure it's properly formatted
            clean_key = oss_key.strip('/')
            
            logger.info(f"Generating presigned URL for key: {clean_key}, expiration: {expiration}s")
            
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': clean_key},
                ExpiresIn=expiration
            )
            
            logger.info(f"✓ Presigned URL generated successfully for key: {clean_key}")
            return presigned_url
            
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise RuntimeError(f"Failed to generate presigned URL: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error generating presigned URL: {e}")
            raise RuntimeError(f"Unexpected error generating presigned URL: {str(e)}")

    def get_public_url(self, oss_key: str) -> str:
        """
        Generate a public URL for an object (if the bucket allows public access)
        
        Args:
            oss_key: The object key in OSS
            
        Returns:
            Public URL string
        """
        self._ensure_contabu_client()
        
        if not self.endpoint_url or not self.bucket_name:
            raise RuntimeError("B2 OSS not configured. Cannot generate public URL.")
        
        # Clean the OSS key
        clean_key = oss_key.strip('/')
        
        # Generate public URL
        public_url = f"{self.endpoint_url}/{self.bucket_name}/{clean_key}"
        logger.info(f"Generated public URL: {public_url}")
        
        return public_url

    def _save_locally(self, source_filepath: str, destination_relative_path: str) -> str:
        """
        Save file locally (fallback method)
        """
        final_local_path = self.local_base_dir / destination_relative_path
        final_local_path.parent.mkdir(parents=True, exist_ok=True)
        
        shutil.copy2(source_filepath, final_local_path)
        logger.info(f"File saved locally to: {final_local_path}")
        return str(final_local_path.resolve())

storage_manager = StorageManager()