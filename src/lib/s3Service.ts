import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export interface S3Config {
  endpointUrl: string; accessKeyId: string; secretAccessKey: string; bucketName: string;
  region: string; timeout?: number; useGlobalNetworking?: boolean; maxRetries?: number; retryDelay?: number;
}
export interface StoredFile { key: string; size: number; lastModified: Date; type: 'file' | 'directory'; extension?: string }

/** Direct S3 protocol client. Works with private R2 buckets; requires no AWS account or CLI. */
export default class S3Service {
  private readonly config: S3Config;
  private readonly client: S3Client;
  constructor(config: Partial<S3Config> = {}) {
    this.config = {
      endpointUrl: config.endpointUrl || process.env.S3_ENDPOINT_URL || '',
      accessKeyId: config.accessKeyId || process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: config.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || '',
      bucketName: config.bucketName || process.env.S3_BUCKET_NAME || '',
      region: config.region || process.env.S3_REGION || 'auto',
    };
    for (const [name, value] of Object.entries(this.config)) if (!value) throw new Error(`Missing storage configuration: ${name}`);
    const endpoint = new URL(this.config.endpointUrl);
    if (endpoint.protocol !== 'https:' && !(endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname))) throw new Error('Storage requires HTTPS');
    if (endpoint.username || endpoint.password) throw new Error('Credentials must not be part of the endpoint URL');
    this.client = new S3Client({
      endpoint: endpoint.href, region: this.config.region, forcePathStyle: true,
      credentials: { accessKeyId: this.config.accessKeyId, secretAccessKey: this.config.secretAccessKey },
      maxAttempts: Math.max(1, Math.min(config.maxRetries || 3, 5)),
      requestHandler: { requestTimeout: (config.timeout || 300) * 1000, connectionTimeout: 10000 },
      requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  private key(value: string) {
    if (value.startsWith('/') || value.includes('\\') || value.split('/').some(v => v === '..' || v === '.')) throw new Error('Invalid storage path');
    return value;
  }
  async listFiles(prefix = ''): Promise<StoredFile[]> {
    this.key(prefix);
    const files: StoredFile[] = [];
    let ContinuationToken: string | undefined;
    do {
      const page = await this.client.send(new ListObjectsV2Command({ Bucket: this.config.bucketName, Prefix: prefix, Delimiter: '/', ContinuationToken }));
      files.push(...(page.CommonPrefixes || []).filter(v => v.Prefix).map(v => ({ key: v.Prefix!, size: 0, lastModified: new Date(0), type: 'directory' as const })));
      files.push(...(page.Contents || []).filter(v => v.Key && v.Key !== prefix).map(v => ({ key: v.Key!, size: v.Size || 0, lastModified: v.LastModified || new Date(0), type: 'file' as const, extension: path.extname(v.Key!).slice(1) })));
      ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (ContinuationToken);
    return files;
  }
  async downloadFile(key: string): Promise<Buffer> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucketName, Key: this.key(key) }));
    if (!result.Body) throw new Error('Storage returned no file');
    return Buffer.from(await result.Body.transformToByteArray());
  }
  async deleteFile(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucketName, Key: this.key(key) }));
  }
  async createFolder(folderKey: string): Promise<void> {
    const key = this.key(folderKey).replace(/\/*$/, '/');
    await this.client.send(new PutObjectCommand({ Bucket: this.config.bucketName, Key: key, Body: '', ContentType: 'application/x-directory' }));
  }
  async uploadFile(file: Buffer, fileName: string, contentType: string, uploadPath = ''): Promise<{ s3Url: string; filePath: string }> {
    const safeName = path.basename(fileName).normalize('NFKC').replace(/[^\p{L}\p{N}._-]/gu, '_').slice(-180) || 'media';
    const prefix = this.key(uploadPath).replace(/\/+$/, '');
    const key = `${prefix ? prefix + '/' : ''}${randomUUID()}-${safeName}`;
    await new Upload({ client: this.client, params: { Bucket: this.config.bucketName, Key: key, Body: file, ContentType: contentType || 'application/octet-stream' }, queueSize: 3, partSize: 8 * 1024 * 1024, leavePartsOnError: false }).done();
    // filePath is an object key, never a fabricated /runpod-volume filesystem path.
    return { s3Url: await this.generatePresignedUrl(key), filePath: key };
  }
  async uploadMultipleFiles(files: { buffer: Buffer; fileName: string; contentType: string }[], uploadPath = '') {
    const results = [];
    for (const file of files) results.push(await this.uploadFile(file.buffer, file.fileName, file.contentType, uploadPath));
    return results;
  }
  async generatePresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.config.bucketName, Key: this.key(key) }), { expiresIn: Math.max(60, Math.min(expiresIn, 604800)) });
  }
}
