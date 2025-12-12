// generate-docs.js
const fs = require('fs');
const path = require('path');

// Define all your routes based on your structure
const routes = [
  // ==================== ADMIN ROUTES ====================
  // POST /api/v1/admin/validate-professional
  { method: 'POST', path: '/api/v1/admin/validate-professional', tag: 'Admin' },
  
  // GET /api/v1/admin/pending-validations
  { method: 'GET', path: '/api/v1/admin/pending-validations', tag: 'Admin' },
  
  // PUT /api/v1/admin/manage-user
  { method: 'PUT', path: '/api/v1/admin/manage-user', tag: 'Admin' },
  
  // GET /api/v1/admin/all-users
  { method: 'GET', path: '/api/v1/admin/all-users', tag: 'Admin' },
  
  // GET /api/v1/admin/statistics
  { method: 'GET', path: '/api/v1/admin/statistics', tag: 'Admin' },
  
  // GET /api/v1/admin/access-requests
  { method: 'GET', path: '/api/v1/admin/access-requests', tag: 'Admin' },
  
  // ==================== USER MANAGEMENT ====================
  // GET /api/v1/admin/users
  { method: 'GET', path: '/api/v1/admin/users', tag: 'Admin - Users' },
  
  // GET /api/v1/admin/users/{id}
  { method: 'GET', path: '/api/v1/admin/users/{id}', tag: 'Admin - Users' },
  
  // PUT /api/v1/admin/users/{id}
  { method: 'PUT', path: '/api/v1/admin/users/{id}', tag: 'Admin - Users' },
  
  // DELETE /api/v1/admin/users/{id}
  { method: 'DELETE', path: '/api/v1/admin/users/{id}', tag: 'Admin - Users' },
  
  // ==================== DOCTOR MANAGEMENT ====================
  // GET /api/v1/admin/doctors
  { method: 'GET', path: '/api/v1/admin/doctors', tag: 'Admin - Doctors' },
  
  // GET /api/v1/admin/doctors/{id}
  { method: 'GET', path: '/api/v1/admin/doctors/{id}', tag: 'Admin - Doctors' },
  
  // PUT /api/v1/admin/doctors/{id}/approve
  { method: 'PUT', path: '/api/v1/admin/doctors/{id}/approve', tag: 'Admin - Doctors' },
  
  // PUT /api/v1/admin/doctors/{id}/reject
  { method: 'PUT', path: '/api/v1/admin/doctors/{id}/reject', tag: 'Admin - Doctors' },
  
  // DELETE /api/v1/admin/doctors/{id}
  { method: 'DELETE', path: '/api/v1/admin/doctors/{id}', tag: 'Admin - Doctors' },
  
  // ==================== PATIENT MANAGEMENT ====================
  // GET /api/v1/admin/patients
  { method: 'GET', path: '/api/v1/admin/patients', tag: 'Admin - Patients' },
  
  // GET /api/v1/admin/patients/{id}
  { method: 'GET', path: '/api/v1/admin/patients/{id}', tag: 'Admin - Patients' },
  
  // PUT /api/v1/admin/patients/{id}
  { method: 'PUT', path: '/api/v1/admin/patients/{id}', tag: 'Admin - Patients' },
  
  // DELETE /api/v1/admin/patients/{id}
  { method: 'DELETE', path: '/api/v1/admin/patients/{id}', tag: 'Admin - Patients' },
  
  // ==================== LABORATORY MANAGEMENT ====================
  // GET /api/v1/admin/laboratories
  { method: 'GET', path: '/api/v1/admin/laboratories', tag: 'Admin - Laboratories' },
  
  // GET /api/v1/admin/laboratories/{id}
  { method: 'GET', path: '/api/v1/admin/laboratories/{id}', tag: 'Admin - Laboratories' },
  
  // PUT /api/v1/admin/laboratories/{id}/approve
  { method: 'PUT', path: '/api/v1/admin/laboratories/{id}/approve', tag: 'Admin - Laboratories' },
  
  // PUT /api/v1/admin/laboratories/{id}/reject
  { method: 'PUT', path: '/api/v1/admin/laboratories/{id}/reject', tag: 'Admin - Laboratories' },
  
  // DELETE /api/v1/admin/laboratories/{id}
  { method: 'DELETE', path: '/api/v1/admin/laboratories/{id}', tag: 'Admin - Laboratories' },
  
  // ==================== USER ROUTES ====================
  // POST /api/v1/jwt/auth
  { method: 'POST', path: '/api/v1/jwt/auth', tag: 'Authentication', auth: false },
  
  // POST /api/v1/jwt/logout
  { method: 'POST', path: '/api/v1/jwt/logout', tag: 'Authentication' },
  
  // POST /api/v1/jwt/register
  { method: 'POST', path: '/api/v1/jwt/register', tag: 'Authentication', auth: false },
  
  // POST /api/v1/jwt/verifyEmailCode
  { method: 'POST', path: '/api/v1/jwt/verifyEmailCode', tag: 'Authentication', auth: false },
  
  // POST /api/v1/jwt/verifyEmailCode/{token}
  { method: 'POST', path: '/api/v1/jwt/verifyEmailCode/{token}', tag: 'Authentication', auth: false },
  
  // POST /api/v1/jwt/admin/create
  { method: 'POST', path: '/api/v1/jwt/admin/create', tag: 'Admin - Users' },
  
  // PUT /api/v1/jwt/role/{id}
  { method: 'PUT', path: '/api/v1/jwt/role/{id}', tag: 'Admin - Users' },
  
  // DELETE /api/v1/jwt/delete/{userId}
  { method: 'DELETE', path: '/api/v1/jwt/delete/{userId}', tag: 'Admin - Users' },
  
  // GET /api/v1/jwt/profile
  { method: 'GET', path: '/api/v1/jwt/profile', tag: 'Profile' },
  
  // PUT /api/v1/jwt/profile
  { method: 'PUT', path: '/api/v1/jwt/profile', tag: 'Profile' },
  
  // GET /api/v1/jwt/profile/{userId}
  { method: 'GET', path: '/api/v1/jwt/profile/{userId}', tag: 'Admin - Profile' },
  
  // PUT /api/v1/jwt/profile/{userId}
  { method: 'PUT', path: '/api/v1/jwt/profile/{userId}', tag: 'Admin - Profile' },
  
  // GET /api/v1/jwt/profile/search/{searchId}
  { method: 'GET', path: '/api/v1/jwt/profile/search/{searchId}', tag: 'Admin - Profile' },
  
  // PUT /api/v1/upload/avatar/{userId}
  { method: 'PUT', path: '/api/v1/upload/avatar/{userId}', tag: 'Profile', auth: false },
  
  // GET /api/v1/upload/avatar/{userId}
  { method: 'GET', path: '/api/v1/upload/avatar/{userId}', tag: 'Profile', auth: false },
  
  // DELETE /api/v1/upload/avatar/{userId}
  { method: 'DELETE', path: '/api/v1/upload/avatar/{userId}', tag: 'Profile' },
  
  // GET /api/v1/jwt/protectAdmin
  { method: 'GET', path: '/api/v1/jwt/protectAdmin', tag: 'Admin' },
  
  // ==================== PATIENT ROUTES ====================
  // GET /api/v1/patients/profile
  { method: 'GET', path: '/api/v1/patients/profile', tag: 'Patients' },
  
  // GET /api/v1/patients/profile/{userId}
  { method: 'GET', path: '/api/v1/patients/profile/{userId}', tag: 'Admin - Patients' },
  
  // PUT /api/v1/patients/profile/me
  { method: 'PUT', path: '/api/v1/patients/profile/me', tag: 'Patients' },
  
  // GET /api/v1/patients/medical-records
  { method: 'GET', path: '/api/v1/patients/medical-records', tag: 'Patients' },
  
  // PUT /api/v1/patients/emergency-access
  { method: 'PUT', path: '/api/v1/patients/emergency-access', tag: 'Patients' },
  
  // GET /api/v1/patients/prescriptions
  { method: 'GET', path: '/api/v1/patients/prescriptions', tag: 'Patients - Prescriptions' },
  
  // GET /api/v1/patients/prescriptions/all
  { method: 'GET', path: '/api/v1/patients/prescriptions/all', tag: 'Patients - Prescriptions' },
  
  // GET /api/v1/patients/prescriptions/stats
  { method: 'GET', path: '/api/v1/patients/prescriptions/stats', tag: 'Patients - Prescriptions' },
  
  // GET /api/v1/patients/prescriptions/{prescriptionId}
  { method: 'GET', path: '/api/v1/patients/prescriptions/{prescriptionId}', tag: 'Patients - Prescriptions' },
  
  // PUT /api/v1/patients/prescriptions/{prescriptionId}/complete
  { method: 'PUT', path: '/api/v1/patients/prescriptions/{prescriptionId}/complete', tag: 'Patients - Prescriptions' },
  
  // GET /api/v1/patients/lab-tests
  { method: 'GET', path: '/api/v1/patients/lab-tests', tag: 'Patients - Lab Tests' },
  
  // GET /api/v1/patients/lab-tests/{testId}
  { method: 'GET', path: '/api/v1/patients/lab-tests/{testId}', tag: 'Patients - Lab Tests' },
  
  // ==================== DOCTOR ROUTES ====================
  // GET /api/v1/doctors/profile/me
  { method: 'GET', path: '/api/v1/doctors/profile/me', tag: 'Doctors' },
  
  // PUT /api/v1/doctors/profile/me
  { method: 'PUT', path: '/api/v1/doctors/profile/me', tag: 'Doctors' },
  
  // GET /api/v1/doctors/medical-records/search
  { method: 'GET', path: '/api/v1/doctors/medical-records/search', tag: 'Doctors - Medical Records' },
  
  // GET /api/v1/doctors/medical-records/stats
  { method: 'GET', path: '/api/v1/doctors/medical-records/stats', tag: 'Doctors - Medical Records' },
  
  // GET /api/v1/doctors/medical-records/{recordId}
  { method: 'GET', path: '/api/v1/doctors/medical-records/{recordId}', tag: 'Doctors - Medical Records' },
  
  // PUT /api/v1/doctors/medical-records/{recordId}
  { method: 'PUT', path: '/api/v1/doctors/medical-records/{recordId}', tag: 'Doctors - Medical Records' },
  
  // DELETE /api/v1/doctors/medical-records/{recordId}
  { method: 'DELETE', path: '/api/v1/doctors/medical-records/{recordId}', tag: 'Doctors - Medical Records' },
  
  // POST /api/v1/doctors/patients/{patientId}/medical-records
  { method: 'POST', path: '/api/v1/doctors/patients/{patientId}/medical-records', tag: 'Doctors - Medical Records' },
  
  // GET /api/v1/doctors/patients/{patientId}/medical-records
  { method: 'GET', path: '/api/v1/doctors/patients/{patientId}/medical-records', tag: 'Doctors - Medical Records' },
  
  // GET /api/v1/doctors/record-types
  { method: 'GET', path: '/api/v1/doctors/record-types', tag: 'Doctors - Medical Records' },
  
  // POST /api/v1/doctors/prescriptions
  { method: 'POST', path: '/api/v1/doctors/prescriptions', tag: 'Doctors - Prescriptions' },
  
  // GET /api/v1/doctors/prescriptions
  { method: 'GET', path: '/api/v1/doctors/prescriptions', tag: 'Doctors - Prescriptions' },
  
  // GET /api/v1/doctors/prescriptions/{prescriptionId}
  { method: 'GET', path: '/api/v1/doctors/prescriptions/{prescriptionId}', tag: 'Doctors - Prescriptions' },
  
  // PUT /api/v1/doctors/prescriptions/{prescriptionId}
  { method: 'PUT', path: '/api/v1/doctors/prescriptions/{prescriptionId}', tag: 'Doctors - Prescriptions' },
  
  // DELETE /api/v1/doctors/prescriptions/{prescriptionId}
  { method: 'DELETE', path: '/api/v1/doctors/prescriptions/{prescriptionId}', tag: 'Doctors - Prescriptions' },
  
  // GET /api/v1/doctors/patients/{patientId}/prescriptions
  { method: 'GET', path: '/api/v1/doctors/patients/{patientId}/prescriptions', tag: 'Doctors - Prescriptions' },
  
  // GET /api/v1/doctors/prescriptions/stats
  { method: 'GET', path: '/api/v1/doctors/prescriptions/stats', tag: 'Doctors - Prescriptions' },
  
  // POST /api/v1/doctors/lab-tests
  { method: 'POST', path: '/api/v1/doctors/lab-tests', tag: 'Doctors - Lab Tests' },
  
  // GET /api/v1/doctors/lab-tests
  { method: 'GET', path: '/api/v1/doctors/lab-tests', tag: 'Doctors - Lab Tests' },
  
  // GET /api/v1/doctors/lab-tests/{testId}
  { method: 'GET', path: '/api/v1/doctors/lab-tests/{testId}', tag: 'Doctors - Lab Tests' },
  
  // PUT /api/v1/doctors/lab-tests/{testId}/interpret
  { method: 'PUT', path: '/api/v1/doctors/lab-tests/{testId}/interpret', tag: 'Doctors - Lab Tests' },
  
  // PUT /api/v1/doctors/lab-tests/{testId}/cancel
  { method: 'PUT', path: '/api/v1/doctors/lab-tests/{testId}/cancel', tag: 'Doctors - Lab Tests' },
  
  // GET /api/v1/doctors/
  { method: 'GET', path: '/api/v1/doctors', tag: 'Doctors' },
  
  // ==================== LABORATORY ROUTES ====================
  // GET /api/v1/laboratories/profile/me
  { method: 'GET', path: '/api/v1/laboratories/profile/me', tag: 'Laboratories' },
  
  // PUT /api/v1/laboratories/profile/me
  { method: 'PUT', path: '/api/v1/laboratories/profile/me', tag: 'Laboratories' },
  
  // GET /api/v1/laboratories/profile/{userId}
  { method: 'GET', path: '/api/v1/laboratories/profile/{userId}', tag: 'Admin - Laboratories' },
  
  // PUT /api/v1/laboratories/approve/{laboratoryId}
  { method: 'PUT', path: '/api/v1/laboratories/approve/{laboratoryId}', tag: 'Admin - Laboratories' },
  
  // GET /api/v1/laboratories/tests
  { method: 'GET', path: '/api/v1/laboratories/tests', tag: 'Laboratories - Tests' },
  
  // GET /api/v1/laboratories/tests/{testId}
  { method: 'GET', path: '/api/v1/laboratories/tests/{testId}', tag: 'Laboratories - Tests' },
  
  // PUT /api/v1/laboratories/tests/{testId}/results
  { method: 'PUT', path: '/api/v1/laboratories/tests/{testId}/results', tag: 'Laboratories - Tests' },
  
  // GET /api/v1/laboratories/
  { method: 'GET', path: '/api/v1/laboratories', tag: 'Laboratories' },
  
  // GET /api/v1/laboratories/prescribed-exams
  { method: 'GET', path: '/api/v1/laboratories/prescribed-exams', tag: 'Laboratories - Exams' },
  
  // PUT /api/v1/laboratories/update-exam-status
  { method: 'PUT', path: '/api/v1/laboratories/update-exam-status', tag: 'Laboratories - Exams' },
  
  // PUT /api/v1/laboratories/deposit-results
  { method: 'PUT', path: '/api/v1/laboratories/deposit-results', tag: 'Laboratories - Exams' },
  
  // ==================== REFRESH TOKEN ROUTES ====================
  // GET /api/v1/jwt/refresh
  { method: 'GET', path: '/api/v1/jwt/refresh', tag: 'Authentication' },
  
  // ==================== ACCESS ROUTES (If you have them) ====================
  // Add your access routes here if you have any
];

