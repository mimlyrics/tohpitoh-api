const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: "3.0.0",  // Make sure this is exactly "3.0.0"
    info: {
      title: "Medical Records API",
      version: "1.0.0",
      description: "Medical Records Management System API Documentation",
      contact: {
        name: "API Support",
        email: "support@example.com"
      }
    },
    servers: [
      {
        url: "http://localhost:5000/api/v1",
        description: "Development Server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  // IMPORTANT: Use absolute paths or relative paths from project root
  apis: ["./routes/*.js", "./controllers/*.js"] // Adjust based on your structure
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;