import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NexSpace Healthcare API',
      version: '1.0.0',
      description: 'Healthcare workforce management platform API documentation',
      contact: {
        name: 'NexSpace Support',
        email: 'support@nexspace.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://api.nexspace.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        sessionAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session-based authentication using cookies',
        },
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { 
              type: 'string',
              enum: ['super_admin', 'admin', 'facility_manager', 'internal_employee', 'contractor_1099']
            },
            isActive: { type: 'boolean' },
            profileCompleted: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Facility: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            type: { 
              type: 'string',
              enum: ['hospital', 'nursing_home', 'rehabilitation', 'clinic']
            },
            beds: { type: 'integer' },
            address: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            status: { 
              type: 'string',
              enum: ['active', 'inactive', 'pending']
            },
            taxId: { type: 'string' },
            npiNumber: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Staff: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            role: { type: 'string' },
            specialty: { type: 'string' },
            licenseNumber: { type: 'string' },
            hourlyRate: { type: 'number' },
            isActive: { type: 'boolean' },
            facilityId: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Shift: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            facilityId: { type: 'integer' },
            department: { type: 'string' },
            shiftType: { 
              type: 'string',
              enum: ['day', 'evening', 'night']
            },
            startTime: { type: 'string', format: 'date-time' },
            endTime: { type: 'string', format: 'date-time' },
            requiredStaff: { type: 'integer' },
            requiredSpecialty: { type: 'string' },
            hourlyRate: { type: 'number' },
            status: { 
              type: 'string',
              enum: ['open', 'filled', 'cancelled', 'completed']
            },
            urgent: { type: 'boolean' },
            assignedStaffId: { type: 'integer', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
          },
        },
      },
    },
    security: [
      {
        sessionAuth: [],
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management',
      },
      {
        name: 'Users',
        description: 'User management operations',
      },
      {
        name: 'Facilities',
        description: 'Facility management operations',
      },
      {
        name: 'Staff',
        description: 'Staff management operations',
      },
      {
        name: 'Shifts',
        description: 'Shift scheduling and management',
      },
      {
        name: 'Dashboard',
        description: 'Dashboard and analytics',
      },
    ],
    paths: {
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          description: 'Authenticate a user and create a session',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'password'],
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
            401: {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          tags: ['Authentication'],
          summary: 'User logout',
          description: 'End the current user session',
          security: [{ sessionAuth: [] }],
          responses: {
            200: {
              description: 'Logout successful',
            },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get current user',
          description: 'Get the currently authenticated user',
          security: [{ sessionAuth: [] }],
          responses: {
            200: {
              description: 'Current user data',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
            401: {
              description: 'Not authenticated',
            },
          },
        },
      },
      '/api/facilities': {
        get: {
          tags: ['Facilities'],
          summary: 'List facilities',
          description: 'Get a list of all facilities',
          security: [{ sessionAuth: [] }],
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['active', 'inactive', 'pending'] },
            },
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'List of facilities',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Facility' },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Facilities'],
          summary: 'Create facility',
          description: 'Create a new facility',
          security: [{ sessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Facility' },
              },
            },
          },
          responses: {
            201: {
              description: 'Facility created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Facility' },
                },
              },
            },
          },
        },
      },
      '/api/staff': {
        get: {
          tags: ['Staff'],
          summary: 'List staff members',
          description: 'Get a list of all staff members',
          security: [{ sessionAuth: [] }],
          parameters: [
            {
              name: 'facilityId',
              in: 'query',
              schema: { type: 'integer' },
            },
            {
              name: 'specialty',
              in: 'query',
              schema: { type: 'string' },
            },
            {
              name: 'isActive',
              in: 'query',
              schema: { type: 'boolean' },
            },
          ],
          responses: {
            200: {
              description: 'List of staff members',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Staff' },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Staff'],
          summary: 'Create staff member',
          description: 'Create a new staff member',
          security: [{ sessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Staff' },
              },
            },
          },
          responses: {
            201: {
              description: 'Staff member created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Staff' },
                },
              },
            },
          },
        },
      },
      '/api/shifts': {
        get: {
          tags: ['Shifts'],
          summary: 'List shifts',
          description: 'Get a list of all shifts',
          security: [{ sessionAuth: [] }],
          parameters: [
            {
              name: 'facilityId',
              in: 'query',
              schema: { type: 'integer' },
            },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['open', 'filled', 'cancelled', 'completed'] },
            },
            {
              name: 'startDate',
              in: 'query',
              schema: { type: 'string', format: 'date' },
            },
            {
              name: 'endDate',
              in: 'query',
              schema: { type: 'string', format: 'date' },
            },
          ],
          responses: {
            200: {
              description: 'List of shifts',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Shift' },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Shifts'],
          summary: 'Create shift',
          description: 'Create a new shift',
          security: [{ sessionAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Shift' },
              },
            },
          },
          responses: {
            201: {
              description: 'Shift created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Shift' },
                },
              },
            },
          },
        },
      },
      '/api/dashboard/stats': {
        get: {
          tags: ['Dashboard'],
          summary: 'Get dashboard statistics',
          description: 'Get dashboard statistics and metrics',
          security: [{ sessionAuth: [] }],
          responses: {
            200: {
              description: 'Dashboard statistics',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      activeStaff: { type: 'integer' },
                      openShifts: { type: 'integer' },
                      filledShifts: { type: 'integer' },
                      complianceRate: { type: 'number' },
                      monthlyHours: { type: 'number' },
                      totalFacilities: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./server/routes/*.ts', './server/auth.ts'], // files containing annotations as above
};

export const swaggerSpec = swaggerJsdoc(options);