// Create OpenAPI spec
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Healthcare Management System API',
    version: '1.0.0',
    description: 'Complete API documentation for healthcare management system. Includes patient, doctor, laboratory, and admin functionalities.',
    contact: {
      name: 'API Support',
      email: 'support@healthcare.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server'
    },
    {
      url: 'https://api.healthcare.com',
      description: 'Production server'
    }
  ],
  paths: {},
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/v1/jwt/auth endpoint'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          email: { type: 'string', example: 'user@example.com' },
          first_name: { type: 'string', example: 'John' },
          last_name: { type: 'string', example: 'Doe' },
          role: { type: 'string', example: 'patient', enum: ['patient', 'doctor', 'laboratory', 'admin'] },
          is_active: { type: 'boolean', example: true }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Error description' }
        }
      }
    }
  },
  tags: [
    { name: 'Authentication', description: 'Login, registration, token management' },
    { name: 'Admin', description: 'System administration endpoints' },
    { name: 'Admin - Users', description: 'User management by admin' },
    { name: 'Admin - Doctors', description: 'Doctor management by admin' },
    { name: 'Admin - Patients', description: 'Patient management by admin' },
    { name: 'Admin - Laboratories', description: 'Laboratory management by admin' },
    { name: 'Admin - Profile', description: 'Profile management by admin' },
    { name: 'Profile', description: 'User profile management' },
    { name: 'Patients', description: 'Patient-specific endpoints' },
    { name: 'Patients - Prescriptions', description: 'Patient prescription management' },
    { name: 'Patients - Lab Tests', description: 'Patient lab test management' },
    { name: 'Doctors', description: 'Doctor-specific endpoints' },
    { name: 'Doctors - Medical Records', description: 'Medical record management by doctors' },
    { name: 'Doctors - Prescriptions', description: 'Prescription management by doctors' },
    { name: 'Doctors - Lab Tests', description: 'Lab test management by doctors' },
    { name: 'Laboratories', description: 'Laboratory-specific endpoints' },
    { name: 'Laboratories - Tests', description: 'Test management by laboratories' },
    { name: 'Laboratories - Exams', description: 'Exam management by laboratories' }
  ]
};

