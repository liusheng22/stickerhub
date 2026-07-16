const albumProperties = {
  productId: { type: 'string' },
  packName: { type: 'string' },
  description: { type: ['string', 'null'] },
  status: { type: ['integer', 'null'] },
  attr: { type: ['integer', 'null'] },
  priceText: { type: ['string', 'null'] },
  iconUrl: { type: ['string', 'null'], format: 'uri' },
  thumbUrl: { type: ['string', 'null'], format: 'uri' },
  bannerUrl: { type: ['string', 'null'], format: 'uri' },
  versionA: { type: ['string', 'null'] },
  versionB: { type: ['string', 'null'] },
  detailStatus: { type: ['string', 'null'] },
  memberCount: { type: 'integer' },
} as const

const memberProperties = {
  productId: { type: 'string' },
  packName: { type: ['string', 'null'] },
  memberIndex: { type: ['integer', 'null'] },
  md5: { type: 'string', pattern: '^[a-fA-F0-9]{32}$' },
  displayName: { type: ['string', 'null'] },
  caption: { type: ['string', 'null'] },
  attachedText: { type: ['string', 'null'] },
  cdnUrl: { type: ['string', 'null'], format: 'uri' },
  thumbUrl: { type: ['string', 'null'], format: 'uri' },
  externUrl: { type: ['string', 'null'], format: 'uri' },
  externMd5: { type: ['string', 'null'] },
  fileSize: { type: ['string', 'null'] },
  attr: { type: ['integer', 'null'] },
} as const

const cursorPage = (itemRef: string) => ({
  type: 'object',
  required: ['data', 'nextCursor'],
  properties: {
    data: { type: 'array', items: { $ref: itemRef } },
    nextCursor: { type: ['string', 'null'] },
  },
})

const errorResponse = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
}

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'StickerHub Open API',
    version: '1.0.0',
    description: 'Read-only access to StickerHub sticker packs and safe member metadata. Each integration uses an individually issued, scoped, revocable API key. aes_key, encrypt_url, raw_json, and source-tracking fields are never returned.',
  },
  servers: [{ url: '/', description: 'Current StickerHub host' }],
  security: [{ ApiKey: [] }],
  tags: [
    { name: 'Health', description: 'Service status' },
    { name: 'Albums', description: 'Sticker pack catalog' },
    { name: 'Members', description: 'Safe sticker member metadata' },
  ],
  paths: {
    '/api/v1/health': {
      get: {
        tags: ['Health'],
        operationId: 'getHealth',
        summary: 'Check API health',
        description: 'Verifies the API key and confirms that the read-only catalog database is reachable.',
        responses: {
          '200': {
            description: 'Healthy service',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['ok', 'service', 'timestamp'],
                  properties: {
                    ok: { type: 'boolean' },
                    service: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/api/v1/albums': {
      get: {
        tags: ['Albums'],
        operationId: 'listAlbums',
        summary: 'List sticker packs',
        description: 'Returns sticker packs in stable cursor order. Search matches the original pack name and description.',
        parameters: [
          {
            name: 'q',
            in: 'query',
            description: 'Search pack name or description. Maximum 80 characters.',
            schema: { type: 'string', maxLength: 80 },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Optional source status filter for clients that understand the catalog value.',
            schema: { type: 'integer' },
          },
          {
            name: 'attr',
            in: 'query',
            description: 'Optional source attribute filter for clients that understand the catalog value.',
            schema: { type: 'integer' },
          },
          {
            name: 'cursor',
            in: 'query',
            description: 'Opaque cursor returned by the previous page. Pass it back unchanged.',
            schema: { type: 'string', maxLength: 512 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of sticker packs to return.',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 24 },
          },
        ],
        responses: {
          '200': {
            description: 'Cursor-paginated sticker packs',
            content: {
              'application/json': {
                schema: cursorPage('#/components/schemas/AlbumSummary'),
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/api/v1/albums/{productId}': {
      get: {
        tags: ['Albums'],
        operationId: 'getAlbum',
        summary: 'Get a sticker pack',
        description: 'Returns one sticker pack and its public catalog metadata.',
        parameters: [{
          name: 'productId',
          in: 'path',
          required: true,
          description: 'The catalog product identifier.',
          schema: { type: 'string', maxLength: 512 },
        }],
        responses: {
          '200': {
            description: 'Sticker pack detail',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: { $ref: '#/components/schemas/AlbumDetail' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/RateLimited' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/api/v1/albums/{productId}/members': {
      get: {
        tags: ['Members'],
        operationId: 'listAlbumMembers',
        summary: 'List pack members',
        description: 'Returns the safe public sticker member metadata for one pack in stable MD5 cursor order.',
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            description: 'The catalog product identifier.',
            schema: { type: 'string', maxLength: 512 },
          },
          {
            name: 'cursor',
            in: 'query',
            description: 'Opaque MD5 cursor returned by the previous page. Pass it back unchanged.',
            schema: { type: 'string', maxLength: 512 },
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Maximum number of sticker members to return.',
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 24 },
          },
        ],
        responses: {
          '200': {
            description: 'Safe sticker members in a pack',
            content: {
              'application/json': {
                schema: cursorPage('#/components/schemas/StickerMember'),
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/RateLimited' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
    '/api/v1/members/{md5}': {
      get: {
        tags: ['Members'],
        operationId: 'getMember',
        summary: 'Get a sticker member',
        description: 'Looks up one public sticker member by its 32-character hexadecimal MD5 identifier.',
        parameters: [{
          name: 'md5',
          in: 'path',
          required: true,
          description: 'A 32-character hexadecimal sticker MD5 identifier.',
          schema: { type: 'string', pattern: '^[a-fA-F0-9]{32}$' },
        }],
        responses: {
          '200': {
            description: 'Safe sticker member metadata',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: { $ref: '#/components/schemas/StickerMember' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '429': { $ref: '#/components/responses/RateLimited' },
          '500': { $ref: '#/components/responses/InternalError' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'An individually issued StickerHub read-only API key. Keep it on your server and request a dedicated key for each integration.',
      },
    },
    schemas: {
      AlbumSummary: {
        type: 'object',
        required: ['productId', 'packName', 'memberCount'],
        properties: albumProperties,
      },
      AlbumDetail: {
        type: 'object',
        required: ['productId', 'packName', 'memberCount'],
        properties: {
          ...albumProperties,
          price: { type: ['string', 'null'] },
          currency: { type: ['string', 'null'] },
          useLimit: { type: ['string', 'null'] },
          copyright: { type: ['string', 'null'] },
          detailReason: { type: ['string', 'null'] },
          detailVersion: { type: ['string', 'null'] },
        },
      },
      StickerMember: {
        type: 'object',
        required: ['productId', 'md5'],
        properties: memberProperties,
      },
    },
    responses: {
      BadRequest: {
        description: 'Invalid request parameters',
        content: { 'application/json': { schema: errorResponse } },
      },
      Unauthorized: {
        description: 'Missing or invalid API key',
        content: { 'application/json': { schema: errorResponse } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: errorResponse } },
      },
      RateLimited: {
        description: 'Rate limit exceeded',
        content: { 'application/json': { schema: errorResponse } },
      },
      InternalError: {
        description: 'Unexpected service error',
        content: { 'application/json': { schema: errorResponse } },
      },
    },
  },
} as const
