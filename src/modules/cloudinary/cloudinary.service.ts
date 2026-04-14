import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { randomUUID } from 'crypto';

export interface UploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
  resource_type: string;
}

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret && cloudName !== 'your_cloud_name') {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.configured = true;
      this.logger.log(`Cloudinary configured for cloud: ${cloudName}`);
    } else {
      this.logger.warn('Cloudinary not configured — file uploads will fail');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Upload a file buffer to Cloudinary.
   * Returns the secure URL and metadata.
   */
  async uploadBuffer(
    buffer: Buffer,
    options: {
      folder?: string;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
    } = {},
  ): Promise<UploadResult> {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured');
    }

    const { folder = 'chat-media', resourceType = 'auto' } = options;

    return new Promise<UploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: randomUUID(),
          unique_filename: false,
          overwrite: false,
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload failed: ${error?.message}`);
            return reject(error || new Error('Upload returned no result'));
          }
          resolve({
            url: result.url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            resource_type: result.resource_type,
          });
        },
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Upload from a remote URL (e.g. LINE content proxy) to Cloudinary.
   */
  async uploadFromUrl(
    url: string,
    options: {
      folder?: string;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
    } = {},
  ): Promise<UploadResult> {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured');
    }

    const { folder = 'chat-media', resourceType = 'auto' } = options;

    const result = await cloudinary.uploader.upload(url, {
      folder,
      resource_type: resourceType,
      unique_filename: true,
    });

    return {
      url: result.url,
      secure_url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      resource_type: result.resource_type,
    };
  }
}