// Add routes to OpenAPI spec
routes.forEach(route => {
  if (!swaggerSpec.paths[route.path]) {
    swaggerSpec.paths[route.path] = {};
  }
  
  const operation = {
    summary: `${route.method} ${route.path}`,
    description: `Endpoint for ${route.tag.toLowerCase()} functionality`,
    tags: [route.tag],
    responses: {
      '200': {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: { type: 'object' }
              }
            }
          }
        }
      },
      '400': {
        description: 'Bad request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      '401': {
        description: 'Unauthorized - Invalid or missing token'
      },
      '403': {
        description: 'Forbidden - Insufficient permissions'
      },
      '404': {
        description: 'Resource not found'
      },
      '500': {
        description: 'Internal server error'
      }
    }
  };
  
  // Add parameters for dynamic routes
  if (route.path.includes('{id}')) {
    operation.parameters = [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'Resource ID'
      }
    ];
  }
  
  if (route.path.includes('{userId}')) {
    operation.parameters = [
      {
        name: 'userId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'User ID'
      }
    ];
  }
  
  if (route.path.includes('{prescriptionId}')) {
    operation.parameters = [
      {
        name: 'prescriptionId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'Prescription ID'
      }
    ];
  }
  
  if (route.path.includes('{testId}')) {
    operation.parameters = [
      {
        name: 'testId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'Test ID'
      }
    ];
  }
  
  if (route.path.includes('{recordId}')) {
    operation.parameters = [
      {
        name: 'recordId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'Medical record ID'
      }
    ];
  }
  
  if (route.path.includes('{patientId}')) {
    operation.parameters = [
      {
        name: 'patientId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'Patient ID'
      }
    ];
  }
  
  if (route.path.includes('{laboratoryId}')) {
    operation.parameters = [
      {
        name: 'laboratoryId',
        in: 'path',
        required: true,
        schema: { type: 'integer' },
        description: 'Laboratory ID'
      }
    ];
  }
  
  if (route.path.includes('{searchId}')) {
    operation.parameters = [
      {
        name: 'searchId',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Search term (email, name, or phone)'
      }
    ];
  }
  
  if (route.path.includes('{token}')) {
    operation.parameters = [
      {
        name: 'token',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Verification token'
      }
    ];
  }
  
  // Add security if route requires authentication
  if (route.auth !== false) {
    operation.security = [{ bearerAuth: [] }];
  }
  
  swaggerSpec.paths[route.path][route.method.toLowerCase()] = operation;
});

// Save to file
fs.writeFileSync('swagger.json', JSON.stringify(swaggerSpec, null, 2));
console.log('✅ swagger.json generated successfully!');
console.log(`📊 Total routes documented: ${routes.length}`);

// Create a simple HTML view
const html = `<!DOCTYPE html>
<html>
<head>
    <title>Healthcare API - Complete Documentation</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <style>
        body { padding: 20px; background: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .route-card { margin: 15px 0; border: 1px solid #e0e0e0; border-radius: 8px; transition: all 0.3s; }
        .route-card:hover { box-shadow: 0 5px 15px rgba(0,0,0,0.1); transform: translateY(-2px); }
        .method { font-weight: bold; padding: 6px 12px; border-radius: 6px; font-size: 13px; }
        .GET { background: #28a745; color: white; }
        .POST { background: #007bff; color: white; }
        .PUT { background: #ffc107; color: #212529; }
        .DELETE { background: #dc3545; color: white; }
        .tag { background: #6c757d; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-left: 10px; }
        .copy-btn { cursor: pointer; color: #6c757d; transition: color 0.3s; }
        .copy-btn:hover { color: #007bff; }
        .stats { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
        .category { background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
        .auth-badge { background: #17a2b8; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
        .no-auth-badge { background: #6c757d; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="fas fa-heartbeat me-2"></i> Healthcare Management System API</h1>
            <p class="mb-0">Complete API documentation with ${routes.length} endpoints</p>
        </div>
        
        <div class="row">
            <div class="col-md-8">
                <div class="stats">
                    <h4><i class="fas fa-chart-bar me-2"></i> Quick Stats</h4>
                    <div class="row">
                        <div class="col-md-3 text-center">
                            <h3>${routes.length}</h3>
                            <small>Total Endpoints</small>
                        </div>
                        <div class="col-md-3 text-center">
                            <h3>${routes.filter(r => r.method === 'GET').length}</h3>
                            <small>GET Requests</small>
                        </div>
                        <div class="col-md-3 text-center">
                            <h3>${routes.filter(r => r.method === 'POST').length}</h3>
                            <small>POST Requests</small>
                        </div>
                        <div class="col-md-3 text-center">
                            <h3>${routes.filter(r => r.method === 'PUT').length}</h3>
                            <small>PUT Requests</small>
                        </div>
                    </div>
                </div>
                
                <h3><i class="fas fa-list me-2"></i> All Endpoints</h3>
                
                ${Array.from(new Set(routes.map(r => r.tag))).map(tag => {
                  const categoryRoutes = routes.filter(r => r.tag === tag);
                  return `
                  <div class="category">
                    <h5>${tag} <span class="badge bg-secondary">${categoryRoutes.length}</span></h5>
                    ${categoryRoutes.map(route => `
                    <div class="route-card">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <span class="method ${route.method}">${route.method}</span>
                                    <code class="ms-2">${route.path}</code>
                                    <span class="tag">${route.tag}</span>
                                    ${route.auth === false ? 
                                      '<span class="no-auth-badge ms-2">No Auth</span>' : 
                                      '<span class="auth-badge ms-2">Auth Required</span>'
                                    }
                                </div>
                                <div>
                                    <i class="fas fa-copy copy-btn" title="Copy cURL command" 
                                       onclick="copyCurl('${route.method}', '${route.path}')"></i>
                                </div>
                            </div>
                            <div class="mt-3">
                                <small class="text-muted">Test with cURL:</small>
                                <pre id="curl-${route.method}-${route.path.replace(/\//g, '-')}">
curl -X ${route.method} "http://localhost:5000${route.path}" \\
  ${route.auth === false ? '' : '-H "Authorization: Bearer YOUR_TOKEN"'} \\
  -H "Content-Type: application/json"</pre>
                            </div>
                        </div>
                    </div>
                    `).join('')}
                  </div>
                  `;
                }).join('')}
            </div>
            
            <div class="col-md-4">
                <div class="stats">
                    <h4><i class="fas fa-info-circle me-2"></i> Quick Info</h4>
                    <p><strong>Base URL:</strong> <code>http://localhost:5000</code></p>
                    <p><strong>Authentication:</strong> Bearer token (JWT)</p>
                    <p><strong>Token Endpoint:</strong> <code>POST /api/v1/jwt/auth</code></p>
                    <p><strong>Format:</strong> All requests/responses are JSON</p>
                    
                    <div class="mt-4">
                        <a href="/api-docs" class="btn btn-primary btn-sm w-100 mb-2">
                            <i class="fas fa-external-link-alt me-1"></i> Interactive Swagger UI
                        </a>
                        <a href="/api-docs.json" class="btn btn-secondary btn-sm w-100 mb-2">
                            <i class="fas fa-download me-1"></i> Download OpenAPI Spec
                        </a>
                        <button onclick="copyAllEndpoints()" class="btn btn-success btn-sm w-100">
                            <i class="fas fa-copy me-1"></i> Copy All Endpoints
                        </button>
                    </div>
                </div>
                
                <div class="stats">
                    <h4><i class="fas fa-flask me-2"></i> Testing Example</h4>
                    <p><strong>Login Request:</strong></p>
                    <pre>curl -X POST "http://localhost:5000/api/v1/jwt/auth" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"user@example.com","password":"yourpassword"}'</pre>
                  
                    <p class="mt-3"><strong>Response:</strong></p>
                    <pre>{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { ... }
  }
}</pre>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        function copyCurl(method, path) {
            const curlText = document.getElementById('curl-' + method + '-' + path.replace(/\\//g, '-')).innerText;
            navigator.clipboard.writeText(curlText).then(() => {
                alert('cURL command copied to clipboard!');
            });
        }
        
        function copyAllEndpoints() {
            const endpoints = ${JSON.stringify(routes.map(r => `${r.method} ${r.path}`))};
            navigator.clipboard.writeText(endpoints.join('\\n')).then(() => {
                alert('All endpoints copied to clipboard!');
            });
        }
        
        // Auto-highlight code on click
        document.querySelectorAll('pre').forEach(pre => {
            pre.addEventListener('click', function() {
                const range = document.createRange();
                range.selectNodeContents(this);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            });
        });
    </script>
</body>
</html>`;

fs.writeFileSync('public/api-docs.html', html);
console.log('🌐 HTML documentation created: public/api-docs.html');

// Create Flutter API client
const flutterClient = `// healthcare_api.dart
// Auto-generated API client for Flutter
import 'dart:convert';
import 'package:http/http.dart' as http;

class HealthcareApi {
  final String baseUrl;
  String? token;
  
  HealthcareApi({this.baseUrl = 'http://localhost:5000', this.token});
  
  void setToken(String newToken) {
    token = newToken;
  }
  
  Map<String, String> _getHeaders() {
    final headers = {
      'Content-Type': 'application/json',
    };
    
    if (token != null) {
      headers['Authorization'] = 'Bearer \$token';
    }
    
    return headers;
  }
  
  // Authentication
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('\$baseUrl/api/v1/jwt/auth'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    
    return _handleResponse(response);
  }
  
  // Admin - Get all users
  Future<Map<String, dynamic>> getAllUsers({int? page, int? limit}) async {
    final queryParams = {
      if (page != null) 'page': page.toString(),
      if (limit != null) 'limit': limit.toString(),
    };
    
    final response = await http.get(
      Uri.parse('\$baseUrl/api/v1/admin/users').replace(queryParameters: queryParams),
      headers: _getHeaders(),
    );
    
    return _handleResponse(response);
  }
  
  // Admin - Get user by ID
  Future<Map<String, dynamic>> getUserById(int id) async {
    final response = await http.get(
      Uri.parse('\$baseUrl/api/v1/admin/users/\$id'),
      headers: _getHeaders(),
    );
    
    return _handleResponse(response);
  }
  
  // Admin - Approve doctor
  Future<Map<String, dynamic>> approveDoctor(int id) async {
    final response = await http.put(
      Uri.parse('\$baseUrl/api/v1/admin/doctors/\$id/approve'),
      headers: _getHeaders(),
    );
    
    return _handleResponse(response);
  }
  
  // Patients - Get profile
  Future<Map<String, dynamic>> getPatientProfile() async {
    final response = await http.get(
      Uri.parse('\$baseUrl/api/v1/patients/profile'),
      headers: _getHeaders(),
    );
    
    return _handleResponse(response);
  }
  
  // Patients - Get prescriptions
  Future<Map<String, dynamic>> getPatientPrescriptions() async {
    final response = await http.get(
      Uri.parse('\$baseUrl/api/v1/patients/prescriptions'),
      headers: _getHeaders(),
    );
    
    return _handleResponse(response);
  }
  
  // Doctors - Get my profile
  Future<Map<String, dynamic>> getDoctorProfile() async {
    final response = await http.get(
      Uri.parse('\$baseUrl/api/v1/doctors/profile/me'),
      headers: _getHeaders(),
    );
    
    return _handleResponse(response);
  }
  
  // Doctors - Create prescription
  Future<Map<String, dynamic>> createPrescription(Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('\$baseUrl/api/v1/doctors/prescriptions'),
      headers: _getHeaders(),
      body: jsonEncode(data),
    );
    
    return _handleResponse(response);
  }
  
  // Laboratories - Get tests
  Future<Map<String, dynamic>> getLaboratoryTests() async {
    final response = await http.get(
      Uri.parse('\$baseUrl/api/v1/laboratories/tests'),
      headers: _getHeaders(),
    );
    
    return _handleResponse(response);
  }
  
  // Helper method to handle responses
  Map<String, dynamic> _handleResponse(http.Response response) {
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load data: \${response.statusCode}');
    }
  }
}

// Example usage:
/*
void main() async {
  final api = HealthcareApi();
  
  // Login
  final loginResult = await api.login('user@example.com', 'password');
  api.setToken(loginResult['data']['token']);
  
  // Get user profile
  final profile = await api.getPatientProfile();
  print(profile);
}
*/
`;

fs.writeFileSync('HealthcareApi.dart', flutterClient);
console.log('📱 Flutter API client created: HealthcareApi.dart');

// Create Postman collection
const postmanCollection = {
  info: {
    name: 'Healthcare Management System API',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
  },
  item: routes.map(route => ({
    name: `${route.method} ${route.path}`,
    request: {
      method: route.method,
      header: route.auth === false ? [] : [
        {
          key: 'Authorization',
          value: '{{token}}',
          type: 'text'
        },
        {
          key: 'Content-Type',
          value: 'application/json',
          type: 'text'
        }
      ],
      url: {
        raw: `{{base_url}}${route.path}`,
        host: ['{{base_url}}'],
        path: route.path.replace('/api/v1/', '').split('/')
      }
    }
  }))
};

fs.writeFileSync('postman_collection.json', JSON.stringify(postmanCollection, null, 2));
console.log('📨 Postman collection created: postman_collection.json');

console.log('\n🎯 Documentation Generation Complete!');
console.log('========================================');
console.log('📁 Files created:');
console.log('1. swagger.json - OpenAPI specification');
console.log('2. public/api-docs.html - HTML documentation');
console.log('3. HealthcareApi.dart - Flutter API client');
console.log('4. postman_collection.json - Postman collection');
console.log('\n🚀 Next steps:');
console.log('1. Update your app.js to serve the swagger.json');
console.log('2. Share these files with your Flutter developers');
console.log('3. Access docs at: http://localhost:5000/public/api-docs.html');